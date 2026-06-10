/**
 * Pure resize geometry calculations.
 *
 * These functions contain no Sharp / DOM dependencies so they can be unit
 * tested and reused on either side of the IPC boundary (e.g. the renderer can
 * predict output dimensions for the preview labels without round-tripping).
 *
 * All formulas follow the spec in the product description.
 */
import type { ResizeMode, ResizeSettings } from './types'

export interface ResizePlan {
  /** Resize the source to these dimensions before any optional crop. */
  resizeWidth: number
  resizeHeight: number
  /** When set, crop a centered region of this size out of the resized image. */
  crop?: {
    width: number
    height: number
    left: number
    top: number
  }
  /** Final output dimensions (after crop, if any). */
  outputWidth: number
  outputHeight: number
}

/** Sharp/most encoders cannot handle a zero dimension; clamp to >= 1. */
const atLeast1 = (n: number): number => Math.max(1, Math.round(n))

/**
 * Compute the resize/crop plan for a given source size + settings.
 * Returns `null` when no resizing is required (mode "none" or disabled),
 * letting the caller skip the resize step entirely.
 */
export function computeResizePlan(
  originalWidth: number,
  originalHeight: number,
  settings: ResizeSettings
): ResizePlan | null {
  if (!settings.enabled || settings.mode === 'none') return null

  const Wo = originalWidth
  const Ho = originalHeight
  const { mode, preventUpscale } = settings

  const clampScale = (s: number): number => (preventUpscale ? Math.min(s, 1) : s)

  switch (mode) {
    case 'fit': {
      const { width: Wt, height: Ht } = requireBox(mode, settings)
      const s = clampScale(Math.min(Wt / Wo, Ht / Ho))
      const Wn = atLeast1(Wo * s)
      const Hn = atLeast1(Ho * s)
      return { resizeWidth: Wn, resizeHeight: Hn, outputWidth: Wn, outputHeight: Hn }
    }

    case 'fill-crop': {
      const { width: Wt, height: Ht } = requireBox(mode, settings)
      // Scale so the image covers the target box, then center-crop to it.
      const s = clampScale(Math.max(Wt / Wo, Ht / Ho))
      const Ws = atLeast1(Wo * s)
      const Hs = atLeast1(Ho * s)
      const targetW = Math.min(Ws, atLeast1(Wt))
      const targetH = Math.min(Hs, atLeast1(Ht))
      const left = Math.max(0, Math.round((Ws - targetW) / 2))
      const top = Math.max(0, Math.round((Hs - targetH) / 2))
      return {
        resizeWidth: Ws,
        resizeHeight: Hs,
        crop: { width: targetW, height: targetH, left, top },
        outputWidth: targetW,
        outputHeight: targetH
      }
    }

    case 'exact': {
      const { width: Wt, height: Ht } = requireBox(mode, settings)
      // Stretch to the exact dimensions, ignoring aspect ratio.
      const Wn = atLeast1(Wt)
      const Hn = atLeast1(Ht)
      return { resizeWidth: Wn, resizeHeight: Hn, outputWidth: Wn, outputHeight: Hn }
    }

    case 'width': {
      const Wt = requireNumber('width', settings.width)
      const s = clampScale(Wt / Wo)
      const Wn = atLeast1(Wo * s)
      const Hn = atLeast1(Ho * s)
      return { resizeWidth: Wn, resizeHeight: Hn, outputWidth: Wn, outputHeight: Hn }
    }

    case 'height': {
      const Ht = requireNumber('height', settings.height)
      const s = clampScale(Ht / Ho)
      const Wn = atLeast1(Wo * s)
      const Hn = atLeast1(Ho * s)
      return { resizeWidth: Wn, resizeHeight: Hn, outputWidth: Wn, outputHeight: Hn }
    }

    case 'percentage': {
      const pct = requireNumber('percentage', settings.percentage)
      const s = clampScale(pct / 100)
      const Wn = atLeast1(Wo * s)
      const Hn = atLeast1(Ho * s)
      return { resizeWidth: Wn, resizeHeight: Hn, outputWidth: Wn, outputHeight: Hn }
    }

    default:
      return null
  }
}

function requireBox(
  mode: ResizeMode,
  settings: ResizeSettings
): { width: number; height: number } {
  if (settings.width == null || settings.height == null) {
    throw new Error(`Resize mode "${mode}" requires both width and height.`)
  }
  return { width: settings.width, height: settings.height }
}

function requireNumber(field: string, value: number | undefined): number {
  if (value == null || !Number.isFinite(value) || value <= 0) {
    throw new Error(`Resize requires a positive ${field}.`)
  }
  return value
}
