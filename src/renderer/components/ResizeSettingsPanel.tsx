import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { resizeFieldErrors } from '../lib/validation'
import { Field, NumberInput, Panel, Select, Toggle } from './ui'
import type { ResizeMode } from '../types/image'

const MODE_OPTIONS: { value: ResizeMode; label: string }[] = [
  { value: 'none', label: 'None (keep original size)' },
  { value: 'fit', label: 'Fit within box' },
  { value: 'fill-crop', label: 'Fill & crop to box' },
  { value: 'exact', label: 'Exact (stretch)' },
  { value: 'width', label: 'Width only' },
  { value: 'height', label: 'Height only' },
  { value: 'percentage', label: 'Percentage' }
]

export function ResizeSettingsPanel(): React.JSX.Element {
  const resize = useSettingsStore((s) => s.resize)
  const setResize = useSettingsStore((s) => s.setResize)

  const needsWidth = ['fit', 'fill-crop', 'exact', 'width'].includes(resize.mode)
  const needsHeight = ['fit', 'fill-crop', 'exact', 'height'].includes(resize.mode)
  const needsPercentage = resize.mode === 'percentage'
  const disabled = !resize.enabled
  const errors = resizeFieldErrors(resize)

  return (
    <Panel
      title="Resize"
      right={
        <Toggle
          label=""
          checked={resize.enabled}
          onChange={(v) => setResize({ enabled: v })}
        />
      }
    >
      <Field label="Mode">
        <Select
          value={resize.mode}
          disabled={disabled}
          onChange={(mode) => setResize({ mode })}
          options={MODE_OPTIONS}
        />
      </Field>

      {(needsWidth || needsHeight) && (
        <div className="grid grid-cols-2 gap-2">
          {needsWidth && (
            <Field label="Width" hint="px">
              <NumberInput
                value={resize.width}
                disabled={disabled}
                min={1}
                onChange={(v) => setResize({ width: v })}
              />
            </Field>
          )}
          {needsHeight && (
            <Field label="Height" hint="px">
              <NumberInput
                value={resize.height}
                disabled={disabled}
                min={1}
                onChange={(v) => setResize({ height: v })}
              />
            </Field>
          )}
        </div>
      )}

      {needsPercentage && (
        <Field label="Scale" hint="%">
          <NumberInput
            value={resize.percentage}
            disabled={disabled}
            min={1}
            max={1000}
            onChange={(v) => setResize({ percentage: v })}
          />
        </Field>
      )}

      <div className="space-y-1 pt-1">
        <Toggle
          label="Prevent upscaling"
          checked={resize.preventUpscale}
          onChange={(v) => setResize({ preventUpscale: v })}
        />
        <Toggle
          label="Preserve aspect ratio"
          checked={resize.preserveAspectRatio}
          onChange={(v) => setResize({ preserveAspectRatio: v })}
        />
      </div>

      {!disabled &&
        errors.map((e) => (
          <p key={e} className="text-[11px] text-amber-300">
            {e}
          </p>
        ))}
    </Panel>
  )
}
