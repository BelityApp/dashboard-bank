import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { createRedemptionCode, getRedemptionCodeById, redeemCodeByExternalId, searchRedemptionCodes } from '../api/redemptionCodes'
import type { RedemptionCode, RedemptionCodeFilters } from '../api/types'
import { Badge, Button, ErrorBox, Field, FilterBar, Input, Modal, PageHeader, Pagination, Select, Spinner, SuccessBox, Table, Td, Textarea } from '../components/ui'
import { dateTime, endOfDayIso, errMsg, money, startOfDayIso, toIso } from '../lib/format'

type TriState = '' | 'true' | 'false'
const tri = (v: TriState) => (v === '' ? undefined : v === 'true')

export default function GiftcardsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [draft, setDraft] = useState({ code: '', comment: '', isRedeemed: '' as TriState, isExpired: '' as TriState, start: '', end: '' })
  const [filters, setFilters] = useState<RedemptionCodeFilters>({})
  const [creating, setCreating] = useState(false)
  const [redeeming, setRedeeming] = useState(false)
  const [detailId, setDetailId] = useState<string | null>(null)

  const q = useQuery({
    queryKey: ['redemption-codes', page, limit, filters],
    queryFn: () => searchRedemptionCodes(page, limit, filters),
  })

  const apply = () => {
    setPage(1)
    setFilters({
      code: draft.code || undefined,
      comment: draft.comment || undefined,
      isRedeemed: tri(draft.isRedeemed),
      isExpired: tri(draft.isExpired),
      startDate: startOfDayIso(draft.start),
      endDate: endOfDayIso(draft.end),
    })
  }
  const clear = () => {
    setDraft({ code: '', comment: '', isRedeemed: '', isExpired: '', start: '', end: '' })
    setPage(1)
    setFilters({})
  }

  return (
    <>
      <PageHeader
        title="Giftcards"
        actions={
          <>
            <Button variant="secondary" onClick={() => setRedeeming(true)}>Canjear giftcard</Button>
            <Button onClick={() => setCreating(true)}>Crear giftcard</Button>
          </>
        }
      />
      <FilterBar onApply={apply} onClear={clear}>
        <Field label="Código"><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></Field>
        <Field label="Comentario"><Input value={draft.comment} onChange={(e) => setDraft({ ...draft, comment: e.target.value })} /></Field>
        <Field label="Estado">
          <Select value={draft.isRedeemed} onChange={(e) => setDraft({ ...draft, isRedeemed: e.target.value as TriState })}>
            <option value="">Todos</option><option value="true">Canjeada</option><option value="false">No canjeada</option>
          </Select>
        </Field>
        <Field label="Expiración">
          <Select value={draft.isExpired} onChange={(e) => setDraft({ ...draft, isExpired: e.target.value as TriState })}>
            <option value="">Todas</option><option value="true">Expirada</option><option value="false">Vigente</option>
          </Select>
        </Field>
        <Field label="Desde"><Input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
        <Field label="Hasta"><Input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
      </FilterBar>

      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data && (
        <>
          <Table head={['Código', 'Valor', 'Estado', 'Creada', 'Expira', 'Canjeada', 'Usuario', 'Comentario']} empty={!q.data.data.length}>
            {q.data.data.map((c) => (
              <tr key={c.id} className="cursor-pointer hover:bg-slate-50" onClick={() => setDetailId(c.id)}>
                <Td className="font-mono">{c.code}</Td>
                <Td>{money(c.value)}</Td>
                <Td>{statusBadge(c)}</Td>
                <Td>{dateTime(c.createdAt)}</Td>
                <Td>{dateTime(c.expiresAt)}</Td>
                <Td>{dateTime(c.redeemedAt)}</Td>
                <Td>{c.redeemedByExternalId ?? '—'}</Td>
                <Td className="max-w-xs truncate">{c.comment ?? '—'}</Td>
              </tr>
            ))}
          </Table>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1) }} />
        </>
      )}

      {creating && <CreateDialog onClose={() => setCreating(false)} onDone={() => qc.invalidateQueries({ queryKey: ['redemption-codes'] })} />}
      {redeeming && <RedeemDialog onClose={() => setRedeeming(false)} onDone={() => qc.invalidateQueries({ queryKey: ['redemption-codes'] })} />}
      {detailId && <DetailDialog id={detailId} onClose={() => setDetailId(null)} />}
    </>
  )
}

function statusBadge(c: RedemptionCode) {
  if (c.redeemedAt) return <Badge tone="green">Canjeada</Badge>
  if (c.expiresAt && new Date(c.expiresAt) < new Date()) return <Badge tone="gray">Expirada</Badge>
  return <Badge tone="purple">Activa</Badge>
}

function CreateDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ value: '', code: '', expiresAt: '', comment: '' })
  const m = useMutation({
    mutationFn: () => createRedemptionCode({ value: Number(f.value), code: f.code || undefined, expiresAt: toIso(f.expiresAt), comment: f.comment || undefined }),
    onSuccess: onDone,
  })
  return (
    <Modal title="Crear giftcard" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <Field label="Monto"><Input type="number" min="0.01" step="0.01" required value={f.value} onChange={(e) => setF({ ...f, value: e.target.value })} /></Field>
        <Field label="Código (opcional)" hint="Se genera automáticamente si se deja vacío"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="Expira (opcional)"><Input type="datetime-local" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
        <Field label="Comentario (opcional)"><Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
        <ErrorBox error={m.error} />
        {m.data && <SuccessBox>Giftcard creada: <b className="font-mono">{m.data.code}</b></SuccessBox>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Creando…' : 'Crear'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function RedeemDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ code: '', userId: '', comment: '' })
  const m = useMutation({
    mutationFn: () => redeemCodeByExternalId(f.code.trim(), Number(f.userId), f.comment || undefined),
    onSuccess: onDone,
  })
  return (
    <Modal title="Canjear giftcard" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <Field label="Código"><Input required value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <Field label="ID de usuario"><Input type="number" required value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} /></Field>
        <Field label="Comentario (opcional)"><Textarea rows={2} value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
        <ErrorBox error={m.error} />
        {m.data && <SuccessBox>Canjeada. Nuevo saldo: <b>{money(m.data.balance)}</b></SuccessBox>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Canjeando…' : 'Canjear'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['redemption-code', id], queryFn: () => getRedemptionCodeById(id) })
  return (
    <Modal title="Detalle de giftcard" onClose={onClose}>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={errMsg(q.error)} /> : q.data && (
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {([
            ['ID', q.data.id], ['Código', q.data.code], ['Valor', money(q.data.value)], ['Creada', dateTime(q.data.createdAt)],
            ['Expira', dateTime(q.data.expiresAt)], ['Canjeada', dateTime(q.data.redeemedAt)],
            ['Usuario', q.data.redeemedByExternalId ?? '—'], ['Creada por', q.data.createdBy ?? '—'], ['Comentario', q.data.comment ?? '—'],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 break-all">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  )
}
