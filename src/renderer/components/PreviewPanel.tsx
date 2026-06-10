import React, { useCallback, useEffect, useRef, useState } from 'react'
import { RefreshCw, Image as ImageIcon, Loader2 } from 'lucide-react'
import { useImageQueueStore } from '../stores/imageQueueStore'
import { useSettingsStore } from '../stores/settingsStore'
import { api } from '../lib/electronApi'
import { buildProcessRequest } from '../lib/validation'
import { formatBytes, formatDimensions } from '../lib/formatBytes'
import type { AppSettings, ImageItem, ProcessImageRequest } from '../types/image'

type PreviewTab = 'original' | 'processed' | 'side-by-side'

interface ProcessedPreview {
  dataUrl: string
  width?: number
  height?: number
  sizeBytes?: number
  quality?: number
  warning?: string
}

const PREVIEW_DEBOUNCE_MS = 450

/** Build a request that disables all processing — used to render the original. */
function passthroughRequest(image: ImageItem, settings: AppSettings): ProcessImageRequest {
  return {
    image,
    resize: { ...settings.resize, enabled: false, mode: 'none' },
    // Manual mode with neutral values = no enhancement, so this shows the
    // untouched original.
    enhancement: {
      ...settings.enhancement,
      mode: 'manual',
      autoLevels: false,
      gamma: 1,
      contrast: 1,
      saturation: 1,
      sharpen: false
    },
    export: {
      ...settings.export,
      format: 'webp',
      quality: 90,
      useTargetFileSize: false
    }
  }
}

export function PreviewPanel(): React.JSX.Element {
  const selectedId = useImageQueueStore((s) => s.selectedId)
  const items = useImageQueueStore((s) => s.items)
  const setThumbnail = useImageQueueStore((s) => s.setThumbnail)
  const resize = useSettingsStore((s) => s.resize)
  const enhancement = useSettingsStore((s) => s.enhancement)
  const exportSettings = useSettingsStore((s) => s.export)
  const getAppSettings = useSettingsStore((s) => s.getAppSettings)

  const selected = items.find((i) => i.id === selectedId) ?? null

  const [tab, setTab] = useState<PreviewTab>('side-by-side')
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [processed, setProcessed] = useState<ProcessedPreview | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Track the image id each piece of preview belongs to, to avoid showing a
  // stale preview when the selection changes mid-request.
  const requestIdRef = useRef(0)

  const generateProcessed = useCallback(async () => {
    if (!selected) return
    const myRequest = ++requestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const req = buildProcessRequest(selected, getAppSettings())
      const result = await api.generatePreview(req)
      if (myRequest !== requestIdRef.current) return // superseded
      if (result.success && result.dataUrl) {
        setProcessed({
          dataUrl: result.dataUrl,
          width: result.outputWidth,
          height: result.outputHeight,
          sizeBytes: result.estimatedSizeBytes,
          quality: result.qualityUsed,
          warning: result.warning
        })
      } else {
        setError(result.error ?? 'Preview failed.')
        setProcessed(null)
      }
    } catch (err) {
      if (myRequest !== requestIdRef.current) return
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      if (myRequest === requestIdRef.current) setLoading(false)
    }
  }, [selected, getAppSettings])

  // Load the original (passthrough) preview once per selected image.
  useEffect(() => {
    let cancelled = false
    setOriginalUrl(null)
    setProcessed(null)
    setError(null)
    if (!selected) return
    void (async () => {
      const result = await api.generatePreview(passthroughRequest(selected, getAppSettings()))
      if (cancelled) return
      if (result.success && result.dataUrl) {
        setOriginalUrl(result.dataUrl)
        // Upgrade the queue thumbnail if it was missing.
        if (!selected.thumbnailDataUrl) setThumbnail(selected.id, result.dataUrl)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId])

  // Debounced auto-update of the processed preview when settings change.
  useEffect(() => {
    if (!selected) return
    const t = setTimeout(() => void generateProcessed(), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, resize, enhancement, exportSettings])

  if (!selected) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-subtle">
        <ImageIcon size={40} className="text-subtle" />
        <p className="text-sm">Select an image to preview</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tabs + action */}
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2">
        <div className="flex gap-1 rounded-md bg-panel p-0.5">
          {(['original', 'processed', 'side-by-side'] as PreviewTab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                tab === t ? 'bg-panel-3 text-fg' : 'text-muted hover:text-fg'
              }`}
            >
              {t.replace('-', ' ')}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => void generateProcessed()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-panel-3 px-3 py-1.5 text-xs font-medium hover:bg-fill disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Update preview
        </button>
      </div>

      {/* Image area — neutral gray so photos read truthfully */}
      <div className="flex flex-1 items-center justify-center overflow-auto bg-canvas p-4">
        {error ? (
          <div className="max-w-sm text-center text-sm text-danger">{error}</div>
        ) : tab === 'side-by-side' ? (
          <div className="grid h-full w-full grid-cols-2 gap-3">
            <PreviewImage label="Original" url={originalUrl} />
            <PreviewImage label="Processed" url={processed?.dataUrl ?? null} loading={loading} />
          </div>
        ) : tab === 'original' ? (
          <PreviewImage label="Original" url={originalUrl} big />
        ) : (
          <PreviewImage label="Processed" url={processed?.dataUrl ?? null} loading={loading} big />
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line px-4 py-3 text-xs sm:grid-cols-4">
        <Stat label="Original size" value={formatDimensions(selected.originalWidth, selected.originalHeight)} />
        <Stat
          label="Output size"
          value={formatDimensions(processed?.width, processed?.height) || '—'}
        />
        <Stat label="Original file" value={formatBytes(selected.originalSizeBytes)} />
        <Stat
          label="Est. output file"
          value={processed?.sizeBytes != null ? formatBytes(processed.sizeBytes) : '—'}
          accent
        />
      </div>
      {processed?.quality != null && (
        <div className="px-4 pb-2 text-[11px] text-subtle">
          Encoded at quality {processed.quality}
          {processed.warning && <span className="ml-2 text-warn">{processed.warning}</span>}
        </div>
      )}
    </div>
  )
}

function PreviewImage({
  url,
  label,
  loading,
  big
}: {
  url: string | null
  label: string
  loading?: boolean
  big?: boolean
}): React.JSX.Element {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-1 text-center text-[10px] uppercase tracking-wide text-subtle">
        {label}
      </div>
      <div className="checkerboard flex flex-1 items-center justify-center overflow-hidden rounded-lg border border-line">
        {url ? (
          <img
            src={url}
            alt={label}
            className={`${big ? 'max-h-full max-w-full' : 'max-h-full max-w-full'} object-contain`}
          />
        ) : (
          <div className="flex items-center gap-2 text-xs text-subtle">
            {loading ? (
              <>
                <Loader2 size={14} className="animate-spin" /> Rendering…
              </>
            ) : (
              'No preview yet'
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({
  label,
  value,
  accent
}: {
  label: string
  value: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-subtle">{label}</div>
      <div className={`text-sm font-medium ${accent ? 'text-ok' : 'text-fg'}`}>
        {value}
      </div>
    </div>
  )
}
