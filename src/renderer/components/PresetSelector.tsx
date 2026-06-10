import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { DEFAULT_PRESETS } from '../lib/presets'
import { Panel } from './ui'

export function PresetSelector(): React.JSX.Element {
  const selectedPresetId = useSettingsStore((s) => s.selectedPresetId)
  const applyPreset = useSettingsStore((s) => s.applyPreset)
  const clearPreset = useSettingsStore((s) => s.clearPreset)

  const isCustom = !selectedPresetId

  return (
    <Panel title="Preset">
      <div className="grid grid-cols-1 gap-1.5">
        <button
          type="button"
          onClick={clearPreset}
          className={`rounded-md border px-3 py-2 text-left transition-colors ${
            isCustom
              ? 'border-accent bg-accent-soft'
              : 'border-line bg-panel hover:bg-panel-3'
          }`}
        >
          <div className="text-sm font-medium text-fg">Custom (no preset)</div>
          <div className="mt-0.5 text-[11px] leading-snug text-subtle">
            Tune resize, enhancement, and export yourself — reduce by %, set max
            dimensions, or a max file size.
          </div>
        </button>

        {DEFAULT_PRESETS.map((preset) => {
          const active = preset.id === selectedPresetId
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                active
                  ? 'border-accent bg-accent-soft'
                  : 'border-line bg-panel hover:bg-panel-3'
              }`}
            >
              <div className="text-sm font-medium text-fg">{preset.name}</div>
              {preset.description && (
                <div className="mt-0.5 text-[11px] leading-snug text-subtle">
                  {preset.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-subtle">
        Applying a preset keeps your output folder and naming; it overrides size, format, and
        enhancement.
      </p>
    </Panel>
  )
}
