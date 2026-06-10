/**
 * Client-side validation helpers. The main process re-validates everything with
 * Zod, but checking here lets us disable buttons and show inline hints before a
 * round-trip.
 */
import type {
  AppSettings,
  ImageItem,
  ProcessImageRequest,
  ResizeSettings
} from '../types/image'

/** Which resize modes need which dimension fields. */
export function resizeFieldErrors(resize: ResizeSettings): string[] {
  const errors: string[] = []
  if (!resize.enabled || resize.mode === 'none') return errors
  switch (resize.mode) {
    case 'fit':
    case 'fill-crop':
    case 'exact':
      if (!resize.width) errors.push('Width is required for this resize mode.')
      if (!resize.height) errors.push('Height is required for this resize mode.')
      break
    case 'width':
      if (!resize.width) errors.push('Width is required.')
      break
    case 'height':
      if (!resize.height) errors.push('Height is required.')
      break
    case 'percentage':
      if (!resize.percentage) errors.push('Percentage is required.')
      break
  }
  return errors
}

export interface ExportReadiness {
  ok: boolean
  reasons: string[]
}

export function exportReadiness(
  settings: Pick<AppSettings, 'resize' | 'export'>
): ExportReadiness {
  const reasons: string[] = []
  if (!settings.export.outputFolder) reasons.push('Select an output folder.')
  reasons.push(...resizeFieldErrors(settings.resize))
  if (
    settings.export.useTargetFileSize &&
    (!settings.export.targetFileSizeKb || settings.export.targetFileSizeKb <= 0)
  ) {
    reasons.push('Enter a target file size in KB.')
  }
  return { ok: reasons.length === 0, reasons }
}

/** Assemble the IPC request payload for a single image from current settings. */
export function buildProcessRequest(
  image: ImageItem,
  settings: AppSettings
): ProcessImageRequest {
  return {
    image,
    resize: settings.resize,
    enhancement: settings.enhancement,
    export: settings.export
  }
}
