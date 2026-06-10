import React from 'react'
import { X, ImageOff } from 'lucide-react'
import type { ImageItem, ImageStatus } from '../types/image'
import { formatBytes, formatDimensions, sizeDeltaLabel } from '../lib/formatBytes'

const STATUS_STYLES: Record<ImageStatus, string> = {
  pending: 'bg-fill text-muted',
  processing: 'bg-info-soft text-info animate-pulse',
  done: 'bg-ok-soft text-ok',
  error: 'bg-danger-soft text-danger',
  skipped: 'bg-warn-soft text-warn'
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
          ? 'border-accent bg-accent-soft'
          : 'border-transparent bg-panel-2 hover:bg-panel-3'
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
          <ImageOff size={18} className="text-subtle" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm font-medium text-fg" title={item.fileName}>
            {item.fileName}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
            className="opacity-0 transition-opacity group-hover:opacity-100 text-subtle hover:text-danger"
            title="Remove"
          >
            <X size={15} />
          </button>
        </div>

        <div className="mt-0.5 text-[11px] text-subtle">
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
            <span className="text-[10px] text-muted">
              → {formatBytes(item.outputSizeBytes)}
              {delta && <span className="ml-1 text-ok">{delta}</span>}
            </span>
          )}
        </div>

        {item.error && (
          <div className="mt-1 truncate text-[10px] text-danger" title={item.error}>
            {item.error}
          </div>
        )}
        {item.warning && !item.error && (
          <div className="mt-1 truncate text-[10px] text-warn" title={item.warning}>
            {item.warning}
          </div>
        )}
      </div>
    </div>
  )
}
