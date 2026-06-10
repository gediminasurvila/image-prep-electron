/**
 * Persistent settings using electron-store (a small JSON file in userData).
 * Remembers the last output folder and the last-used resize/enhance/export
 * settings. All reads are validated against the Zod schema so a corrupted or
 * out-of-date file falls back to defaults instead of crashing.
 */
import Store from 'electron-store'
import { appSettingsSchema } from '@shared/schemas'
import { defaultAppSettings } from '@shared/defaults'
import type { AppSettings } from '@shared/types'

interface StoreShape {
  settings?: unknown
}

const store = new Store<StoreShape>({ name: 'imageprep-settings' })

export function loadSettings(): AppSettings {
  const raw = store.get('settings')
  const parsed = appSettingsSchema.safeParse(raw)
  if (parsed.success) {
    return parsed.data
  }
  return defaultAppSettings()
}

export function saveSettings(settings: AppSettings): AppSettings {
  // Validate before persisting so we never write malformed data.
  const parsed = appSettingsSchema.parse(settings)
  store.set('settings', parsed)
  return parsed
}
