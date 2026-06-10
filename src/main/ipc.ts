/**
 * IPC handlers. Every inbound payload from the (untrusted) renderer is parsed
 * with Zod before use. Progress for batches is streamed back over a dedicated
 * event channel to the originating window.
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { BrowserWindow, dialog, ipcMain } from 'electron'
import { IpcChannels } from '@shared/ipc'
import {
  appSettingsSchema,
  getMetadataRequestSchema,
  previewRequestSchema,
  processBatchRequestSchema,
  processImageRequestSchema
} from '@shared/schemas'
import { isSupportedInput } from './fileUtils'
import {
  generatePreview,
  getMetadataForPaths,
  isAvifSupported,
  processBatch,
  processImage
} from './sharpClient'
import { loadSettings, saveSettings } from './settingsStore'
import type {
  BatchProgressEvent,
  BatchSummary,
  ImageMetadata,
  ProcessImageResult
} from '@shared/types'

/** Tracks an in-flight batch so it can be cancelled. */
let batchCancelled = false

export function registerIpcHandlers(): void {
  // -- dialog:select-images ------------------------------------------------
  ipcMain.handle(IpcChannels.selectImages, async (event): Promise<string[]> => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Images',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Images',
          extensions: ['jpg', 'jpeg', 'png', 'webp', 'tiff', 'tif', 'bmp', 'gif', 'avif']
        }
      ]
    })
    if (result.canceled) return []
    return result.filePaths.filter(isSupportedInput)
  })

  // -- dialog:select-folder-images (Import Folder) ------------------------
  ipcMain.handle(IpcChannels.selectFolderImages, async (event): Promise<string[]> => {
    const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
    const result = await dialog.showOpenDialog(win!, {
      title: 'Import Folder',
      properties: ['openDirectory']
    })
    if (result.canceled || result.filePaths.length === 0) return []
    const dir = result.filePaths[0]
    const entries = await fs.readdir(dir, { withFileTypes: true })
    return entries
      .filter((e) => e.isFile())
      .map((e) => path.join(dir, e.name))
      .filter(isSupportedInput)
  })

  // -- dialog:select-output-folder ----------------------------------------
  ipcMain.handle(
    IpcChannels.selectOutputFolder,
    async (event): Promise<string | null> => {
      const win = BrowserWindow.fromWebContents(event.sender) ?? undefined
      const result = await dialog.showOpenDialog(win!, {
        title: 'Select Output Folder',
        properties: ['openDirectory', 'createDirectory']
      })
      if (result.canceled || result.filePaths.length === 0) return null
      return result.filePaths[0]
    }
  )

  // -- image:get-metadata --------------------------------------------------
  ipcMain.handle(
    IpcChannels.getMetadata,
    async (_event, payload: unknown): Promise<ImageMetadata[]> => {
      const { paths } = getMetadataRequestSchema.parse(payload)
      const supported = paths.filter(isSupportedInput)
      return getMetadataForPaths(supported)
    }
  )

  // -- image:generate-preview ---------------------------------------------
  ipcMain.handle(IpcChannels.generatePreview, async (_event, payload: unknown) => {
    const req = previewRequestSchema.parse(payload)
    return generatePreview(req)
  })

  // -- image:process (single) ---------------------------------------------
  ipcMain.handle(
    IpcChannels.processImage,
    async (_event, payload: unknown): Promise<ProcessImageResult> => {
      const req = processImageRequestSchema.parse(payload)
      return processImage(req)
    }
  )

  // -- image:process-batch -------------------------------------------------
  ipcMain.handle(
    IpcChannels.processBatch,
    async (event, payload: unknown): Promise<BatchSummary> => {
      const { items, concurrency } = processBatchRequestSchema.parse(payload)
      batchCancelled = false
      const sender = event.sender

      const emit = (channel: string, data: unknown): void => {
        if (!sender.isDestroyed()) sender.send(channel, data)
      }

      const results = await processBatch(items, {
        concurrency,
        isCancelled: () => batchCancelled,
        onProgress: (ev: BatchProgressEvent) => {
          emit(IpcChannels.batchProgress, ev)
          if (ev.result) {
            if (ev.result.success) {
              emit(IpcChannels.imageCompleted, ev.result)
            } else if (ev.result.status === 'error') {
              emit(IpcChannels.imageError, ev.result)
            }
          }
        }
      })

      const summary: BatchSummary = {
        total: items.length,
        completed: results.filter((r) => r.status === 'done').length,
        failed: results.filter((r) => r.status === 'error').length,
        skipped: results.filter((r) => r.status === 'skipped').length
      }
      emit(IpcChannels.batchCompleted, summary)
      return summary
    }
  )

  // -- image:cancel-batch --------------------------------------------------
  ipcMain.handle(IpcChannels.cancelBatch, async (): Promise<void> => {
    batchCancelled = true
  })

  // -- settings:load / settings:save --------------------------------------
  ipcMain.handle(IpcChannels.settingsLoad, async () => loadSettings())

  ipcMain.handle(IpcChannels.settingsSave, async (_event, payload: unknown) => {
    const settings = appSettingsSchema.parse(payload)
    return saveSettings(settings)
  })

  // Expose AVIF capability so the UI can disable it when unavailable.
  ipcMain.handle(IpcChannels.capabilitiesAvif, async () => isAvifSupported())
}
