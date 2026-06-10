import React from 'react'
import { Monitor, Sun, Moon } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import type { ThemeMode } from '../types/image'

const ORDER: ThemeMode[] = ['system', 'light', 'dark']
const ICONS: Record<ThemeMode, React.ReactNode> = {
  system: <Monitor size={15} />,
  light: <Sun size={15} />,
  dark: <Moon size={15} />
}
const LABELS: Record<ThemeMode, string> = {
  system: 'Theme: System',
  light: 'Theme: Light',
  dark: 'Theme: Dark'
}

/** Compact button that cycles System → Light → Dark. */
export function ThemeToggle(): React.JSX.Element {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const next = (): void => {
    const i = ORDER.indexOf(theme)
    setTheme(ORDER[(i + 1) % ORDER.length])
  }

  return (
    <button
      type="button"
      onClick={next}
      title={`${LABELS[theme]} (click to change)`}
      aria-label={LABELS[theme]}
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-panel-3 text-muted transition-colors hover:text-fg"
    >
      {ICONS[theme]}
    </button>
  )
}
