import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { DEFAULT_PRESETS } from '../lib/presets'
import { Panel } from './ui'

export function PresetSelector(): React.JSX.Element {
  const selectedPresetId = useSettingsStore((s) => s.selectedPresetId)
  const applyPreset = useSettingsStore((s) => s.applyPreset)

  return (
    <Panel title="Preset">
      <div className="grid grid-cols-1 gap-1.5">
        {DEFAULT_PRESETS.map((preset) => {
          const active = preset.id === selectedPresetId
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`rounded-md border px-3 py-2 text-left transition-colors ${
                active
                  ? 'border-accent bg-accent/15'
                  : 'border-white/5 bg-panel hover:bg-panel-3/60'
              }`}
            >
              <div className="text-sm font-medium text-white/90">{preset.name}</div>
              {preset.description && (
                <div className="mt-0.5 text-[11px] leading-snug text-white/50">
                  {preset.description}
                </div>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[11px] text-white/40">
        Applying a preset keeps your output folder and naming; it overrides size, format, and
        enhancement.
      </p>
    </Panel>
  )
}
