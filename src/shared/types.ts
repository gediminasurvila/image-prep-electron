/**
 * Shared domain types for ImagePrep.
 *
 * These types are imported by both the Electron main process (image processing,
 * IPC handlers) and the renderer (React UI / Zustand stores). Keep this file
 * free of any runtime dependencies on `electron`, `sharp`, DOM, etc. so it can
 * be safely imported from either side.
 */

export type ImageStatus = 'pending' | 'processing' | 'done' | 'error' | 'skipped'

export interface ImageItem {
  id: string
  inputPath: string
  fileName: string
  originalWidth: number
  originalHeight: number
  originalSizeBytes: number
  format: string
  thumbnailDataUrl?: string
  status: ImageStatus
  outputPath?: string
  outputWidth?: number
  outputHeight?: number
  outputSizeBytes?: number
  qualityUsed?: number
  warning?: string
  error?: string
}

export type ResizeMode = 'none' | 'fit' | 'fill-crop' | 'exact' | 'width' | 'height' | 'percentage'

export interface ResizeSettings {
  enabled: boolean
  mode: ResizeMode
  width?: number
  height?: number
  percentage?: number
  preserveAspectRatio: boolean
  preventUpscale: boolean
}

export type AutoEnhanceStrength = 'low' | 'medium' | 'high'

export interface EnhancementSettings {
  autoEnhance: boolean
  autoEnhanceStrength: AutoEnhanceStrength

  autoLevels: boolean
  gamma: number
  contrast: number
  saturation: number

  sharpen: boolean
  sharpenSigma: number
}

export type ExportFormat = 'jpeg' | 'png' | 'webp' | 'avif'

export type ConflictMode = 'rename' | 'overwrite' | 'skip'

export interface ExportSettings {
  format: ExportFormat
  quality: number
  useTargetFileSize: boolean
  targetFileSizeKb?: number
  stripMetadata: boolean
  convertToSrgb: boolean
  outputFolder: string
  filenamePrefix: string
  filenameSuffix: string
  conflictMode: ConflictMode
}

/** The three configurable setting groups bundled together. */
export interface AppSettings {
  resize: ResizeSettings
  enhancement: EnhancementSettings
  export: ExportSettings
  selectedPresetId?: string
}

export interface ImagePreset {
  id: string
  name: string
  description?: string
  resize: ResizeSettings
  enhancement: EnhancementSettings
  export: Partial<ExportSettings>
}

/** Metadata returned by the main process after probing a file with Sharp. */
export interface ImageMetadata {
  inputPath: string
  fileName: string
  width: number
  height: number
  sizeBytes: number
  format: string
  thumbnailDataUrl?: string
  error?: string
}

export interface ProcessImageRequest {
  image: ImageItem
  resize: ResizeSettings
  enhancement: EnhancementSettings
  export: ExportSettings
}

export interface ProcessImageResult {
  imageId: string
  inputPath: string
  outputPath?: string
  success: boolean
  status: ImageStatus
  originalSizeBytes: number
  outputSizeBytes?: number
  originalWidth: number
  originalHeight: number
  outputWidth?: number
  outputHeight?: number
  qualityUsed?: number
  warning?: string
  error?: string
}

export interface PreviewRequest {
  image: ImageItem
  resize: ResizeSettings
  enhancement: EnhancementSettings
  export: ExportSettings
}

export interface PreviewResult {
  imageId: string
  success: boolean
  /** base64 data URL suitable for an <img src>. */
  dataUrl?: string
  outputWidth?: number
  outputHeight?: number
  estimatedSizeBytes?: number
  qualityUsed?: number
  warning?: string
  error?: string
}

export interface ProcessBatchRequest {
  items: ProcessImageRequest[]
  concurrency?: number
}

export interface BatchSummary {
  total: number
  completed: number
  failed: number
  skipped: number
}

/** Progress event emitted from main -> renderer during a batch. */
export interface BatchProgressEvent {
  imageId: string
  status: ImageStatus
  /** 0..1 fraction of the batch that has finished (any terminal state). */
  fraction: number
  completedCount: number
  totalCount: number
  currentOperation: string
  result?: ProcessImageResult
}
