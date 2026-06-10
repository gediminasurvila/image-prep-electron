/**
 * Auto-enhance strength presets and helpers.
 *
 * When `autoEnhance` is on, the strength preset drives the gamma/contrast/
 * saturation/sharpen values. The renderer uses `applyStrengthPreset` so the UI
 * sliders reflect the chosen strength, and the processor reads the resolved
 * EnhancementSettings directly.
 */
import type { AutoEnhanceStrength, EnhancementSettings } from './types'

export interface StrengthPreset {
  autoLevels: boolean
  gamma: number
  contrast: number
  saturation: number
  sharpen: boolean
  sharpenSigma: number
}

export const STRENGTH_PRESETS: Record<AutoEnhanceStrength, StrengthPreset> = {
  low: {
    autoLevels: true,
    gamma: 1.0,
    contrast: 1.04,
    saturation: 1.02,
    sharpen: true,
    sharpenSigma: 0.6
  },
  medium: {
    autoLevels: true,
    gamma: 1.0,
    contrast: 1.08,
    saturation: 1.05,
    sharpen: true,
    sharpenSigma: 0.9
  },
  high: {
    autoLevels: true,
    gamma: 1.0,
    contrast: 1.14,
    saturation: 1.1,
    sharpen: true,
    sharpenSigma: 1.1
  }
}

/** Merge a strength preset into the manual enhancement fields. */
export function applyStrengthPreset(
  base: EnhancementSettings,
  strength: AutoEnhanceStrength
): EnhancementSettings {
  const preset = STRENGTH_PRESETS[strength]
  return {
    ...base,
    autoEnhance: true,
    autoEnhanceStrength: strength,
    autoLevels: preset.autoLevels,
    gamma: preset.gamma,
    contrast: preset.contrast,
    saturation: preset.saturation,
    sharpen: preset.sharpen,
    sharpenSigma: preset.sharpenSigma
  }
}
