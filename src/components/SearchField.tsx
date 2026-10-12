import { useEffect, useRef, useState } from 'react'
import { Field, Input } from './ui'

interface Option {
  value: string
  label: string
}

interface Props {
  label: string
  onSearch: (q: string) => Promise<Option[]>
  onSelect: (value: string | null) => void
  /** Increment to clear the field externally */
  resetKey?: number
}

/** Debounced autocomplete. Emits the selected option value, or null when cleared/edited. */
export function SearchField({ label, onSearch, onSelect, resetKey }: Props) {
  const [text, setText] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    setText('')
    setOptions([])
    setSelected(false)
  }, [resetKey])

  const change = (v: string) => {
    setText(v)
    if (selected) {
      setSelected(false)
      onSelect(null)
    }
    clearTimeout(timer.current)
    if (!v.trim()) {
      setOptions([])
      setOpen(false)
      return
    }
    timer.current = setTimeout(async () => {
      try {
        setOptions(await onSearch(v.trim()))
        setOpen(true)
      } catch {
        setOptions([])
        setOpen(false)
      }
    }, 300)
  }

  return (
    <div className="relative">
      <Field label={label}>
        <Input value={text} onChange={(e) => change(e.target.value)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Buscar…" />
      </Field>
      {open && options.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 text-sm shadow-lg">
          {options.map((o) => (
            <li
              key={o.value}
              className="cursor-pointer px-3 py-1.5 hover:bg-brand-50"
              onMouseDown={() => {
                setText(o.label)
                setSelected(true)
                setOpen(false)
                onSelect(o.value)
              }}
            >
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export const userOptions = (list: Record<string, any>[]): Option[] =>
  list.map((u) => {
    const name = `${u.name ?? ''} ${u.lastname ?? ''}`.trim()
    return { value: String(u.externalId), label: name ? `#${u.externalId} — ${name}` : `#${u.externalId}` }
  })

export const codeOptions = (list: Record<string, any>[]): Option[] =>
  list.map((u) => ({ value: String(u.code), label: String(u.code) }))
