import { num, numOrNull } from '../lib/num'
import { request } from './http'
import type { Paginated, Transaction, TransactionFilters, TransactionType } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapTx = (j: any): Transaction => {
  const raw = String(j.transaction_type ?? j.type ?? '').toUpperCase()
  const type = (['DEPOSIT', 'WITHDRAWAL', 'REDEMPTION', 'REFUND'].includes(raw)
    ? raw
    : 'DEPOSIT') as TransactionType
  const pc = j.promotionalCredit
  return {
    id: j.id,
    amount: num(j.amount),
    type,
    description: j.description ?? '',
    createdAt: j.createdAt,
    userId: j.userId,
    walletId: j.walletId,
    redemptionCode: j.redemptionCode ?? null,
    bookingId: j.referenceId != null ? (Number.parseInt(j.referenceId, 10) || null) : null,
    walletUpdatedAt: j.wallet?.updatedAt ?? null,
    walletBalance: numOrNull(j.wallet?.balance),
    externalUserId: j.user?.externalId != null ? Number(j.user.externalId) : null,
    comment: j.comment ?? null,
    expiresAt: j.expiresAt ?? null,
    promotionalCredit: pc
      ? {
          id: pc.id,
          usedAmount: num(pc.usedAmount),
          availableAmount: num(pc.availableAmount),
          originalAmount: num(pc.originalAmount),
          isExpired: !!pc.isExpired,
          campaignName: pc.campaignName,
          expiresAt: pc.expiresAt ?? null,
        }
      : null,
  }
}

// GET /transactions/admin
export async function getAllTransactions(
  page: number,
  limit: number,
  f: TransactionFilters = {},
): Promise<Paginated<Transaction>> {
  const j = await request<any>('/transactions/admin', { query: { page, limit, ...f } })
  return {
    data: j.data.map(mapTx),
    total: j.meta.total,
    page: j.meta.page,
    limit: j.meta.limit,
    totalPages: j.meta.totalPages,
  }
}

// GET /transactions/admin/:id
export const getTransactionById = async (id: string) =>
  mapTx(await request<any>(`/transactions/admin/${id}`))

// PATCH /promotional-credits/admin/:id/expiration
export const updatePromotionalCreditExpiration = async (id: string, expiresAt: string) =>
  mapTx(
    await request<any>(`/promotional-credits/admin/${id}/expiration`, {
      method: 'PATCH',
      body: { expiresAt },
      errors: {
        400: 'Fecha de expiración inválida.',
        404: 'Crédito promocional no encontrado.',
      },
    }),
  )
