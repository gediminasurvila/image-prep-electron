import React from 'react'
import { Sparkles, SlidersHorizontal } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { Field, Panel, Slider, Toggle } from './ui'
import type { EnhancementMode } from '../types/image'

export function EnhancementSettingsPanel(): React.JSX.Element {
  const enhancement = useSettingsStore((s) => s.enhancement)
  const setEnhancement = useSettingsStore((s) => s.setEnhancement)
  const setMode = useSettingsStore((s) => s.setEnhancementMode)

  const isManual = enhancement.mode === 'manual'

  return (
    <Panel
      title="Enhancement"
      right={<ModeToggle mode={enhancement.mode} onChange={setMode} />}
    >
      {!isManual ? (
        <div className="rounded-md border border-accent-border bg-accent-soft p-3">
          <div className="flex items-center gap-2 text-sm font-medium text-fg">
            <Sparkles size={15} className="text-accent" />
            Auto correction is ON
          </div>
          <p className="mt-1 text-[11px] leading-snug text-muted">
            Each image is analyzed on its own and corrected for its specific
            issues — white-balance cast, low contrast, and under-exposure — then
            lightly sharpened. Switch to <span className="text-fg">Manual</span> to
            set values yourself.
          </p>
        </div>
      ) : (
        <>
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
              onChange={(v) => setEnhancement({ gamma: v })}
            />
          </Field>

          <Field label="Contrast" hint={enhancement.contrast.toFixed(2)}>
            <Slider
              value={enhancement.contrast}
              min={0.5}
              max={2}
              step={0.01}
              onChange={(v) => setEnhancement({ contrast: v })}
            />
          </Field>

          <Field label="Saturation" hint={enhancement.saturation.toFixed(2)}>
            <Slider
              value={enhancement.saturation}
              min={0}
              max={2}
              step={0.01}
              onChange={(v) => setEnhancement({ saturation: v })}
            />
          </Field>

          <div className="border-t border-line pt-2">
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
        </>
      )}
    </Panel>
  )
}

function ModeToggle({
  mode,
  onChange
}: {
  mode: EnhancementMode
  onChange: (m: EnhancementMode) => void
}): React.JSX.Element {
  return (
    <div className="flex gap-0.5 rounded-md bg-panel p-0.5 text-[11px] font-medium">
      <button
        type="button"
        onClick={() => onChange('auto')}
        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
          mode === 'auto' ? 'bg-accent text-accent-fg' : 'text-muted hover:text-fg'
        }`}
      >
        <Sparkles size={12} /> Auto
      </button>
      <button
        type="button"
        onClick={() => onChange('manual')}
        className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
          mode === 'manual' ? 'bg-panel-3 text-fg' : 'text-muted hover:text-fg'
        }`}
      >
        <SlidersHorizontal size={12} /> Manual
      </button>
    </div>
  )
}
