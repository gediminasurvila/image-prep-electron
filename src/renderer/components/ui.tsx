/**
 * Small, dependency-free UI primitives shared across the settings panels.
 * Keeping these here lets each panel stay focused on its own settings.
 */
import React from 'react'

export function Panel({
  title,
  children,
  right
}: {
  title: string
  children: React.ReactNode
  right?: React.ReactNode
}): React.JSX.Element {
  return (
    <section className="rounded-lg border border-line bg-panel-2">
      <header className="flex items-center justify-between px-3 py-2 border-b border-line">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</h3>
        {right}
      </header>
      <div className="p-3 space-y-3">{children}</div>
    </section>
  )
}

export function Field({
  label,
  hint,
  children
}: {
  label: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <label className="block">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-muted">{label}</span>
        {hint && <span className="text-[10px] text-subtle">{hint}</span>}
      </div>
      {children}
    </label>
  )
}

export function NumberInput({
  value,
  onChange,
  min,
  max,
  step = 1,
  disabled,
  placeholder
}: {
  value: number | undefined
  onChange: (v: number | undefined) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  placeholder?: string
}): React.JSX.Element {
  return (
    <input
      type="number"
      className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-40"
      value={value ?? ''}
      min={min}
      max={max}
      step={step}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value
        onChange(raw === '' ? undefined : Number(raw))
      }}
    />
  )
}

export function TextInput({
  value,
  onChange,
  disabled,
  placeholder
}: {
  value: string
  onChange: (v: string) => void
  disabled?: boolean
  placeholder?: string
}): React.JSX.Element {
  return (
    <input
      type="text"
      className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-40"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
    />
  )
}

export function Select<T extends string>({
  value,
  onChange,
  options,
  disabled
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; disabled?: boolean }[]
  disabled?: boolean
}): React.JSX.Element {
  return (
    <select
      className="w-full rounded-md border border-line bg-panel px-2 py-1.5 text-sm outline-none focus:border-accent disabled:opacity-40"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as T)}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value} disabled={o.disabled}>
          {o.label}
        </option>
      ))}
    </select>
  )
}

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}): React.JSX.Element {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-0.5">
      <span className="text-xs text-fg">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
          checked ? 'bg-accent' : 'bg-fill-strong'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow-sm transition-all ${
            checked ? 'left-4' : 'left-0.5'
          }`}
        />
      </button>
    </label>
  )
}

export function Slider({
  value,
  onChange,
  min,
  max,
  step,
  disabled,
  suffix
}: {
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step: number
  disabled?: boolean
  suffix?: string
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        className="h-1.5 w-full accent-accent disabled:opacity-40"
        value={value}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className="w-12 shrink-0 text-right text-xs tabular-nums text-muted">
        {value}
        {suffix ?? ''}
      </span>
    </div>
  )
}

export function ToolbarButton({
  onClick,
  disabled,
  children,
  variant = 'default',
  title
}: {
  onClick: () => void
  disabled?: boolean
  children: React.ReactNode
  variant?: 'default' | 'primary' | 'danger'
  title?: string
}): React.JSX.Element {
  const styles =
    variant === 'primary'
      ? 'bg-accent text-accent-fg hover:bg-accent-hover'
      : variant === 'danger'
        ? 'bg-transparent text-danger hover:bg-danger-soft border border-danger-border'
        : 'bg-panel-3 text-fg hover:bg-fill border border-line'
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${styles}`}
    >
      {children}
    </button>
  )
}
