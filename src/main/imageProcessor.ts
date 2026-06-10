/**
 * Core image processing using Sharp. This module runs ONLY in the main process
 * (never in the renderer). It implements:
 *   - metadata probing + thumbnail generation
 *   - the full processing pipeline (orientation, colorspace, enhance, resize,
 *     sharpen, encode)
 *   - target-file-size optimization via binary search over quality
 *   - preview generation (smaller, on-demand)
 *   - single + batch export with a concurrency-limited queue and progress
 *
 * Pipeline order (per the product spec):
 *   1. Load with Sharp
 *   2. rotate()                      -> apply EXIF orientation
 *   3. toColorspace('srgb')          -> normalize color
 *   4. auto-enhance (normalize/gamma/contrast/saturation)
 *   5. manual tone tweaks (folded into the same step)
 *   6. resize / crop
 *   7. sharpen (after resize)
 *   8. encode to target format
 *   9. target file size binary search (jpeg/webp/avif)
 *  10. strip or preserve metadata
 *  11. save output
 *  12. return result
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import type { Sharp } from 'sharp'
import { computeResizePlan } from '@shared/resize'
import {
  buildBaseOutputPath,
  ensureDirectory,
  resolveOutputPath
} from './fileUtils'
import type {
  ExportFormat,
  ExportSettings,
  ImageMetadata,
  PreviewResult,
  ProcessImageRequest,
  ProcessImageResult
} from '@shared/types'

// Avoid unbounded native concurrency; we manage our own queue on top.
sharp.concurrency(1)
sharp.cache(false)

const PREVIEW_MAX_WIDTH = 1200
const THUMBNAIL_WIDTH = 200

// ---------------------------------------------------------------------------
// Format capability detection (AVIF may be unavailable in some builds)
// ---------------------------------------------------------------------------
let avifSupportPromise: Promise<boolean> | null = null

export async function isAvifSupported(): Promise<boolean> {
  if (!avifSupportPromise) {
    avifSupportPromise = (async () => {
      try {
        await sharp({
          create: { width: 4, height: 4, channels: 3, background: '#888' }
        })
          .avif({ quality: 50 })
          .toBuffer()
        return true
      } catch {
        return false
      }
    })()
  }
  return avifSupportPromise
}

// ---------------------------------------------------------------------------
// Metadata + thumbnails
// ---------------------------------------------------------------------------
export async function getMetadataForPaths(paths: string[]): Promise<ImageMetadata[]> {
  return Promise.all(paths.map((p) => getSingleMetadata(p)))
}

async function getSingleMetadata(inputPath: string): Promise<ImageMetadata> {
  const fileName = path.basename(inputPath)
  try {
    const stat = await fs.stat(inputPath)
    const meta = await sharp(inputPath).metadata()
    let width = meta.width ?? 0
    let height = meta.height ?? 0
    // EXIF orientation 5-8 means the image is rotated 90/270deg; swap so the
    // displayed "original" dimensions match what the user will actually get.
    if (meta.orientation && meta.orientation >= 5) {
      ;[width, height] = [height, width]
    }
    const thumbnailDataUrl = await generateThumbnail(inputPath)
    return {
      inputPath,
      fileName,
      width,
      height,
      sizeBytes: stat.size,
      format: meta.format ?? path.extname(inputPath).slice(1).toLowerCase(),
      thumbnailDataUrl
    }
  } catch (err) {
    return {
      inputPath,
      fileName,
      width: 0,
      height: 0,
      sizeBytes: 0,
      format: path.extname(inputPath).slice(1).toLowerCase(),
      error: errorMessage(err)
    }
  }
}

async function generateThumbnail(inputPath: string): Promise<string | undefined> {
  try {
    const buf = await sharp(inputPath)
      .rotate()
      .resize({ width: THUMBNAIL_WIDTH, withoutEnlargement: true })
      .webp({ quality: 70 })
      .toBuffer()
    return `data:image/webp;base64,${buf.toString('base64')}`
  } catch {
    return undefined
  }
}

// ---------------------------------------------------------------------------
// Pipeline construction
// ---------------------------------------------------------------------------
interface ProcessedRaw {
  data: Buffer
  width: number
  height: number
  channels: 1 | 2 | 3 | 4
}

/**
 * Run the pipeline up to (but not including) the final encode, returning the
 * processed pixels as a raw buffer. Decoding to raw once lets the target-size
 * binary search re-encode many times without re-running resize/enhance.
 */
