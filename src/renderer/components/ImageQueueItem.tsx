import React from 'react'
import { X, ImageOff } from 'lucide-react'
import type { ImageItem, ImageStatus } from '../types/image'
import { formatBytes, formatDimensions, sizeDeltaLabel } from '../lib/formatBytes'

const STATUS_STYLES: Record<ImageStatus, string> = {
  pending: 'bg-white/10 text-white/60',
  processing: 'bg-blue-500/20 text-blue-200 animate-pulse',
  done: 'bg-green-500/20 text-green-200',
  error: 'bg-red-500/20 text-red-200',
  skipped: 'bg-amber-500/20 text-amber-200'
}

export function ImageQueueItem({
  item,
  selected,
  onSelect,
  onRemove
}: {
  item: ImageItem
  selected: boolean
  onSelect: () => void
  onRemove: () => void
}): React.JSX.Element {
  const delta = sizeDeltaLabel(item.originalSizeBytes, item.outputSizeBytes)

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelect()}
      className={`group flex gap-2.5 rounded-lg border p-2 text-left transition-colors ${
        selected
          ? 'border-accent bg-accent/10'
          : 'border-transparent bg-panel-2 hover:bg-panel-3/50'
      }`}
    >
      <div className="checkerboard flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md bg-panel">
        {item.thumbnailDataUrl ? (
          <img
            src={item.thumbnailDataUrl}
            alt={item.fileName}
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageOff size={18} className="text-white/30" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-white/90" title={item.fileName}>
            {item.fileName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100 text-white/40 hover:text-red-300"
            title="Remove"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-0.5 text-[11px] text-white/50">
          {formatDimensions(item.originalWidth, item.originalHeight)} ·{' '}
          {formatBytes(item.originalSizeBytes)}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium capitalize ${STATUS_STYLES[item.status]}`}
          >
            {item.status}
          </span>
          {item.outputSizeBytes != null && (
            <span className="text-[10px] text-white/55">
              → {formatBytes(item.outputSizeBytes)}
              {delta && <span className="ml-1 text-green-300">{delta}</span>}
            </span>
          )}
        </div>

        {item.error && (
          <div className="mt-1 truncate text-[10px] text-red-300" title={item.error}>
            {item.error}
          </div>
        )}
        {item.warning && !item.error && (
          <div className="mt-1 truncate text-[10px] text-amber-300" title={item.warning}>
            {item.warning}
          </div>
        )}
      </div>
    </div>
  )
}
