/**
 * Built-in image presets. A preset is a partial bundle of resize / enhancement
 * / export settings. Applying a preset merges its values over the current
 * settings (see `applyPreset` in the renderer settings store).
 */
import { applyStrengthPreset } from './enhance'
import { defaultEnhancementSettings } from './defaults'
import type { EnhancementSettings, ImagePreset } from './types'

function enhancement(strength: 'low' | 'medium' | 'high'): EnhancementSettings {
  return applyStrengthPreset(defaultEnhancementSettings(), strength)
}

export const DEFAULT_PRESETS: ImagePreset[] = [
  {
    id: 'blog-image',
    name: 'Blog Image',
    description: '1200px wide WebP, ~300 KB. Good default for article images.',
    resize: {
      enabled: true,
      mode: 'width',
      width: 1200,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement('medium'),
    export: {
      format: 'webp',
      useTargetFileSize: true,
      targetFileSizeKb: 300,
      filenameSuffix: '-web'
    }
  },
  {
    id: 'product-image',
    name: 'Product Image',
    description: '1600px wide WebP, ~500 KB. Crisp product shots.',
    resize: {
      enabled: true,
      mode: 'width',
      width: 1600,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement('medium'),
    export: {
      format: 'webp',
      useTargetFileSize: true,
      targetFileSizeKb: 500,
      filenameSuffix: '-product'
    }
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: '400x400 fill-crop WebP, ~80 KB.',
    resize: {
      enabled: true,
      mode: 'fill-crop',
      width: 400,
      height: 400,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement('medium'),
    export: {
      format: 'webp',
      useTargetFileSize: true,
      targetFileSizeKb: 80,
      filenameSuffix: '-thumb'
    }
  },
  {
    id: 'hero-banner',
    name: 'Hero Banner',
    description: '1920px wide WebP, ~700 KB. Large headers.',
    resize: {
      enabled: true,
      mode: 'width',
      width: 1920,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement('low'),
    export: {
      format: 'webp',
      useTargetFileSize: true,
      targetFileSizeKb: 700,
      filenameSuffix: '-hero'
    }
  },
  {
    id: 'social-preview',
    name: 'Social Preview',
    description: '1200x630 fill-crop JPEG, ~300 KB. Open Graph / Twitter cards.',
    resize: {
      enabled: true,
      mode: 'fill-crop',
      width: 1200,
      height: 630,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement('medium'),
    export: {
      format: 'jpeg',
      useTargetFileSize: true,
      targetFileSizeKb: 300,
      filenameSuffix: '-social'
    }
  }
]

export function findPreset(id: string | undefined): ImagePreset | undefined {
  if (!id) return undefined
  return DEFAULT_PRESETS.find((p) => p.id === id)
}
