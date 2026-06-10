import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { DEFAULT_PRESETS, findPreset } from '../lib/presets'
import { Panel } from './ui'

/**
 * Compact preset picker: a row of chips (Custom + the essential presets) plus a
 * single description line for the active choice. Far less vertical space than a
 * stack of description cards.
 */
export function PresetSelector(): React.JSX.Element {
  const selectedPresetId = useSettingsStore((s) => s.selectedPresetId)
  const applyPreset = useSettingsStore((s) => s.applyPreset)
  const clearPreset = useSettingsStore((s) => s.clearPreset)

  const isCustom = !selectedPresetId
  const active = findPreset(selectedPresetId)
  const description = isCustom
    ? 'Custom — tune resize, enhancement & export yourself (reduce by %, max dimensions, or max file size).'
    : active?.description

  return (
    <Panel title="Preset">
      <div className="flex flex-wrap gap-1.5">
        <Chip label="Custom" active={isCustom} onClick={clearPreset} />
        {DEFAULT_PRESETS.map((preset) => (
          <Chip
            key={preset.id}
            label={preset.name}
            active={preset.id === selectedPresetId}
            onClick={() => applyPreset(preset.id)}
          />
        ))}
      </div>
      {description && (
        <p className="text-[11px] leading-snug text-subtle">{description}</p>
      )}
    </Panel>
  )
}

function Chip({
  label,
  active,
  onClick
}: {
  label: string
  active: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'border-accent bg-accent text-accent-fg'
          : 'border-line bg-panel text-muted hover:bg-panel-3 hover:text-fg'
      }`}
    >
      {label}
    </button>
  )
}
