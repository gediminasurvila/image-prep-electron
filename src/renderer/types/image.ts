/**
 * Renderer-facing re-export of the shared domain types. Components and stores
 * import from here so the renderer never reaches across into main/shared paths
 * directly in many places.
 */
export type {
  AppSettings,
  AutoEnhanceStrength,
  BatchProgressEvent,
  BatchSummary,
  ConflictMode,
  EnhancementSettings,
  ExportFormat,
  ExportSettings,
  ImageItem,
  ImageMetadata,
  ImagePreset,
  ImageStatus,
  PreviewResult,
  ProcessImageRequest,
  ProcessImageResult,
  ResizeMode,
  ResizeSettings
} from '@shared/types'
