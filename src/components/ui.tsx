import { useEffect, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'

const cx = (...c: (string | false | undefined)[]) => c.filter(Boolean).join(' ')

export function Button({
  variant = 'primary',
  className,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' | 'ghost' }) {
  const styles = {
    primary: 'bg-brand-600 text-white hover:bg-brand-700',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-red-600 text-white hover:bg-red-700',
    ghost: 'text-brand-700 hover:bg-brand-50',
  }[variant]
  return (
    <button
      {...p}
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50',
        styles,
        className,
      )}
    />
  )
}

const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:bg-slate-100'

export function Field({
  label,
  hint,
  children,
  className,
}: {
  label: string
  hint?: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={cx('block', className)}>
      <span className="mb-1 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  )
}

export const Input = (p: InputHTMLAttributes<HTMLInputElement>) => (
  <input {...p} className={cx(inputCls, p.className)} />
)
export const Select = (p: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select {...p} className={cx(inputCls, p.className)} />
)
export const Textarea = (p: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea {...p} className={cx(inputCls, p.className)} />
)

export function Modal({
  title,
  onClose,
  children,
  wide,
}: {
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4" onMouseDown={onClose}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className={cx('max-h-[90vh] w-full overflow-y-auto rounded-xl bg-white p-6 shadow-xl', wide ? 'max-w-2xl' : 'max-w-md')}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700" aria-label="Cerrar">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

const tones: Record<string, string> = {
  green: 'bg-emerald-100 text-emerald-700',
  yellow: 'bg-amber-100 text-amber-700',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  gray: 'bg-slate-100 text-slate-600',
  purple: 'bg-brand-100 text-brand-700',
}
export const Badge = ({ tone = 'gray', children }: { tone?: keyof typeof tones; children: ReactNode }) => (
  <span className={cx('inline-block rounded-full px-2 py-0.5 text-xs font-medium', tones[tone])}>{children}</span>
)

export const statusTone = (s: string) =>
  ({
    COMPLETED: 'green', PAID: 'green', APPLIED: 'green',
    PENDING: 'yellow',
    EXPIRED: 'gray',
    CANCELED: 'red',
  })[s] ?? 'gray'

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-slate-400">{sub}</div>}
    </div>
  )
}

export const Card = ({ children, className }: { children: ReactNode; className?: string }) => (
  <div className={cx('rounded-xl border border-slate-200 bg-white p-4 shadow-sm', className)}>{children}</div>
)

export const PageHeader = ({ title, actions }: { title: string; actions?: ReactNode }) => (
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <h1 className="text-2xl font-semibold">{title}</h1>
    <div className="flex flex-wrap gap-2">{actions}</div>
  </div>
)

export const Spinner = () => (
  <div className="flex justify-center p-8">
    <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent" />
  </div>
)

export const ErrorBox = ({ error }: { error: unknown }) =>
  error ? (
    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
      {error instanceof Error ? error.message : String(error)}
    </div>
  ) : null

export const SuccessBox = ({ children }: { children: ReactNode }) => (
  <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{children}</div>
)

export function Table({ head, children, empty }: { head: string[]; children: ReactNode; empty?: boolean }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-slate-200 text-sm">
        <thead className="bg-slate-50">
          <tr>
            {head.map((h) => (
              <th key={h} className="whitespace-nowrap px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {children}
          {empty && (
            <tr>
              <td colSpan={head.length} className="px-3 py-8 text-center text-slate-400">
                Sin resultados
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cx('whitespace-nowrap px-3 py-2.5', className)}>{children}</td>
)

export function Pagination({
  page,
  totalPages,
  total,
  limit,
  onPage,
  onLimit,
}: {
  page: number
  totalPages: number
  total: number
  limit: number
  onPage: (p: number) => void
  onLimit?: (l: number) => void
}) {
  return (
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
      <span>
        {total} resultados · Página {page} de {Math.max(totalPages, 1)}
      </span>
      <div className="flex items-center gap-2">
        {onLimit && (
          <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded-lg border border-slate-300 px-2 py-1">
            {[10, 20, 50, 100].map((n) => (
              <option key={n} value={n}>{n} / pág.</option>
            ))}
          </select>
        )}
        <Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button>
        <Button variant="secondary" disabled={page >= totalPages} onClick={() => onPage(page + 1)}>Siguiente</Button>
      </div>
    </div>
  )
}

export const Tabs = <T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: { id: T; label: string }[]
  value: T
  onChange: (t: T) => void
}) => (
  <div className="mb-4 flex gap-1 border-b border-slate-200">
    {tabs.map((t) => (
      <button
        key={t.id}
        onClick={() => onChange(t.id)}
        className={cx(
          '-mb-px border-b-2 px-4 py-2 text-sm font-medium',
          value === t.id ? 'border-brand-600 text-brand-700' : 'border-transparent text-slate-500 hover:text-slate-800',
        )}
      >
        {t.label}
      </button>
    ))}
  </div>
)

export const FilterBar = ({ children, onApply, onClear }: { children: ReactNode; onApply: () => void; onClear: () => void }) => (
  <form
    onSubmit={(e) => {
      e.preventDefault()
      onApply()
    }}
    className="mb-4 grid grid-cols-1 gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-4"
  >
    {children}
    <div className="flex items-end gap-2">
      <Button type="submit">Buscar</Button>
      <Button type="button" variant="secondary" onClick={onClear}>Limpiar</Button>
    </div>
  </form>
)
