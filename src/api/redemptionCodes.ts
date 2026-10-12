import { num } from '../lib/num'
import { request } from './http'
import { mapWallet } from './wallets'
import type { Paginated, RedemptionCode, RedemptionCodeFilters, Wallet } from './types'

/* eslint-disable @typescript-eslint/no-explicit-any */
const mapCode = (j: any): RedemptionCode => ({
  id: j.id,
  code: j.code,
  value: num(j.value),
  createdAt: j.createdAt,
  expiresAt: j.expiresAt ?? null,
  redeemedAt: j.redeemedAt ?? null,
  redeemedByExternalId: j.redeemedBy?.externalId != null ? Number(j.redeemedBy.externalId) : null,
  comment: j.comment ?? null,
  createdBy: j.createdBy ?? null,
})

// POST /redemption-codes/admin
export const createRedemptionCode = async (p: {
  value: number
  code?: string
  expiresAt?: string
  comment?: string
}) =>
  mapCode(
    await request<any>('/redemption-codes/admin', {
      method: 'POST',
      body: {
        value: p.value,
        ...(p.code ? { code: p.code } : {}),
        ...(p.expiresAt ? { expiresAt: p.expiresAt } : {}),
        ...(p.comment ? { comment: p.comment } : {}),
      },
      errors: {
        409: 'Este código ya existe. Prueba con otro.',
        400: 'El código y/o monto son inválidos. Revisa los campos.',
      },
    }),
  )

// GET /redemption-codes/admin/:id
export const getRedemptionCodeById = async (id: string) =>
  mapCode(await request<any>(`/redemption-codes/admin/${id}`))

// POST /redemption-codes/admin/search
export async function searchRedemptionCodes(
  page: number,
  limit: number,
  f: RedemptionCodeFilters = {},
): Promise<Paginated<RedemptionCode>> {
  const j = await request<any>('/redemption-codes/admin/search', {
    method: 'POST',
    body: { page, limit, ...Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== '')) },
  })
  return {
    data: j.data.map(mapCode),
    total: j.meta.total,
    page: j.meta.page,
    limit: j.meta.limit,
    totalPages: j.meta.totalPages,
  }
}

// POST /wallets/admin/redemption
export async function redeemCodeByExternalId(
  code: string,
  userId: number,
  comment?: string,
): Promise<Wallet> {
  const j = await request<any>('/wallets/admin/redemption', {
    method: 'POST',
    body: { code, userId, ...(comment ? { comment } : {}) },
    errors: {
      400: (b) => {
        const l = b.toLowerCase()
        if (l.includes('not found')) return 'Código no encontrado.'
        if (l.includes('expired')) return 'Este código ha expirado.'
        return 'Error al canjear. Revisa el código e inténtalo de nuevo.'
      },
      409: 'Este código ya fue canjeado.',
    },
  })
  return mapWallet(j.wallet)
}
