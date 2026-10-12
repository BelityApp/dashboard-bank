export const money = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'USD' }).format(n)

export const dateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '—'

export const dateOnly = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString('es-MX', { dateStyle: 'medium' }) : '—'

export const startOfDayIso = (d: string) => (d ? `${d}T00:00:00.000Z` : undefined)
export const endOfDayIso = (d: string) => (d ? `${d}T23:59:59.999Z` : undefined)
export const toIso = (localDateTime: string) =>
  localDateTime ? new Date(localDateTime).toISOString() : undefined
export const toInt = (s: string) => (s.trim() === '' ? undefined : Number.parseInt(s, 10))
export const errMsg = (e: unknown) => (e instanceof Error ? e.message : String(e))
