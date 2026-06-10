import React from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { Field, Panel, Select, Slider, Toggle } from './ui'
import type { AutoEnhanceStrength } from '../types/image'

const STRENGTH_OPTIONS: { value: AutoEnhanceStrength; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' }
]

export function EnhancementSettingsPanel(): React.JSX.Element {
  const enhancement = useSettingsStore((s) => s.enhancement)
  const setEnhancement = useSettingsStore((s) => s.setEnhancement)
  const setStrength = useSettingsStore((s) => s.setAutoEnhanceStrength)

  const disabled = !enhancement.autoEnhance

  return (
    <Panel
      title="Enhancement"
      right={
        <Toggle
          label=""
          checked={enhancement.autoEnhance}
          onChange={(v) => setEnhancement({ autoEnhance: v })}
        />
      }
    >
      <Field label="Auto-enhance strength">
        <Select
          value={enhancement.autoEnhanceStrength}
          disabled={disabled}
          onChange={(v) => setStrength(v)}
          options={STRENGTH_OPTIONS}
        />
      </Field>

      <Toggle
        label="Auto levels (normalize)"
        checked={enhancement.autoLevels}
        onChange={(v) => setEnhancement({ autoLevels: v })}
      />

      <Field label="Gamma" hint={enhancement.gamma.toFixed(2)}>
        <Slider
          value={enhancement.gamma}
          min={1}
          max={3}
          step={0.01}
          disabled={disabled}
          onChange={(v) => setEnhancement({ gamma: v })}
        />
      </Field>

      <Field label="Contrast" hint={enhancement.contrast.toFixed(2)}>
        <Slider
          value={enhancement.contrast}
          min={0.5}
          max={2}
          step={0.01}
          disabled={disabled}
          onChange={(v) => setEnhancement({ contrast: v })}
        />
      </Field>

      <Field label="Saturation" hint={enhancement.saturation.toFixed(2)}>
        <Slider
          value={enhancement.saturation}
          min={0}
          max={2}
          step={0.01}
          disabled={disabled}
          onChange={(v) => setEnhancement({ saturation: v })}
        />
      </Field>

      <div className="border-t border-white/5 pt-2">
        <Toggle
          label="Sharpen after resize"
          checked={enhancement.sharpen}
          onChange={(v) => setEnhancement({ sharpen: v })}
        />
        <div className="mt-2">
          <Field label="Sharpen amount" hint={enhancement.sharpenSigma.toFixed(2)}>
            <Slider
              value={enhancement.sharpenSigma}
              min={0.3}
              max={3}
              step={0.1}
              disabled={!enhancement.sharpen}
              onChange={(v) => setEnhancement({ sharpenSigma: v })}
            />
          </Field>
        </div>
      </div>
    </Panel>
  )
}
