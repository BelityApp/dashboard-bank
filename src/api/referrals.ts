import { num } from '../lib/num'
import { request } from './http'
import type {
  Paginated,
  Referral,
  ReferralCode,
  ReferralConfig,
  ReferralConfigUpdate,
  ReferralFilters,
  ReferralStats,
  Reward,
  UserReferralStats,
} from './types'

const B = '/referrals/admin'

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapReferral = (j: any): Referral => ({
  id: j.id,
  referrerId: j.referrerId,
  referredId: j.referredId,
  code: j.code ?? '',
  status: j.status,
  createdAt: j.createdAt ?? j.updatedAt ?? '',
  completedAt: j.completedAt ?? null,
  expiresAt: j.expiresAt ?? null,
  rewardGranted: j.rewardGranted ?? false,
  totalRewards: j.totalRewards ?? 0,
  updatedAt: j.updatedAt ?? null,
})

const mapReward = (j: any): Reward => ({ ...j, rewardValue: num(j.rewardValue) })
const mapConfig = (j: any): ReferralConfig => ({
  ...j,
  referrerRewardValue: num(j.referrerRewardValue),
  referredRewardValue: num(j.referredRewardValue),
  maxRewardPerMonth: j.maxRewardPerMonth != null ? num(j.maxRewardPerMonth) : null,
})
const page = <T, R>(j: any, map: (x: T) => R): Paginated<R> => ({
  data: j.data.map(map),
  total: j.total,
  page: j.page,
  limit: j.limit,
  totalPages: j.totalPages,
})

// GET /referrals/admin/stats
export async function getGlobalStats(): Promise<ReferralStats> {
  const j = await request<any>(`${B}/stats`)
  return { ...j, conversionRate: num(j.conversionRate), totalRewardsValue: num(j.totalRewardsValue) }
}

// GET /referrals/admin
export const getAllReferrals = async (p: number, limit: number, f: ReferralFilters = {}) =>
  page(await request<any>(B, { query: { page: p, limit, ...f } }), mapReferral)

// GET /referrals/admin/:id
export const getReferralById = async (id: string) =>
  mapReferral(await request<any>(`${B}/${id}`))

// PATCH /referrals/admin/:id/status
export const updateReferralStatus = async (id: string, status: string) =>
  mapReferral(
    await request<any>(`${B}/${id}/status`, {
      method: 'PATCH',
      body: { status },
      errors: { 400: 'Estado inválido.' },
    }),
  )

// PATCH /referrals/admin/code/:userId/(de)activate
export const deactivateReferralCode = (userId: number) =>
  request<ReferralCode>(`${B}/code/${userId}/deactivate`, { method: 'PATCH' })
export const activateReferralCode = (userId: number) =>
  request<ReferralCode>(`${B}/code/${userId}/activate`, { method: 'PATCH' })

// GET /referrals/admin/rewards
export const getAllRewards = async (
  p: number,
  limit: number,
  f: { status?: string; userId?: number } = {},
) => page(await request<any>(`${B}/rewards`, { query: { page: p, limit, ...f } }), mapReward)

// POST /referrals/admin/process-pending
export const processPendingReferrals = () =>
  request<{ completed: number; skipped: number; expired: number }>(`${B}/process-pending`, {
    method: 'POST',
  })

// GET /referrals/admin/user/:userId/stats
export async function getUserStats(userId: number): Promise<UserReferralStats> {
  const j = await request<any>(`${B}/user/${userId}/stats`, {
    errors: { 404: 'Usuario sin estadísticas de referidos.' },
  })
  return { ...j, totalRewardsEarned: num(j.totalRewardsEarned) }
}

// GET /referrals/admin/config
export const getReferralConfig = async () => mapConfig(await request<any>(`${B}/config`))

// PATCH /referrals/admin/config
export const updateReferralConfig = async (u: ReferralConfigUpdate) =>
  mapConfig(
    await request<any>(`${B}/config`, {
      method: 'PATCH',
      body: u,
      errors: { 400: 'Configuración inválida. Revisa los valores.' },
    }),
  )

// POST /scheduled-tasks/expire-pending-referrals
export async function expirePendingReferrals(): Promise<number> {
  const j = await request<any>('/scheduled-tasks/expire-pending-referrals', { method: 'POST' })
  return j?.expired ?? 0
}

// GET /referrals/admin/referrers/search?q=
export const searchReferrers = (q: string) =>
  request<Record<string, any>[]>(`${B}/referrers/search`, { query: { q } })

// GET /referrals/admin/referred/search?q=
export const searchReferred = (q: string) =>
  request<Record<string, any>[]>(`${B}/referred/search`, { query: { q } })