interface AutoCorrections {
  /** Per-channel linear multipliers for white-balance, or null if no cast. */
  whiteBalance: { mul: number[]; offset: number[] } | null
  /** Gamma > 1 brightens an under-exposed image; 1 = no change. */
  gamma: number
  /** Saturation multiplier for modulate(). */
  saturation: number
}

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))

/**
 * Analyze a single image and derive corrections tailored to its own flaws.
 *
 *  - White balance: gray-world assumption — the average of R/G/B should be
 *    neutral grey, so each channel is scaled toward the overall mean. Only
 *    applied when a meaningful colour cast is detected.
 *  - Exposure: if mean luminance is low, raise gamma to brighten.
 *  - Contrast: handled by normalize() in the pipeline (per-image range stretch).
 *
 * Stats are computed on a 256px downscale for speed; means/luminance are
 * representative of the full image.
 */
async function computeAutoCorrections(
  inputPath: string,
  toSrgb: boolean
): Promise<AutoCorrections> {
  let sampler = sharp(inputPath, { failOn: 'none' })
    .rotate()
    .resize({ width: 256, withoutEnlargement: true })
  if (toSrgb) sampler = sampler.toColorspace('srgb')

  const stats = await sampler.stats()
  const ch = stats.channels
  const result: AutoCorrections = { whiteBalance: null, gamma: 1.0, saturation: 1.05 }

  // Need at least RGB to reason about colour/exposure.
  if (ch.length < 3) return result

  const r = ch[0].mean
  const g = ch[1].mean
  const b = ch[2].mean
  const gray = (r + g + b) / 3

  // Gray-world white balance, with clamped multipliers to avoid over-correction.
  const mr = r > 1 ? clamp(gray / r, 0.75, 1.35) : 1
  const mg = g > 1 ? clamp(gray / g, 0.75, 1.35) : 1
  const mb = b > 1 ? clamp(gray / b, 0.75, 1.35) : 1
  const cast = Math.max(Math.abs(mr - 1), Math.abs(mg - 1), Math.abs(mb - 1))
  if (cast > 0.04) {
    // Match the multiplier array length to the channel count (keep alpha at 1).
    const mul = ch.length === 4 ? [mr, mg, mb, 1] : [mr, mg, mb]
    const offset = new Array(ch.length).fill(0)
    result.whiteBalance = { mul, offset }
  }

  // Exposure: brighten when mean luminance is low (Rec. 601 weights).
  const luma = 0.299 * r + 0.587 * g + 0.114 * b
  if (luma < 115) {
    result.gamma = clamp(1 + (115 - luma) * 0.005, 1, 1.6)
  }

  return result
}

async function buildProcessedRaw(
  req: ProcessImageRequest,
  maxWidthOverride?: number
): Promise<ProcessedRaw> {
  const { resize, enhancement, export: exp } = req

  // 1-2. Load + apply EXIF orientation.
  let pipeline: Sharp = sharp(req.image.inputPath, { failOn: 'none' }).rotate()

  // 3. Convert to sRGB.
  if (exp.convertToSrgb) {
    pipeline = pipeline.toColorspace('srgb')
  }

  // 4 + 5. Tone adjustments.
  if (enhancement.mode === 'auto') {
    // Analyze THIS image's stats and correct its specific flaws.
    const auto = await computeAutoCorrections(req.image.inputPath, exp.convertToSrgb)
    if (auto.whiteBalance) {
      // Per-channel multipliers remove a colour cast (gray-world white balance).
      pipeline = pipeline.linear(auto.whiteBalance.mul, auto.whiteBalance.offset)
    }
    // normalize() stretches contrast to the full range — fixes flat/low-contrast.
    pipeline = pipeline.normalize()
    if (auto.gamma > 1.0) {
      // Brighten under-exposed images.
      pipeline = pipeline.gamma(auto.gamma)
    }
    if (auto.saturation !== 1.0) {
      pipeline = pipeline.modulate({ saturation: auto.saturation })
    }
  } else {
    // Manual: the user controls these values directly.
    if (enhancement.autoLevels) {
      pipeline = pipeline.normalize()
    }
    if (enhancement.gamma > 1.0) {
      // Sharp's gamma() accepts 1.0-3.0; values <= 1 are a no-op for us.
      pipeline = pipeline.gamma(enhancement.gamma)
    }
    if (enhancement.contrast !== 1.0) {
      // Linear contrast around mid-grey: out = in * C + (128 - 128 * C)
      const c = enhancement.contrast
      pipeline = pipeline.linear(c, 128 - 128 * c)
    }
    if (enhancement.saturation !== 1.0) {
      pipeline = pipeline.modulate({ saturation: enhancement.saturation })
    }
  }

  // 6. Resize / crop.
  const plan = computeResizePlan(
    req.image.originalWidth,
    req.image.originalHeight,
    resize
  )
  if (plan) {
    pipeline = pipeline.resize(plan.resizeWidth, plan.resizeHeight, {
      fit: 'fill' // exact dimensions; geometry already computed by computeResizePlan
    })
    if (plan.crop) {
      pipeline = pipeline.extract({
        left: plan.crop.left,
        top: plan.crop.top,
        width: plan.crop.width,
        height: plan.crop.height
      })
    }
  }

  // Optional extra downscale for previews (keeps preview rendering cheap).
  if (maxWidthOverride) {
    pipeline = pipeline.resize({ width: maxWidthOverride, withoutEnlargement: true })
  }

  // 7. Sharpen after resize. Auto mode applies a light, consistent sharpen.
  const doSharpen = enhancement.mode === 'auto' ? true : enhancement.sharpen
  const sharpenSigma = enhancement.mode === 'auto' ? 0.8 : enhancement.sharpenSigma
  if (doSharpen) {
    pipeline = pipeline.sharpen({ sigma: sharpenSigma })
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true })
  return {
    data,
    width: info.width,
    height: info.height,
    channels: info.channels as 1 | 2 | 3 | 4
  }
}

