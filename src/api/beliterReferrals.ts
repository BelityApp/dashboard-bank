import { num } from '../lib/num'
import { request } from './http'
import type {
  BeliterConfig,
  BeliterConfigUpdate,
  BeliterPayout,
  BeliterPayoutSummary,
  BeliterReferral,
  BeliterReferralFilters,
  BeliterStats,
  Paginated,
} from './types'

const B = '/beliter-referrals/admin'

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapPayoutStatus = (s: string) => {
  const u = String(s).toUpperCase()
  return u === 'PAID' ? 'PAID' : u === 'CANCELED' || u === 'CANCELLED' ? 'CANCELED' : 'PENDING'
}
const mapRefStatus = (s: string) => {
  const u = String(s).toUpperCase()
  return u === 'COMPLETED' || u === 'EXPIRED' || u === 'CANCELED' ? u : 'PENDING'
}

const mapReferral = (j: any): BeliterReferral => ({
  id: j.id,
  status: mapRefStatus(j.status),
  referrerExternalId: num(j.referrerExternalId),
  referredExternalId: num(j.referredExternalId),
  code: j.code,
  createdAt: j.createdAt,
  completedAt: j.completedAt ?? null,
  expiresAt: j.expiresAt ?? null,
  commissionExpiresAt: j.commissionExpiresAt ?? null,
  payout: j.payout ? { amount: num(j.payout.amount), status: mapPayoutStatus(j.payout.status) } : null,
})

const mapPayout = (j: any): BeliterPayout => ({
  id: j.id,
  referrerExternalId: num(j.referrerExternalId),
  referredExternalId: num(j.referredExternalId),
  amount: num(j.amount),
  status: mapPayoutStatus(j.status),
  createdAt: j.createdAt,
  paidAt: j.paidAt ?? null,
  paidBy: j.paidBy ?? null,
  notes: j.notes ?? null,
})

const mapConfig = (j: any): BeliterConfig => ({
  id: j.id,
  referrerPayoutAmount: num(j.referrerPayoutAmount),
  referredSalonLevelId: num(j.referredSalonLevelId),
  referredCommissionDurationDays: num(j.referredCommissionDurationDays),
  referralExpirationDays: num(j.referralExpirationDays),
  maxReferralsPerUser: j.maxReferralsPerUser != null ? num(j.maxReferralsPerUser) : null,
  invitationMessage: j.invitationMessage ?? null,
  isActive: j.isActive,
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
})

const page = <R>(j: any, map: (x: any) => R): Paginated<R> => ({
  data: j.data.map(map),
  total: j.total,
  page: j.page,
  limit: j.limit,
  totalPages: j.totalPages,
})

// GET /beliter-referrals/admin/codes/search?q=
export const searchReferrers = (q: string) =>
  request<Record<string, any>[]>(`${B}/codes/search`, { query: { q } })
export const searchCodes = async (q: string) =>
  (await searchReferrers(q)).map((e) => e.code as string)

// GET /beliter-referrals/admin/config
export const getConfig = async () => mapConfig(await request<any>(`${B}/config`))

// PATCH /beliter-referrals/admin/config
export const updateConfig = async (f: BeliterConfigUpdate) =>
  mapConfig(await request<any>(`${B}/config`, { method: 'PATCH', body: f }))

// GET /beliter-referrals/admin/stats
export async function getStats(): Promise<BeliterStats> {
  const j = await request<any>(`${B}/stats`)
  return {
    totalReferrals: num(j.totalReferrals),
    completedReferrals: num(j.completedReferrals),
    pendingReferrals: num(j.pendingReferrals),
    expiredReferrals: num(j.expiredReferrals),
    conversionRate: num(j.conversionRate),
    totalPayoutsAmount: num(j.totalPayoutsAmount),
    pendingPayoutsAmount: num(j.pendingPayoutsAmount),
  }
}

// GET /beliter-referrals/admin
export const getReferrals = async (p: number, limit: number, f: BeliterReferralFilters = {}) =>
  page(await request<any>(B, { query: { page: p, limit, ...f } }), mapReferral)

// GET /beliter-referrals/admin/:id
export const getReferralById = async (id: string) => mapReferral(await request<any>(`${B}/${id}`))

// PATCH /beliter-referrals/admin/:id/cancel
export const cancelReferral = (id: string) => request<void>(`${B}/${id}/cancel`, { method: 'PATCH' })

// PATCH /beliter-referrals/admin/code/:userId/(de)activate
export const deactivateCode = (userId: number) =>
  request<void>(`${B}/code/${userId}/deactivate`, { method: 'PATCH' })
export const activateCode = (userId: number) =>
  request<void>(`${B}/code/${userId}/activate`, { method: 'PATCH' })

// GET /beliter-referrals/admin/payouts
export const getPayouts = async (
  p: number,
  limit: number,
  f: { status?: string; referrerId?: number } = {},
) => page(await request<any>(`${B}/payouts`, { query: { page: p, limit, ...f } }), mapPayout)

// GET /beliter-referrals/admin/payouts/pending-summary
export async function getPayoutsPendingSummary(): Promise<BeliterPayoutSummary[]> {
  const l = await request<any[]>(`${B}/payouts/pending-summary`)
  return l.map((e) => ({
    referrerExternalId: num(e.referrerExternalId),
    pendingCount: num(e.pendingCount),
    totalAmount: num(e.totalAmount),
  }))
}

// PATCH /beliter-referrals/admin/payouts/:id/mark-paid
export const markPayoutPaid = async (id: string, notes?: string) =>
  mapPayout(
    await request<any>(`${B}/payouts/${id}/mark-paid`, { method: 'PATCH', body: notes ? { notes } : {} }),
  )

// PATCH /beliter-referrals/admin/payouts/:id/cancel
export const cancelPayout = async (id: string, notes?: string) =>
  mapPayout(
    await request<any>(`${B}/payouts/${id}/cancel`, { method: 'PATCH', body: notes ? { notes } : {} }),
  )

// POST /beliter-referrals/admin/process-pending
export const processPending = () =>
  request<{ completed: number; skipped: number; totalProcessed: number }>(`${B}/process-pending`, {
    method: 'POST',
  })
