import React from 'react'
import { Folder } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { api } from '../lib/electronApi'
import { Field, NumberInput, Panel, Select, Slider, TextInput, Toggle } from './ui'
import type { ConflictMode, ExportFormat } from '../types/image'

const CONFLICT_OPTIONS: { value: ConflictMode; label: string }[] = [
  { value: 'rename', label: 'Rename (-1, -2, …)' },
  { value: 'overwrite', label: 'Overwrite' },
  { value: 'skip', label: 'Skip existing' }
]

export function ExportSettingsPanel(): React.JSX.Element {
  const exp = useSettingsStore((s) => s.export)
  const setExport = useSettingsStore((s) => s.setExport)
  const avifSupported = useSettingsStore((s) => s.avifSupported)

  const formatOptions: { value: ExportFormat; label: string; disabled?: boolean }[] = [
    { value: 'auto', label: 'Auto (recommended)' },
    { value: 'jpeg', label: 'JPEG' },
    { value: 'png', label: 'PNG' },
    { value: 'webp', label: 'WebP' },
    { value: 'avif', label: avifSupported ? 'AVIF' : 'AVIF (unavailable)', disabled: !avifSupported }
  ]

  const isPng = exp.format === 'png'
  const targetActive = exp.useTargetFileSize && !isPng

  const chooseFolder = async (): Promise<void> => {
    const folder = await api.selectOutputFolder()
    if (folder) setExport({ outputFolder: folder })
  }

  return (
    <Panel title="Export">
      <Field label="Output folder">
        <div className="flex gap-2">
          <div
            className="flex-1 truncate rounded-md border border-line bg-panel px-2 py-1.5 text-xs text-muted"
            title={exp.outputFolder || 'No folder selected'}
          >
            {exp.outputFolder || 'No folder selected'}
          </div>
          <button
            type="button"
            onClick={chooseFolder}
            className="inline-flex items-center gap-1 rounded-md border border-line bg-panel-3 px-2 text-xs hover:bg-fill"
          >
            <Folder size={14} /> Choose
          </button>
        </div>
      </Field>

      <Field label="Format">
        <Select
          value={exp.format}
          onChange={(format) => setExport({ format })}
          options={formatOptions}
        />
      </Field>

      {exp.format === 'auto' && (
        <p className="text-[11px] leading-snug text-subtle">
          Picks <span className="text-fg">WebP</span> — best size &amp; quality for the web, and
          keeps transparency from PNGs.
        </p>
      )}
      {exp.format === 'jpeg' && (
        <p className="text-[11px] leading-snug text-warn">
          JPEG has no transparency — transparent images are flattened onto white.
        </p>
      )}

      <Toggle
        label="Target file size mode"
        checked={exp.useTargetFileSize}
        onChange={(v) => setExport({ useTargetFileSize: v })}
      />

      {targetActive ? (
        <Field label="Target size" hint="KB">
          <NumberInput
            value={exp.targetFileSizeKb}
            min={1}
            onChange={(v) => setExport({ targetFileSizeKb: v })}
          />
        </Field>
      ) : (
        <Field label="Quality" hint={String(exp.quality)}>
          <Slider
            value={exp.quality}
            min={1}
            max={100}
            step={1}
            onChange={(v) => setExport({ quality: v })}
          />
        </Field>
      )}

      {exp.useTargetFileSize && isPng && (
        <p className="text-[11px] text-warn">
          Target size mode applies to JPEG/WebP/AVIF. PNG will be exported losslessly.
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Field label="Filename prefix">
          <TextInput value={exp.filenamePrefix} onChange={(v) => setExport({ filenamePrefix: v })} />
        </Field>
        <Field label="Filename suffix">
          <TextInput value={exp.filenameSuffix} onChange={(v) => setExport({ filenameSuffix: v })} />
        </Field>
      </div>

      <Field label="If file exists">
        <Select
          value={exp.conflictMode}
          onChange={(conflictMode) => setExport({ conflictMode })}
          options={CONFLICT_OPTIONS}
        />
      </Field>

      <div className="border-t border-line pt-2">
        <Toggle
          label="Strip metadata"
          checked={exp.stripMetadata}
          onChange={(v) => setExport({ stripMetadata: v })}
        />
        <Toggle
          label="Convert to sRGB"
          checked={exp.convertToSrgb}
          onChange={(v) => setExport({ convertToSrgb: v })}
        />
      </div>
    </Panel>
  )
}
