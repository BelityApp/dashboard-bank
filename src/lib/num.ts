/** API returns decimals as strings in some endpoints; normalize. */
export const num = (v: unknown, fallback = 0): number => {
  if (typeof v === 'number') return v
  if (v === null || v === undefined || v === '') return fallback
  const n = Number(v)
  return Number.isNaN(n) ? fallback : n
}
export const numOrNull = (v: unknown): number | null =>
  v === null || v === undefined ? null : num(v)
