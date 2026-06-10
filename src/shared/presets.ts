/**
 * Built-in image presets. A preset is a partial bundle of resize / enhancement
 * / export settings. Applying a preset merges its values over the current
 * settings (see `applyPreset` in the renderer settings store).
 */
import { defaultEnhancementSettings } from './defaults'
import type { EnhancementSettings, ImagePreset } from './types'

// Presets use per-image auto enhancement (the default). Users can switch the
// Enhancement panel to Manual afterwards if they want explicit control.
function enhancement(): EnhancementSettings {
  return defaultEnhancementSettings()
}

export const DEFAULT_PRESETS: ImagePreset[] = [
  {
    id: 'web-image',
    name: 'Web Image',
    description: '1600px wide · Auto (WebP) · ~400 KB — blog, product & general use.',
    resize: {
      enabled: true,
      mode: 'width',
      width: 1600,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement(),
    export: {
      format: 'auto',
      useTargetFileSize: true,
      targetFileSizeKb: 400,
      filenameSuffix: '-web'
    }
  },
  {
    id: 'thumbnail',
    name: 'Thumbnail',
    description: '400×400 fill-crop · Auto (WebP) · ~80 KB.',
    resize: {
      enabled: true,
      mode: 'fill-crop',
      width: 400,
      height: 400,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement(),
    export: {
      format: 'auto',
      useTargetFileSize: true,
      targetFileSizeKb: 80,
      filenameSuffix: '-thumb'
    }
  },
  {
    id: 'social',
    name: 'Social',
    description: '1200×630 fill-crop · JPEG · ~300 KB — Open Graph / Twitter cards.',
    resize: {
      enabled: true,
      mode: 'fill-crop',
      width: 1200,
      height: 630,
      preserveAspectRatio: true,
      preventUpscale: true
    },
    enhancement: enhancement(),
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
