/**
 * Main-process re-export of the shared presets. Kept as a separate module so
 * future work (user-defined presets persisted to disk) has a natural home here
 * without changing renderer imports.
 */
export { DEFAULT_PRESETS, findPreset } from '@shared/presets'
