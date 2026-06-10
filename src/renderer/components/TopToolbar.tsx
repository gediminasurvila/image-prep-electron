import React from 'react'
import { FilePlus2, FolderPlus, Trash2, FolderOutput, Download, DownloadCloud } from 'lucide-react'
import { useImageQueueStore } from '../stores/imageQueueStore'
import { useSettingsStore } from '../stores/settingsStore'
import { runBatch, useProcessingStore } from '../stores/processingStore'
import { api } from '../lib/electronApi'
import { buildProcessRequest, exportReadiness } from '../lib/validation'
import { ToolbarButton } from './ui'

export function TopToolbar(): React.JSX.Element {
  const importPaths = useImageQueueStore((s) => s.importPaths)
  const clearQueue = useImageQueueStore((s) => s.clearQueue)
  const resetStatuses = useImageQueueStore((s) => s.resetStatuses)
  const items = useImageQueueStore((s) => s.items)
  const selectedId = useImageQueueStore((s) => s.selectedId)

  const getAppSettings = useSettingsStore((s) => s.getAppSettings)
  const settings = useSettingsStore((s) => ({
    resize: s.resize,
    enhancement: s.enhancement,
    export: s.export,
    selectedPresetId: s.selectedPresetId
  }))
  const setExport = useSettingsStore((s) => s.setExport)

  const isProcessing = useProcessingStore((s) => s.isProcessing)

  const readiness = exportReadiness(settings)
  const hasImages = items.length > 0
  const selected = items.find((i) => i.id === selectedId) ?? null

  const handleImportImages = async (): Promise<void> => {
    const paths = await api.selectImages()
    await importPaths(paths)
  }

  const handleImportFolder = async (): Promise<void> => {
    const paths = await api.selectFolderImages()
    await importPaths(paths)
  }

  const handleSelectOutput = async (): Promise<void> => {
    const folder = await api.selectOutputFolder()
    if (folder) setExport({ outputFolder: folder })
  }

  const exportSelected = async (): Promise<void> => {
    if (!selected) return
    resetStatuses()
    await runBatch([buildProcessRequest(selected, getAppSettings())])
  }

  const exportAll = async (): Promise<void> => {
    resetStatuses()
    const requests = items
      .filter((i) => i.originalWidth > 0) // skip un-probed/broken imports
      .map((i) => buildProcessRequest(i, getAppSettings()))
    await runBatch(requests)
  }

  const exportDisabled = isProcessing || !readiness.ok

  return (
    <div className="flex items-center gap-2 border-b border-white/5 bg-panel px-3 py-2">
      <div className="flex items-center gap-2 pr-2">
        <span className="select-none text-sm font-semibold tracking-tight text-white/90">
          Image<span className="text-accent">Prep</span>
        </span>
      </div>

      <div className="h-5 w-px bg-white/10" />

      <ToolbarButton onClick={handleImportImages} disabled={isProcessing} title="Import images">
        <FilePlus2 size={15} /> Import
      </ToolbarButton>
      <ToolbarButton onClick={handleImportFolder} disabled={isProcessing} title="Import a folder">
        <FolderPlus size={15} /> Folder
      </ToolbarButton>
      <ToolbarButton
        onClick={clearQueue}
        disabled={isProcessing || !hasImages}
        variant="danger"
        title="Clear the queue"
      >
        <Trash2 size={15} /> Clear
      </ToolbarButton>

      <div className="h-5 w-px bg-white/10" />

      <ToolbarButton onClick={handleSelectOutput} title="Choose output folder">
        <FolderOutput size={15} /> Output
      </ToolbarButton>

      <div className="ml-auto flex items-center gap-2">
        {!readiness.ok && (
          <span className="text-[11px] text-amber-300" title={readiness.reasons.join('\n')}>
            {readiness.reasons[0]}
          </span>
        )}
        <ToolbarButton
          onClick={exportSelected}
          disabled={exportDisabled || !selected}
          title="Export the selected image"
        >
          <Download size={15} /> Export Selected
        </ToolbarButton>
        <ToolbarButton
          onClick={exportAll}
          disabled={exportDisabled || !hasImages}
          variant="primary"
          title="Export all images"
        >
          <DownloadCloud size={15} /> Export All
        </ToolbarButton>
      </div>
    </div>
  )
}
