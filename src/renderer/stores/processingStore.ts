/**
 * Batch processing UI state. The actual work happens in the main process; this
 * store tracks progress/summary for the status bar and disables controls while
 * a batch is running. Progress is driven by IPC events wired in App.tsx.
 */
import { create } from 'zustand'
import { api } from '../lib/electronApi'
import type {
  BatchProgressEvent,
  BatchSummary,
  ProcessImageRequest
} from '../types/image'

interface ProcessingState {
  isProcessing: boolean
  fraction: number
  completedCount: number
  totalCount: number
  currentOperation: string
  summary: BatchSummary | null
  errorMessage: string | null

  begin: (total: number) => void
  onProgress: (event: BatchProgressEvent) => void
  finish: (summary: BatchSummary) => void
  fail: (message: string) => void
  reset: () => void
  /** Fire-and-forget cancel request to the main process. */
  cancel: () => void
}

export const useProcessingStore = create<ProcessingState>((set) => ({
  isProcessing: false,
  fraction: 0,
  completedCount: 0,
  totalCount: 0,
  currentOperation: '',
  summary: null,
  errorMessage: null,

  begin: (total) =>
    set({
      isProcessing: true,
      fraction: 0,
      completedCount: 0,
      totalCount: total,
      currentOperation: 'Starting…',
      summary: null,
      errorMessage: null
    }),

  onProgress: (event) =>
    set({
      fraction: event.fraction,
      completedCount: event.completedCount,
      totalCount: event.totalCount,
      currentOperation: event.currentOperation
    }),

  finish: (summary) =>
    set({
      isProcessing: false,
      fraction: 1,
      summary,
      currentOperation: `Finished: ${summary.completed} done, ${summary.failed} failed, ${summary.skipped} skipped`
    }),

  fail: (message) =>
    set({ isProcessing: false, errorMessage: message, currentOperation: 'Error' }),

  reset: () =>
    set({
      isProcessing: false,
      fraction: 0,
      completedCount: 0,
      totalCount: 0,
      currentOperation: '',
      summary: null,
      errorMessage: null
    }),

  cancel: () => {
    void api.cancelBatch()
  }
}))

/** Helper used by the toolbar to kick off a batch over the given requests. */
export async function runBatch(requests: ProcessImageRequest[]): Promise<void> {
  const store = useProcessingStore.getState()
  if (requests.length === 0 || store.isProcessing) return
  store.begin(requests.length)
  try {
    const summary = await api.processBatch(requests, 2)
    // The batch:completed event also calls finish(); calling again is harmless
    // and guarantees a terminal state if the event was missed.
    useProcessingStore.getState().finish(summary)
  } catch (err) {
    useProcessingStore.getState().fail(err instanceof Error ? err.message : String(err))
  }
}
