import React, { useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { UploadCloud } from 'lucide-react'
import { TopToolbar } from './TopToolbar'
import { ImageQueue } from './ImageQueue'
import { PreviewPanel } from './PreviewPanel'
import { PresetSelector } from './PresetSelector'
import { ResizeSettingsPanel } from './ResizeSettingsPanel'
import { EnhancementSettingsPanel } from './EnhancementSettingsPanel'
import { ExportSettingsPanel } from './ExportSettingsPanel'
import { StatusBar } from './StatusBar'
import { useImageQueueStore } from '../stores/imageQueueStore'
import { api } from '../lib/electronApi'

export function AppShell(): React.JSX.Element {
  const importPaths = useImageQueueStore((s) => s.importPaths)

  const onDrop = useCallback(
    (files: File[]) => {
      // Resolve dropped File objects to absolute paths via the preload bridge.
      const paths = files.map((f) => api.pathForFile(f)).filter(Boolean)
      void importPaths(paths)
    },
    [importPaths]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true
  })

  return (
    <div {...getRootProps()} className="flex h-screen flex-col outline-none">
      <input {...getInputProps()} />
      <TopToolbar />

      <div className="flex min-h-0 flex-1">
        {/* LEFT: queue */}
        <aside className="w-[300px] shrink-0 border-r border-line bg-panel">
          <ImageQueue />
        </aside>

        {/* CENTER: preview */}
        <main className="min-w-0 flex-1 bg-panel-2">
          <PreviewPanel />
        </main>

        {/* RIGHT: settings */}
        <aside className="w-[340px] shrink-0 space-y-3 overflow-y-auto border-l border-line bg-panel p-3">
          <PresetSelector />
          <ResizeSettingsPanel />
          <EnhancementSettingsPanel />
          <ExportSettingsPanel />
        </aside>
      </div>

      <StatusBar />

      {isDragActive && (
        <div className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-accent-border bg-panel px-12 py-10 text-accent">
            <UploadCloud size={48} />
            <p className="text-lg font-semibold">Drop images to import</p>
          </div>
        </div>
      )}
    </div>
  )
}
