/**
 * Zod schemas used to validate every IPC payload that crosses the
 * renderer -> main boundary. The renderer is untrusted from the main process's
 * point of view, so all inbound data is parsed before use.
 *
 * The schemas are written to mirror the types in `./types.ts`. Where convenient
 * we `satisfies` against those types to keep them in sync at compile time.
 */
import { z } from 'zod'
import type {
  AppSettings,
  EnhancementSettings,
  ExportSettings,
  ProcessImageRequest,
  ResizeSettings
} from './types'

export const imageStatusSchema = z.enum(['pending', 'processing', 'done', 'error', 'skipped'])

export const resizeModeSchema = z.enum([
  'none',
  'fit',
  'fill-crop',
  'exact',
  'width',
  'height',
  'percentage'
])

export const exportFormatSchema = z.enum(['jpeg', 'png', 'webp', 'avif', 'auto'])

export const conflictModeSchema = z.enum(['rename', 'overwrite', 'skip'])

export const enhancementModeSchema = z.enum(['auto', 'manual'])

export const imageItemSchema = z.object({
  id: z.string().min(1),
  inputPath: z.string().min(1),
  fileName: z.string().min(1),
  originalWidth: z.number().int().nonnegative(),
  originalHeight: z.number().int().nonnegative(),
  originalSizeBytes: z.number().nonnegative(),
  format: z.string(),
  hasAlpha: z.boolean().optional(),
  thumbnailDataUrl: z.string().optional(),
  status: imageStatusSchema,
  outputPath: z.string().optional(),
  outputWidth: z.number().optional(),
  outputHeight: z.number().optional(),
  outputSizeBytes: z.number().optional(),
  qualityUsed: z.number().optional(),
  warning: z.string().optional(),
  error: z.string().optional()
})

export const resizeSettingsSchema = z.object({
  enabled: z.boolean(),
  mode: resizeModeSchema,
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  percentage: z.number().positive().max(1000).optional(),
  preserveAspectRatio: z.boolean(),
  preventUpscale: z.boolean()
}) satisfies z.ZodType<ResizeSettings>

export const enhancementSettingsSchema = z.object({
  mode: enhancementModeSchema,
  autoLevels: z.boolean(),
  gamma: z.number().min(1).max(3),
  contrast: z.number().min(0.1).max(3),
  saturation: z.number().min(0).max(3),
  sharpen: z.boolean(),
  sharpenSigma: z.number().min(0.3).max(5)
}) satisfies z.ZodType<EnhancementSettings>

export const exportSettingsSchema = z.object({
  format: exportFormatSchema,
  quality: z.number().int().min(1).max(100),
  useTargetFileSize: z.boolean(),
  targetFileSizeKb: z.number().positive().optional(),
  stripMetadata: z.boolean(),
  convertToSrgb: z.boolean(),
  outputFolder: z.string(),
  filenamePrefix: z.string(),
  filenameSuffix: z.string(),
  conflictMode: conflictModeSchema
}) satisfies z.ZodType<ExportSettings>

export const themeModeSchema = z.enum(['system', 'light', 'dark'])

export const appSettingsSchema = z.object({
  resize: resizeSettingsSchema,
  enhancement: enhancementSettingsSchema,
  export: exportSettingsSchema,
  selectedPresetId: z.string().optional(),
  theme: themeModeSchema
}) satisfies z.ZodType<AppSettings>

export const processImageRequestSchema = z.object({
  image: imageItemSchema,
  resize: resizeSettingsSchema,
  enhancement: enhancementSettingsSchema,
  export: exportSettingsSchema
}) satisfies z.ZodType<ProcessImageRequest>

export const previewRequestSchema = processImageRequestSchema

export const processBatchRequestSchema = z.object({
  items: z.array(processImageRequestSchema).min(1),
  concurrency: z.number().int().min(1).max(8).optional()
})

export const getMetadataRequestSchema = z.object({
  paths: z.array(z.string().min(1)).min(1)
})

export type ProcessImageRequestInput = z.infer<typeof processImageRequestSchema>
export type AppSettingsInput = z.infer<typeof appSettingsSchema>
