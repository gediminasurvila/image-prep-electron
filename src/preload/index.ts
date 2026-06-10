/**
 * Preload script. Runs in an isolated context with access to a minimal set of
 * Electron primitives and exposes a single, typed `window.imageprep` API to the
 * renderer via contextBridge. The renderer never touches ipcRenderer or the
 * filesystem directly.
 */
import { contextBridge, ipcRenderer, webUtils } from 'electron'
import { IpcChannels } from '@shared/ipc'
import type {
  AppSettings,
  BatchProgressEvent,
  BatchSummary,
  ImageMetadata,
  PreviewResult,
  ProcessImageRequest,
  ProcessImageResult
} from '@shared/types'

/** Subscribe to a channel and return an unsubscribe function. */
function subscribe<T>(channel: string, callback: (data: T) => void): () => void {
  const listener = (_event: Electron.IpcRendererEvent, data: T): void => callback(data)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

const api = {
  selectImages: (): Promise<string[]> => ipcRenderer.invoke(IpcChannels.selectImages),

  selectFolderImages: (): Promise<string[]> =>
    ipcRenderer.invoke(IpcChannels.selectFolderImages),

  selectOutputFolder: (): Promise<string | null> =>
    ipcRenderer.invoke(IpcChannels.selectOutputFolder),

  getImageMetadata: (paths: string[]): Promise<ImageMetadata[]> =>
    ipcRenderer.invoke(IpcChannels.getMetadata, { paths }),

  generatePreview: (payload: ProcessImageRequest): Promise<PreviewResult> =>
    ipcRenderer.invoke(IpcChannels.generatePreview, payload),

  processImage: (payload: ProcessImageRequest): Promise<ProcessImageResult> =>
    ipcRenderer.invoke(IpcChannels.processImage, payload),

  processBatch: (
    items: ProcessImageRequest[],
    concurrency?: number
  ): Promise<BatchSummary> =>
    ipcRenderer.invoke(IpcChannels.processBatch, { items, concurrency }),

  cancelBatch: (): Promise<void> => ipcRenderer.invoke(IpcChannels.cancelBatch),

  loadSettings: (): Promise<AppSettings> => ipcRenderer.invoke(IpcChannels.settingsLoad),

  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke(IpcChannels.settingsSave, settings),

  isAvifSupported: (): Promise<boolean> =>
    ipcRenderer.invoke(IpcChannels.capabilitiesAvif),

  /** Resolve a dropped File to its absolute path (Electron webUtils). */
  pathForFile: (file: File): string => webUtils.getPathForFile(file),

  // ---- Event subscriptions (return unsubscribe) ----
  onProgress: (cb: (e: BatchProgressEvent) => void): (() => void) =>
    subscribe(IpcChannels.batchProgress, cb),

  onImageCompleted: (cb: (r: ProcessImageResult) => void): (() => void) =>
    subscribe(IpcChannels.imageCompleted, cb),

  onImageError: (cb: (r: ProcessImageResult) => void): (() => void) =>
    subscribe(IpcChannels.imageError, cb),

  onBatchCompleted: (cb: (s: BatchSummary) => void): (() => void) =>
    subscribe(IpcChannels.batchCompleted, cb)
}

export type ImagePrepApi = typeof api

contextBridge.exposeInMainWorld('imageprep', api)