function rawToSharp(raw: ProcessedRaw): Sharp {
  return sharp(raw.data, {
    raw: { width: raw.width, height: raw.height, channels: raw.channels }
  })
}

function applyFormat(pipeline: Sharp, format: ExportFormat, quality: number): Sharp {
  switch (format) {
    case 'jpeg':
      return pipeline.jpeg({ quality, mozjpeg: true })
    case 'webp':
      return pipeline.webp({ quality })
    case 'avif':
      return pipeline.avif({ quality })
    case 'png':
      // PNG quality only affects palette quantization; keep max compression.
      return pipeline.png({ compressionLevel: 9 })
  }
}

async function encodeOnce(
  raw: ProcessedRaw,
  exp: ExportSettings,
  quality: number
): Promise<Buffer> {
  let pipeline = rawToSharp(raw)
  if (!exp.stripMetadata) {
    // Best-effort: keeps ICC/orientation defaults. Note that source EXIF is not
    // available after decoding to raw (see Known Limitations).
    pipeline = pipeline.withMetadata()
  }
  pipeline = applyFormat(pipeline, exp.format, quality)
  return pipeline.toBuffer()
}

// ---------------------------------------------------------------------------
// Target file size optimization (binary search over quality)
// ---------------------------------------------------------------------------
interface EncodeResult {
  buffer: Buffer
  qualityUsed: number
  warning?: string
}

function qualityRangeFor(format: ExportFormat): { min: number; max: number } {
  switch (format) {
    case 'jpeg':
      return { min: 40, max: 95 }
    case 'webp':
      return { min: 40, max: 95 }
    case 'avif':
      return { min: 30, max: 90 }
    case 'png':
      return { min: 1, max: 100 }
  }
}

/**
 * Find the highest quality whose encoded size is <= targetBytes. If even the
 * minimum quality exceeds the target, return the minimum-quality buffer plus a
 * warning so the export still succeeds.
 */
async function encodeToTargetSize(
  raw: ProcessedRaw,
  exp: ExportSettings,
  targetBytes: number
): Promise<EncodeResult> {
  const { min, max } = qualityRangeFor(exp.format)
  let lo = min
  let hi = max
  let bestBuffer: Buffer | null = null
  let bestQuality: number | null = null

  while (lo <= hi) {
    const q = Math.floor((lo + hi) / 2)
    const buffer = await encodeOnce(raw, exp, q)
    if (buffer.length <= targetBytes) {
      bestBuffer = buffer
      bestQuality = q
      lo = q + 1 // try for higher quality
    } else {
      hi = q - 1
    }
  }

  if (bestBuffer && bestQuality != null) {
    return { buffer: bestBuffer, qualityUsed: bestQuality }
  }

  // Target unreachable even at minimum quality: encode at min and warn.
  const fallback = await encodeOnce(raw, exp, min)
  return {
    buffer: fallback,
    qualityUsed: min,
    warning: 'Target file size could not be reached at minimum quality.'
  }
}

