/**
 * Settings state (resize / enhancement / export / selected preset).
 *
 * - Hydrates from disk on startup via IPC.
 * - Persists changes back to disk (debounced) so the last-used settings and
 *   output folder are remembered between sessions.
 * - Applying a preset merges its partial settings over the current ones.
 */
import { create } from 'zustand'
import { api } from '../lib/electronApi'
import { applyStrengthPreset } from '../lib/presets'
import { findPreset } from '@shared/presets'
import {
  defaultEnhancementSettings,
  defaultExportSettings,
  defaultResizeSettings
} from '@shared/defaults'
import type {
  AppSettings,
  AutoEnhanceStrength,
  EnhancementSettings,
  ExportSettings,
  ResizeSettings
} from '../types/image'

interface SettingsState {
  resize: ResizeSettings
  enhancement: EnhancementSettings
  export: ExportSettings
  selectedPresetId: string | undefined
  hydrated: boolean
  avifSupported: boolean

  hydrate: () => Promise<void>
  setResize: (patch: Partial<ResizeSettings>) => void
  setEnhancement: (patch: Partial<EnhancementSettings>) => void
  setExport: (patch: Partial<ExportSettings>) => void
  setAutoEnhanceStrength: (strength: AutoEnhanceStrength) => void
  applyPreset: (id: string) => void
  getAppSettings: () => AppSettings
}

let saveTimer: ReturnType<typeof setTimeout> | null = null

function schedulePersist(getState: () => SettingsState): void {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    const s = getState()
    if (!s.hydrated) return
    void api.saveSettings(s.getAppSettings())
  }, 400)
}

export const useSettingsStore = create<SettingsState>((set, get) => {
  const persistAfter = (): void => schedulePersist(get)

  return {
    resize: defaultResizeSettings(),
    enhancement: defaultEnhancementSettings(),
    export: defaultExportSettings(),
    selectedPresetId: undefined,
    hydrated: false,
    avifSupported: true,

    hydrate: async () => {
      const [loaded, avifSupported] = await Promise.all([
        api.loadSettings(),
        api.isAvifSupported()
      ])
      set({
        resize: loaded.resize,
        enhancement: loaded.enhancement,
        export: loaded.export,
        selectedPresetId: loaded.selectedPresetId,
        avifSupported,
        hydrated: true
      })
    },

    setResize: (patch) => {
      // Manual edits clear the active preset highlight.
      set((s) => ({ resize: { ...s.resize, ...patch }, selectedPresetId: undefined }))
      persistAfter()
    },

    setEnhancement: (patch) => {
      set((s) => ({
        enhancement: { ...s.enhancement, ...patch },
        selectedPresetId: undefined
      }))
      persistAfter()
    },

    setExport: (patch) => {
      set((s) => ({ export: { ...s.export, ...patch }, selectedPresetId: undefined }))
      persistAfter()
    },

    setAutoEnhanceStrength: (strength) => {
      set((s) => ({
        enhancement: applyStrengthPreset(s.enhancement, strength),
        selectedPresetId: undefined
      }))
      persistAfter()
    },

    applyPreset: (id) => {
      const preset = findPreset(id)
      if (!preset) return
      set((s) => ({
        resize: { ...s.resize, ...preset.resize },
        enhancement: { ...s.enhancement, ...preset.enhancement },
        // Preserve the user's output folder + naming when applying a preset,
        // overriding only the fields the preset specifies (format/target/suffix).
        export: { ...s.export, ...preset.export },
        selectedPresetId: id
      }))
      persistAfter()
    },

    getAppSettings: () => {
      const s = get()
      return {
        resize: s.resize,
        enhancement: s.enhancement,
        export: s.export,
        selectedPresetId: s.selectedPresetId
      }
    }
  }
})
