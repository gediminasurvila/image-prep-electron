import React, { useEffect } from 'react'
import { AppShell } from './components/AppShell'
import { api } from './lib/electronApi'
import { useSettingsStore } from './stores/settingsStore'
import { useImageQueueStore } from './stores/imageQueueStore'
import { useProcessingStore } from './stores/processingStore'

export default function App(): React.JSX.Element {
  const hydrate = useSettingsStore((s) => s.hydrate)

  // Load persisted settings once on startup.
  useEffect(() => {
    void hydrate()
  }, [hydrate])

  // Wire IPC progress/result events to the stores. Each item-level result
  // updates the queue; batch progress drives the status bar.
  useEffect(() => {
    const queue = useImageQueueStore.getState()
    const processing = useProcessingStore.getState()

    const offProgress = api.onProgress((event) => {
      processing.onProgress(event)
      // Reflect the "processing" status immediately on the active item.
      if (event.status === 'processing') {
        queue.setStatus(event.imageId, 'processing')
      }
      if (event.result) {
        queue.applyResult(event.result)
      }
    })
    const offCompleted = api.onImageCompleted((result) => queue.applyResult(result))
    const offError = api.onImageError((result) => queue.applyResult(result))
    const offBatch = api.onBatchCompleted((summary) => processing.finish(summary))

    return () => {
      offProgress()
      offCompleted()
      offError()
      offBatch()
    }
  }, [])

  return <AppShell />
}
