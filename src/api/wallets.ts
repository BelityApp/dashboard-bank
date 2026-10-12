import { num } from '../lib/num'
import { request } from './http'
import type {
  BalanceBreakdown,
  BulkPromotionalCreditsResult,
  PromotionalSegment,
  Wallet,
  WalletCreditType,
} from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
export const mapWallet = (j: any): Wallet => ({
  id: j.id,
  balance: num(j.balance),
  createdAt: j.createdAt,
  updatedAt: j.updatedAt,
  userId: j.userId ?? j.user?.id ?? '',
  userName: j.user?.name ?? undefined,
  userLastname: j.user?.lastname ?? undefined,
})

// POST /wallets/admin/deposits/by-external-id
export async function depositByExternalId(p: {
  amount: number
  userId: number
  comment: string
  isRefund: boolean
  description?: string
  expiresAt?: string
}) {
  const j = await request<any>('/wallets/admin/deposits/by-external-id', {
    method: 'POST',
    body: {
      amount: p.amount,
      userId: p.userId,
      comment: p.comment,
      type: p.isRefund ? 'REFUND' : 'DEPOSIT',
      ...(p.description ? { description: p.description } : {}),
      ...(p.expiresAt ? { expiresAt: p.expiresAt } : {}),
    },
    errors: {
      400: (b) =>
        b.toLowerCase().includes('user')
          ? 'Usuario no encontrado. Revisa el ID.'
          : 'Datos inválidos. Revisa los campos.',
    },
  })
  return mapWallet(j)
}

// POST /wallets/admin/withdraws/by-external-id
export async function withdrawByExternalId(p: {
  amount: number
  userId: number
  referenceId: number | string
  referenceType: string
  creditType: WalletCreditType
  description?: string
}) {
  const j = await request<any>('/wallets/admin/withdraws/by-external-id', {
    method: 'POST',
    body: {
      amount: p.amount,
      userId: p.userId,
      referenceId: String(p.referenceId),
      referenceType: p.referenceType.toUpperCase(),
      creditType: p.creditType,
      ...(p.description ? { description: p.description } : {}),
    },
    errors: {
      400: (b) => {
        const l = b.toLowerCase()
        if (l.includes('positive')) return 'El monto debe ser positivo.'
        if (l.includes('insufficient')) return 'Fondos insuficientes.'
        return `Solicitud inválida: ${b}`
      },
      404: 'Usuario o billetera no encontrada.',
    },
  })
  return mapWallet(j)
}

// GET /wallets/admin/:walletId
export const getWalletById = async (walletId: string) =>
  mapWallet(await request<any>(`/wallets/admin/${walletId}`))

// GET /wallets/admin/balance-breakdown/:externalUserId
export async function getBalanceBreakdown(externalUserId: number): Promise<BalanceBreakdown> {
  const j = await request<any>(`/wallets/admin/balance-breakdown/${externalUserId}`, {
    errors: { 404: 'Usuario no encontrado.' },
  })
  const b = j.breakdown ?? {}
  const d = j.details ?? {}
  return {
    total: num(j.total),
    giftcard: num(b.giftcard),
    credit: num(b.credit),
    refund: num(b.refund),
    review: num(b.reviewCredit),
    totalDeposited: num(d.totalDeposited),
    totalRefunded: num(d.totalRefunded),
    totalWithdrawn: num(d.totalWithdrawn),
    activeGiftcards: num(d.activeGiftcards),
    activePromotionalCredits: num(d.activePromotionalCredits),
  }
}

// POST /wallets/admin/promotional-credits/assign-bulk
export const assignBulkPromotionalCredits = (p: {
  amount: number
  expiresAt: string
  campaignName: string
  description?: string
  segmentId?: string
  userIds?: number[]
}) =>
  request<BulkPromotionalCreditsResult>('/wallets/admin/promotional-credits/assign-bulk', {
    method: 'POST',
    body: {
      amount: p.amount,
      expiresAt: p.expiresAt,
      campaignName: p.campaignName,
      ...(p.description ? { description: p.description } : {}),
      ...(p.segmentId ? { segmentId: p.segmentId } : {}),
      ...(p.userIds ? { userIds: p.userIds } : {}),
    },
  })

// GET /wallets/admin/promotional-segments
export const getPromotionalSegments = () =>
  request<PromotionalSegment[]>('/wallets/admin/promotional-segments')
