/**
 * Theme controller. Resolves the chosen mode (system follows the OS via
 * prefers-color-scheme) into a concrete light/dark class on <html>, and keeps
 * it in sync when the OS theme changes while in "system" mode.
 */
import type { ThemeMode } from '../types/image'

const DARK_QUERY = '(prefers-color-scheme: dark)'

export type ResolvedTheme = 'light' | 'dark'

export function systemTheme(): ResolvedTheme {
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light'
}

export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  return mode === 'system' ? systemTheme() : mode
}

export function applyTheme(mode: ThemeMode): void {
  const resolved = resolveTheme(mode)
  const html = document.documentElement
  html.classList.toggle('theme-dark', resolved === 'dark')
  html.classList.toggle('theme-light', resolved === 'light')
}

/**
 * Apply the theme now and, when in "system" mode, re-apply on OS changes.
 * Returns an unsubscribe function.
 */
export function watchTheme(mode: ThemeMode): () => void {
  applyTheme(mode)
  if (mode !== 'system') return () => {}

  const mq = window.matchMedia(DARK_QUERY)
  const handler = (): void => applyTheme('system')
  mq.addEventListener('change', handler)
  return () => mq.removeEventListener('change', handler)
}
