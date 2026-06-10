import React from 'react'
import { Images } from 'lucide-react'
import { useImageQueueStore } from '../stores/imageQueueStore'
import { ImageQueueItem } from './ImageQueueItem'

export function ImageQueue(): React.JSX.Element {
  const items = useImageQueueStore((s) => s.items)
  const selectedId = useImageQueueStore((s) => s.selectedId)
  const selectImage = useImageQueueStore((s) => s.selectImage)
  const removeImage = useImageQueueStore((s) => s.removeImage)

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-white/60">
          Queue
        </h2>
        <span className="text-xs text-white/40">{items.length} image(s)</span>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 p-6 text-center text-white/40">
          <Images size={32} className="text-white/25" />
          <p className="text-sm">No images yet</p>
          <p className="text-xs">Drag &amp; drop images here, or use Import.</p>
        </div>
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto p-2">
          {items.map((item) => (
            <ImageQueueItem
              key={item.id}
              item={item}
              selected={item.id === selectedId}
              onSelect={() => selectImage(item.id)}
              onRemove={() => removeImage(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
