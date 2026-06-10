/**
 * Message protocol between the main process and a Sharp worker child process.
 * Kept tiny and JSON-serializable (no Buffers cross the boundary; image bytes
 * are turned into base64 data URLs or written to disk inside the worker).
 */
import type {
  ImageMetadata,
  PreviewResult,
  ProcessImageRequest,
  ProcessImageResult
} from '@shared/types'

export type WorkerTaskType = 'metadata' | 'preview' | 'process' | 'avif'

export interface WorkerRequest {
  id: number
  type: WorkerTaskType
  payload: unknown
}

export interface WorkerResponse {
  id: number
  ok: boolean
  result?: unknown
  error?: string
}

// Per-task payload/result shapes (used for type-safe calls in sharpClient).
export interface TaskMap {
  metadata: { payload: { paths: string[] }; result: ImageMetadata[] }
  preview: { payload: ProcessImageRequest; result: PreviewResult }
  process: { payload: ProcessImageRequest; result: ProcessImageResult }
  avif: { payload: undefined; result: boolean }
}
