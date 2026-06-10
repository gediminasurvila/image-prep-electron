import React from 'react'
import { useImageQueueStore } from '../stores/imageQueueStore'
import { useProcessingStore } from '../stores/processingStore'

export function StatusBar(): React.JSX.Element {
  const items = useImageQueueStore((s) => s.items)
  const { isProcessing, fraction, currentOperation, cancel } = useProcessingStore()

  const total = items.length
  const completed = items.filter((i) => i.status === 'done').length
  const failed = items.filter((i) => i.status === 'error').length
  const skipped = items.filter((i) => i.status === 'skipped').length
  const pct = Math.round((isProcessing ? fraction : completed / Math.max(total, 1)) * 100)

  return (
    <div className="flex items-center gap-4 border-t border-line bg-panel px-4 py-2 text-xs">
      <div className="flex items-center gap-3">
        <Counter label="Total" value={total} />
        <Counter label="Done" value={completed} className="text-ok" />
        <Counter label="Failed" value={failed} className="text-danger" />
        <Counter label="Skipped" value={skipped} className="text-warn" />
      </div>

      <div className="flex flex-1 items-center gap-3">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-fill">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-10 text-right tabular-nums text-muted">{pct}%</span>
      </div>

      <div className="min-w-0 max-w-[40%] flex items-center gap-2">
        <span className="truncate text-muted" title={currentOperation}>
          {currentOperation || 'Idle'}
        </span>
        {isProcessing && (
          <button
            type="button"
            onClick={cancel}
            className="rounded border border-danger-border px-2 py-0.5 text-[11px] text-danger hover:bg-danger-soft"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}

function Counter({
  label,
  value,
  className
}: {
  label: string
  value: number
  className?: string
}): React.JSX.Element {
  return (
    <span className="text-subtle">
      {label}: <span className={`font-semibold tabular-nums ${className ?? 'text-fg'}`}>{value}</span>
    </span>
  )
}
