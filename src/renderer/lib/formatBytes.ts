export function formatBytes(bytes: number | undefined): string {
  if (bytes == null || !Number.isFinite(bytes) || bytes < 0) return '—'
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  const decimals = value >= 100 || i === 0 ? 0 : 1
  return `${value.toFixed(decimals)} ${units[i]}`
}

export function formatDimensions(w?: number, h?: number): string {
  if (!w || !h) return '—'
  return `${w} × ${h}`
}

/** Percentage change in size: negative = smaller (good). */
export function sizeDeltaLabel(original?: number, output?: number): string | null {
  if (!original || !output || original <= 0) return null
  const pct = Math.round((1 - output / original) * 100)
  if (pct > 0) return `−${pct}%`
  return `+${Math.abs(pct)}%`
}