/** Decide between fixed-quality and target-size encoding. */
async function encodeFinal(raw: ProcessedRaw, exp: ExportSettings): Promise<EncodeResult> {
  const wantsTarget = exp.useTargetFileSize && exp.targetFileSizeKb && exp.targetFileSizeKb > 0

  if (wantsTarget && exp.format === 'png') {
    // PNG is lossless; target-size search doesn't apply.
    const buffer = await encodeOnce(raw, exp, exp.quality)
    return {
      buffer,
      qualityUsed: exp.quality,
      warning: 'Target file size mode is only supported for JPEG/WebP/AVIF. PNG was exported losslessly.'
    }
  }

  if (wantsTarget) {
    const targetBytes = (exp.targetFileSizeKb as number) * 1024
    return encodeToTargetSize(raw, exp, targetBytes)
  }

  const buffer = await encodeOnce(raw, exp, exp.quality)
  return { buffer, qualityUsed: exp.quality }
}

// ---------------------------------------------------------------------------
// Public: single image export
// ---------------------------------------------------------------------------
export async function processImage(req: ProcessImageRequest): Promise<ProcessImageResult> {
  const base: ProcessImageResult = {
    imageId: req.image.id,
    inputPath: req.image.inputPath,
    success: false,
    status: 'error',
    originalSizeBytes: req.image.originalSizeBytes,
    originalWidth: req.image.originalWidth,
    originalHeight: req.image.originalHeight
  }

  try {
    if (!req.export.outputFolder) {
      return { ...base, error: 'No output folder selected.' }
    }
    await fs.access(req.image.inputPath).catch(() => {
      throw new Error('Input file is missing or unreadable.')
    })

    // Resolve the output path early so a "skip" conflict avoids heavy work.
    const basePath = buildBaseOutputPath({
      inputPath: req.image.inputPath,
      outputFolder: req.export.outputFolder,
      format: req.export.format,
      prefix: req.export.filenamePrefix,
      suffix: req.export.filenameSuffix
    })
    await ensureDirectory(req.export.outputFolder)
    const resolved = await resolveOutputPath(basePath, req.export.conflictMode)
    if (resolved.skip) {
      return {
        ...base,
        success: false,
        status: 'skipped',
        outputPath: basePath,
        warning: 'Output file already exists; skipped.'
      }
    }

    if (req.export.format === 'avif' && !(await isAvifSupported())) {
      return { ...base, error: 'AVIF encoding is not available in this build.' }
    }

    const raw = await buildProcessedRaw(req)
    const encoded = await encodeFinal(raw, req.export)
    await fs.writeFile(resolved.outputPath, encoded.buffer)

    return {
      ...base,
      success: true,
      status: 'done',
      outputPath: resolved.outputPath,
      outputSizeBytes: encoded.buffer.length,
      outputWidth: raw.width,
      outputHeight: raw.height,
      qualityUsed: encoded.qualityUsed,
      warning: encoded.warning
    }
  } catch (err) {
    return { ...base, error: errorMessage(err) }
  }
}

// ---------------------------------------------------------------------------
// Public: preview generation
// ---------------------------------------------------------------------------
export async function generatePreview(req: ProcessImageRequest): Promise<PreviewResult> {
  try {
    await fs.access(req.image.inputPath).catch(() => {
      throw new Error('Input file is missing or unreadable.')
    })

    if (req.export.format === 'avif' && !(await isAvifSupported())) {
      return {
        imageId: req.image.id,
        success: false,
        error: 'AVIF encoding is not available in this build.'
      }
    }

    // Full-resolution processed pixels -> accurate output size + quality.
    const fullRaw = await buildProcessedRaw(req)
    const encoded = await encodeFinal(fullRaw, req.export)

    // For display we downscale to a manageable preview size and encode WebP.
    let displayRaw = fullRaw
    if (fullRaw.width > PREVIEW_MAX_WIDTH) {
      displayRaw = await buildProcessedRaw(req, PREVIEW_MAX_WIDTH)
    }
    const displayBuffer = await rawToSharp(displayRaw).webp({ quality: 82 }).toBuffer()

    return {
      imageId: req.image.id,
      success: true,
      dataUrl: `data:image/webp;base64,${displayBuffer.toString('base64')}`,
      outputWidth: fullRaw.width,
      outputHeight: fullRaw.height,
      estimatedSizeBytes: encoded.buffer.length,
      qualityUsed: encoded.qualityUsed,
      warning: encoded.warning
    }
  } catch (err) {
    return { imageId: req.image.id, success: false, error: errorMessage(err) }
  }
}

// Batch orchestration lives in sharpClient.ts (main process), which drives this
// module's processImage across a pool of worker processes.

// ---------------------------------------------------------------------------
function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  return String(err)
}
