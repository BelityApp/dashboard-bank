import { request } from './http'
import type { BookingSummary } from './types'

// GET /bookings/recent?limit=
export const getRecentBookings = (limit = 50) =>
  request<BookingSummary[]>('/bookings/recent', { query: { limit } })

// GET /bookings/search?q=   (404 => sin resultados)
export const searchBookings = async (q: string) => {
  try {
    return await request<BookingSummary[]>('/bookings/search', { query: { q } })
  } catch (e) {
    if ((e as { status?: number }).status === 404) return []
    throw e
  }
}
