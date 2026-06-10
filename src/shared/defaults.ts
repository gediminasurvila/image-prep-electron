/**
 * Factory functions for default settings. Using factories (instead of shared
 * constant objects) avoids accidental cross-store mutation aliasing.
 */
import type { AppSettings, EnhancementSettings, ExportSettings, ResizeSettings } from './types'

export function defaultResizeSettings(): ResizeSettings {
  return {
    enabled: true,
    mode: 'width',
    width: 1200,
    height: 1200,
    percentage: 100,
    preserveAspectRatio: true,
    preventUpscale: true
  }
}

export function defaultEnhancementSettings(): EnhancementSettings {
  return {
    autoEnhance: true,
    autoEnhanceStrength: 'medium',
    autoLevels: true,
    gamma: 1.0,
    contrast: 1.08,
    saturation: 1.05,
    sharpen: true,
    sharpenSigma: 0.9
  }
}

export function defaultExportSettings(): ExportSettings {
  return {
    format: 'webp',
    quality: 80,
    useTargetFileSize: true,
    targetFileSizeKb: 300,
    stripMetadata: true,
    convertToSrgb: true,
    outputFolder: '',
    filenamePrefix: '',
    filenameSuffix: '-optimized',
    conflictMode: 'rename'
  }
}

export function defaultAppSettings(): AppSettings {
  return {
    resize: defaultResizeSettings(),
    enhancement: defaultEnhancementSettings(),
    export: defaultExportSettings(),
    selectedPresetId: undefined
  }
}
