/**
 * Image queue state: the list of imported images, the selection, and helpers to
 * mutate per-image status/results. Importing paths probes metadata via IPC.
 */
import { create } from 'zustand'
import { api } from '../lib/electronApi'
import type { ImageItem, ImageStatus, ProcessImageResult } from '../types/image'

function makeId(): string {
  return globalThis.crypto?.randomUUID?.() ?? `img_${Date.now()}_${Math.random().toString(36).slice(2)}`
}

interface ImageQueueState {
  items: ImageItem[]
  selectedId: string | null
  isImporting: boolean

  importPaths: (paths: string[]) => Promise<void>
  removeImage: (id: string) => void
  clearQueue: () => void
  selectImage: (id: string | null) => void
  updateItem: (id: string, patch: Partial<ImageItem>) => void
  setStatus: (id: string, status: ImageStatus) => void
  applyResult: (result: ProcessImageResult) => void
  setThumbnail: (id: string, dataUrl: string) => void
  resetStatuses: () => void
}

export const useImageQueueStore = create<ImageQueueState>((set, get) => ({
  items: [],
  selectedId: null,
  isImporting: false,

  importPaths: async (paths) => {
    if (paths.length === 0) return
    // Skip paths already in the queue.
    const existing = new Set(get().items.map((i) => i.inputPath))
    const fresh = paths.filter((p) => !existing.has(p))
    if (fresh.length === 0) return

    set({ isImporting: true })
    try {
      const metas = await api.getImageMetadata(fresh)
      const newItems: ImageItem[] = metas.map((m) => ({
        id: makeId(),
        inputPath: m.inputPath,
        fileName: m.fileName,
        originalWidth: m.width,
        originalHeight: m.height,
        originalSizeBytes: m.sizeBytes,
        format: m.format,
        hasAlpha: m.hasAlpha,
        thumbnailDataUrl: m.thumbnailDataUrl,
        status: m.error ? 'error' : 'pending',
        error: m.error
      }))
      set((state) => {
        const items = [...state.items, ...newItems]
        return {
          items,
          selectedId: state.selectedId ?? items[0]?.id ?? null
        }
      })
    } finally {
      set({ isImporting: false })
    }
  },

  removeImage: (id) =>
    set((state) => {
      const items = state.items.filter((i) => i.id !== id)
      let selectedId = state.selectedId
      if (selectedId === id) selectedId = items[0]?.id ?? null
      return { items, selectedId }
    }),

  clearQueue: () => set({ items: [], selectedId: null }),

  selectImage: (id) => set({ selectedId: id }),

  updateItem: (id, patch) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, ...patch } : i))
    })),

  setStatus: (id, status) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, status } : i))
    })),

  applyResult: (result) =>
    set((state) => ({
      items: state.items.map((i) =>
        i.id === result.imageId
          ? {
              ...i,
              status: result.status,
              outputPath: result.outputPath,
              outputWidth: result.outputWidth,
              outputHeight: result.outputHeight,
              outputSizeBytes: result.outputSizeBytes,
              qualityUsed: result.qualityUsed,
              warning: result.warning,
              error: result.error
            }
          : i
      )
    })),

  setThumbnail: (id, dataUrl) =>
    set((state) => ({
      items: state.items.map((i) => (i.id === id ? { ...i, thumbnailDataUrl: dataUrl } : i))
    })),

  resetStatuses: () =>
    set((state) => ({
      items: state.items.map((i) => ({
        ...i,
        status: i.status === 'error' && i.originalWidth === 0 ? 'error' : 'pending',
        outputPath: undefined,
        outputSizeBytes: undefined,
        outputWidth: undefined,
        outputHeight: undefined,
        qualityUsed: undefined,
        warning: undefined,
        error: i.originalWidth === 0 ? i.error : undefined
      }))
    }))
}))
