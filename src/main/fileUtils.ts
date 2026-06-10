/**
 * Filesystem helpers for output naming, conflict resolution, and supported
 * input formats. Kept independent of Sharp so the logic is easy to follow.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { ConcreteFormat, ConflictMode } from '@shared/types'

/** Extensions we accept on import (lowercase, no dot). */
export const SUPPORTED_INPUT_EXTENSIONS = [
  'jpg',
  'jpeg',
  'png',
  'webp',
  'tiff',
  'tif',
  'bmp',
  'gif',
  'avif'
] as const

export function isSupportedInput(filePath: string): boolean {
  const ext = path.extname(filePath).slice(1).toLowerCase()
  return (SUPPORTED_INPUT_EXTENSIONS as readonly string[]).includes(ext)
}

const FORMAT_EXTENSIONS: Record<ConcreteFormat, string> = {
  jpeg: 'jpg',
  png: 'png',
  webp: 'webp',
  avif: 'avif'
}

export function extensionForFormat(format: ConcreteFormat): string {
  return FORMAT_EXTENSIONS[format]
}

export interface OutputNameParams {
  inputPath: string
  outputFolder: string
  format: ConcreteFormat
  prefix: string
  suffix: string
}

/** Build the desired output filename (without resolving conflicts). */
export function buildBaseOutputPath(params: OutputNameParams): string {
  const { inputPath, outputFolder, format, prefix, suffix } = params
  const baseName = path.basename(inputPath, path.extname(inputPath))
  const ext = extensionForFormat(format)
  const fileName = `${prefix}${baseName}${suffix}.${ext}`
  return path.join(outputFolder, fileName)
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export interface ResolvedOutput {
  /** The path to write to. */
  outputPath: string
  /** True when conflictMode === 'skip' and the file already exists. */
  skip: boolean
}

/**
 * Resolve the final output path given the conflict policy.
 *  - overwrite: use the base path as-is.
 *  - skip: signal the caller to skip if the file exists.
 *  - rename: append -1, -2, ... until a free name is found.
 */
export async function resolveOutputPath(
  basePath: string,
  conflictMode: ConflictMode
): Promise<ResolvedOutput> {
  const exists = await pathExists(basePath)

  if (!exists || conflictMode === 'overwrite') {
    return { outputPath: basePath, skip: false }
  }

  if (conflictMode === 'skip') {
    return { outputPath: basePath, skip: true }
  }

  // rename: photo-optimized.webp -> photo-optimized-1.webp -> ...
  const dir = path.dirname(basePath)
  const ext = path.extname(basePath)
  const stem = path.basename(basePath, ext)

  for (let i = 1; i < 10_000; i++) {
    const candidate = path.join(dir, `${stem}-${i}${ext}`)
    if (!(await pathExists(candidate))) {
      return { outputPath: candidate, skip: false }
    }
  }
  // Extremely unlikely fallback.
  return { outputPath: path.join(dir, `${stem}-${Date.now()}${ext}`), skip: false }
}

export async function ensureDirectory(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}
