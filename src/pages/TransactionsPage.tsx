import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { getRecentBookings, searchBookings } from '../api/bookings'
import type { Transaction, TransactionFilters, TransactionType, WalletCreditType } from '../api/types'
import { assignBulkPromotionalCredits, depositByExternalId, getBalanceBreakdown, getPromotionalSegments, getWalletById, withdrawByExternalId } from '../api/wallets'
import { getAllTransactions, getTransactionById, updatePromotionalCreditExpiration } from '../api/transactions'
import { Button, ErrorBox, Field, Input, Modal, PageHeader, Select, Spinner, StatCard, SuccessBox, Textarea } from '../components/ui'
import { dateTime, endOfDayIso, money, startOfDayIso, toInt, toIso } from '../lib/format'

const typeMeta: Record<TransactionType, { label: string; cls: string; down: boolean }> = {
  DEPOSIT: { label: 'Depósito', cls: 'bg-emerald-100 text-emerald-700', down: false },
  WITHDRAWAL: { label: 'Retiro', cls: 'bg-red-100 text-red-700', down: true },
  REDEMPTION: { label: 'Canje', cls: 'bg-brand-100 text-brand-700', down: false },
  REFUND: { label: 'Reembolso', cls: 'bg-sky-100 text-sky-700', down: false },
}
type Dialog = null | 'deposit' | 'withdraw' | 'bulk' | 'user' | { tx: string } | { expiration: Transaction }

const Icon = ({ d, className = 'h-4 w-4' }: { d: string; className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
    <path d={d} />
  </svg>
)
const icons = {
  up: 'M12 19V5M5 12l7-7 7 7',
  down: 'M12 5v14M19 12l-7 7-7-7',
  search: 'M21 21l-4.3-4.3M11 18a7 7 0 100-14 7 7 0 000 14z',
  swap: 'M7 4L3 8l4 4M3 8h14M17 20l4-4-4-4M21 16H7',
  filter: 'M3 4h18l-7 8v6l-4 2v-8L3 4z',
  eye: 'M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z',
  clock: 'M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  arrow: 'M5 12h14M13 6l6 6-6 6',
}

const timeOnly = (s: string) => new Date(s).toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
const dateShort = (s: string) => new Date(s).toLocaleDateString('es-MX', { dateStyle: 'medium' })

const toolbarCls =
  'rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 shadow-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30'

export default function TransactionsPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const empty = { type: '', start: '', end: '', search: '', comment: '' }
  const [draft, setDraft] = useState(empty)
  const [filters, setFilters] = useState<TransactionFilters>({})
  const [showMore, setShowMore] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)

  const q = useQuery({ queryKey: ['transactions', page, limit, filters], queryFn: () => getAllTransactions(page, limit, filters) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['transactions'] })

  const applyWith = (d: typeof empty) => {
    const term = d.search.trim()
    const isId = /^\d+$/.test(term)
    setPage(1)
    setFilters({
      type: (d.type || undefined) as TransactionType | undefined,
      startDate: startOfDayIso(d.start),
      endDate: endOfDayIso(d.end),
      externalUserId: isId ? toInt(term) : undefined,
      description: term && !isId ? term : undefined,
      comment: d.comment || undefined,
    })
  }
  // Los selectores aplican al instante; el texto se aplica con Enter.
  const change = (patch: Partial<typeof empty>) => {
    const d = { ...draft, ...patch }
    setDraft(d)
    if ('type' in patch || 'start' in patch || 'end' in patch) applyWith(d)
  }
  const clear = () => { setDraft(empty); setPage(1); setFilters({}) }

  const rows = q.data?.data ?? []

  return (
    <>
      <PageHeader
        title="Transacciones"
        actions={
          <>
            <Button variant="secondary" onClick={() => setDialog('user')}>Saldo de usuario</Button>
            <Button variant="secondary" className="border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100" onClick={() => setDialog('bulk')}>Créditos masivos</Button>
            <Button variant="secondary" className="border-red-200 bg-red-50 text-red-700 hover:bg-red-100" onClick={() => setDialog('withdraw')}>
              <span aria-hidden>−</span> Retirar
            </Button>
            <Button className="shadow-md shadow-brand-600/30" onClick={() => setDialog('deposit')}>
              <span aria-hidden>+</span> Depositar
            </Button>
          </>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <form
          onSubmit={(e) => { e.preventDefault(); applyWith(draft) }}
          className="flex flex-wrap items-center gap-3 p-4"
        >
          <div className="relative">
            <Icon d={icons.swap} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-brand-600" />
            <select value={draft.type} onChange={(e) => change({ type: e.target.value })} className={`${toolbarCls} min-w-44 pl-9 font-medium`}>
              <option value="">Todos los tipos</option>
              {(['DEPOSIT', 'WITHDRAWAL', 'REDEMPTION', 'REFUND'] as const).map((t) => <option key={t} value={t}>{typeMeta[t].label}</option>)}
            </select>
          </div>
          <div className="relative min-w-56 flex-1">
            <Icon d={icons.search} className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={draft.search}
              onChange={(e) => change({ search: e.target.value })}
              placeholder="Buscar por ID de usuario o descripción"
              className={`${toolbarCls} w-full pl-9`}
            />
          </div>
          <div className="flex items-center gap-2">
            <input type="date" aria-label="Desde" value={draft.start} onChange={(e) => change({ start: e.target.value })} className={toolbarCls} />
            <Icon d={icons.arrow} className="h-4 w-4 text-slate-400" />
            <input type="date" aria-label="Hasta" value={draft.end} onChange={(e) => change({ end: e.target.value })} className={toolbarCls} />
          </div>
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className={`${toolbarCls} inline-flex items-center gap-2 font-medium hover:bg-slate-50`}
          >
            <Icon d={icons.filter} /> Filtros
          </button>
          {showMore && (
            <div className="flex w-full flex-wrap items-center gap-3 border-t border-slate-100 pt-3">
              <input
                value={draft.comment}
                onChange={(e) => change({ comment: e.target.value })}
                placeholder="Comentario"
                className={`${toolbarCls} min-w-56 flex-1`}
              />
              <button type="submit" className="rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Aplicar</button>
              <button type="button" onClick={clear} className={`${toolbarCls} font-medium hover:bg-slate-50`}>Limpiar</button>
            </div>
          )}
        </form>

        {q.isLoading ? <Spinner /> : q.error ? <div className="p-4"><ErrorBox error={q.error} /></div> : q.data && (
          <>
            <div className="overflow-x-auto border-t border-slate-200">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50/70">
                  <tr className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3 text-left">Fecha</th>
                    <th className="px-4 py-3 text-left">Tipo</th>
                    <th className="px-4 py-3 text-left">Descripción</th>
                    <th className="px-4 py-3 text-left">Usuario</th>
                    <th className="px-4 py-3 text-left">Expira</th>
                    <th className="px-4 py-3 text-right">Monto</th>
                    <th className="px-4 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((t) => {
                    const meta = typeMeta[t.type]
                    const neg = t.type === 'WITHDRAWAL'
                    const zero = t.amount === 0
                    const expires = t.expiresAt ?? t.promotionalCredit?.expiresAt
                    return (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="whitespace-nowrap px-4 py-3">
                          <div className="font-medium text-slate-900">{dateShort(t.createdAt)}</div>
                          <div className="text-slate-500">{timeOnly(t.createdAt)}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${meta.cls}`}>
                            <Icon d={meta.down ? icons.down : icons.up} className="h-3.5 w-3.5" /> {meta.label}
                          </span>
                        </td>
                        <td className="max-w-sm px-4 py-3">
                          <div className="truncate font-medium text-slate-900">{t.description}</div>
                          {t.bookingId != null ? (
                            <div className="text-brand-700">Reserva #{t.bookingId}</div>
                          ) : (t.comment || t.redemptionCode) && (
                            <div className="truncate text-slate-500">{t.comment ?? t.redemptionCode}</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {t.externalUserId != null
                            ? <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-semibold text-slate-700">#{t.externalUserId}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          {expires
                            ? <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-semibold text-amber-700"><Icon d={icons.clock} className="h-3.5 w-3.5" /> {dateShort(expires)}</span>
                            : <span className="text-slate-400">—</span>}
                        </td>
                        <td className={`whitespace-nowrap px-4 py-3 text-right font-mono font-bold ${neg ? 'text-red-700' : 'text-emerald-700'}`}>
                          {neg ? '-' : '+'} {money(Math.abs(t.amount))}
                          {zero && <div className="font-sans text-xs font-semibold text-amber-700">Monto en cero · revisar</div>}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1 text-slate-500">
                            {t.promotionalCredit && (
                              <button title="Editar expiración" aria-label="Editar expiración" onClick={() => setDialog({ expiration: t })} className="rounded-lg p-2 hover:bg-slate-100 hover:text-brand-700">
                                <Icon d={icons.calendar} className="h-5 w-5" />
                              </button>
                            )}
                            <button title="Ver detalle" aria-label="Ver detalle" onClick={() => setDialog({ tx: t.id })} className="rounded-lg p-2 hover:bg-slate-100 hover:text-brand-700">
                              <Icon d={icons.eye} className="h-5 w-5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                  {!rows.length && (
                    <tr><td colSpan={7} className="px-4 py-10 text-center text-slate-400">Sin resultados</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <GridPagination
              page={q.data.page}
              totalPages={q.data.totalPages}
              shown={rows.length}
              limit={limit}
              onPage={setPage}
              onLimit={(l) => { setLimit(l); setPage(1) }}
            />
          </>
        )}
      </div>

      {dialog === 'deposit' && <DepositDialog onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'withdraw' && <WithdrawDialog onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'bulk' && <BulkDialog onClose={() => setDialog(null)} onDone={refresh} />}
      {dialog === 'user' && <UserDialog onClose={() => setDialog(null)} />}
      {dialog && typeof dialog === 'object' && 'tx' in dialog && <TxDetail id={dialog.tx} onClose={() => setDialog(null)} />}
      {dialog && typeof dialog === 'object' && 'expiration' in dialog && <ExpirationDialog tx={dialog.expiration} onClose={() => setDialog(null)} onDone={refresh} />}
    </>
  )
}

function GridPagination({ page, totalPages, shown, limit, onPage, onLimit }: {
  page: number
  totalPages: number
  shown: number
  limit: number
  onPage: (p: number) => void
  onLimit: (l: number) => void
}) {
  const last = Math.max(totalPages, 1)
  const from = Math.max(1, Math.min(page - 2, last - 4))
  const pages = Array.from({ length: Math.min(5, last) }, (_, i) => from + i)
  const btn = 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-2 text-sm font-medium disabled:cursor-not-allowed disabled:opacity-40'
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-500">
      <div className="flex items-center gap-3">
        <span>Mostrando <b className="text-slate-900">{shown}</b> transacciones</span>
        <select value={limit} onChange={(e) => onLimit(Number(e.target.value))} className="rounded-lg border border-slate-200 px-2 py-1 text-slate-600">
          {[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / pág.</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1.5">
        <button className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`} disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Anterior">
          <Icon d={icons.left} />
        </button>
        {pages.map((n) => (
          <button
            key={n}
            onClick={() => onPage(n)}
            aria-current={n === page ? 'page' : undefined}
            className={`${btn} ${n === page ? 'border-brand-600 bg-brand-600 text-white shadow-sm' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`}
          >
            {n}
          </button>
        ))}
        <button className={`${btn} border-slate-200 bg-white text-slate-600 hover:bg-slate-50`} disabled={page >= last} onClick={() => onPage(page + 1)} aria-label="Siguiente">
          <Icon d={icons.right} />
        </button>
      </div>
    </div>
  )
}

function DepositDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ userId: '', amount: '', comment: '', description: '', expiresAt: '', isRefund: false })
  const m = useMutation({
    mutationFn: () => depositByExternalId({ userId: Number(f.userId), amount: Number(f.amount), comment: f.comment, description: f.description || undefined, expiresAt: toIso(f.expiresAt), isRefund: f.isRefund }),
    onSuccess: onDone,
  })
  return (
    <Modal title="Depositar" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <Field label="ID de usuario"><Input type="number" required value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} /></Field>
        <Field label="Monto"><Input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Comentario"><Textarea rows={2} required value={f.comment} onChange={(e) => setF({ ...f, comment: e.target.value })} /></Field>
        <Field label="Descripción (opcional)"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <Field label="Expira (opcional)"><Input type="datetime-local" value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.isRefund} onChange={(e) => setF({ ...f, isRefund: e.target.checked })} /> Es reembolso (REFUND)</label>
        <ErrorBox error={m.error} />
        {m.data && <SuccessBox>Depósito exitoso. Nuevo saldo: <b>{money(m.data.balance)}</b></SuccessBox>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Procesando…' : 'Depositar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function WithdrawDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [f, setF] = useState({ userId: '', amount: '', bookingId: '', creditType: 'PROMOTIONAL_CREDIT' as WalletCreditType, description: '' })
  const [search, setSearch] = useState('')
  const userId = toInt(f.userId)
  const recent = useQuery({ queryKey: ['bookings-recent'], queryFn: () => getRecentBookings(50) })
  const found = useQuery({ queryKey: ['bookings-search', search], queryFn: () => searchBookings(search), enabled: search.length > 0 })
  const all = search ? (found.data ?? []) : (recent.data ?? [])
  const suggestions = userId ? all.filter((b) => b.user_id === userId) : all
  const m = useMutation({
    mutationFn: () => withdrawByExternalId({ userId: Number(f.userId), amount: Number(f.amount), referenceId: f.bookingId, referenceType: 'BOOKING', creditType: f.creditType, description: f.description || undefined }),
    onSuccess: onDone,
  })
  return (
    <Modal title="Retirar" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <Field label="ID de usuario"><Input type="number" required value={f.userId} onChange={(e) => setF({ ...f, userId: e.target.value })} /></Field>
        <Field label="Monto"><Input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
        <Field label="Tipo de crédito">
          <Select value={f.creditType} onChange={(e) => setF({ ...f, creditType: e.target.value as WalletCreditType })}>
            <option value="GIFTCARD">Giftcard</option><option value="PROMOTIONAL_CREDIT">Crédito promocional</option>
            <option value="REFUND_CREDIT">Crédito de reembolso</option><option value="REVIEW_CREDIT">Crédito por reseña</option>
          </Select>
        </Field>
        <Field label="Buscar booking" hint="Busca por texto o elige de las reservas recientes">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar…" />
        </Field>
        <Field label="ID de booking">
          <Input required value={f.bookingId} onChange={(e) => setF({ ...f, bookingId: e.target.value })} list="booking-options" />
          <datalist id="booking-options">
            {suggestions.map((b) => <option key={b.id} value={b.id}>{`Usuario ${b.user_id} · ${new Date(b.created_at).toLocaleDateString()}`}</option>)}
          </datalist>
        </Field>
        <Field label="Descripción (opcional)"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <ErrorBox error={m.error} />
        {m.data && <SuccessBox>Retiro exitoso. Nuevo saldo: <b>{money(m.data.balance)}</b></SuccessBox>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" variant="danger" disabled={m.isPending}>{m.isPending ? 'Procesando…' : 'Retirar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function BulkDialog({ onClose, onDone }: { onClose: () => void; onDone: () => void }) {
  const [mode, setMode] = useState<'segment' | 'users'>('segment')
  const [f, setF] = useState({ amount: '', expiresAt: '', campaignName: '', description: '', segmentId: '', userIds: '' })
  const segs = useQuery({ queryKey: ['segments'], queryFn: getPromotionalSegments })
  const m = useMutation({
    mutationFn: () => assignBulkPromotionalCredits({
      amount: Number(f.amount), expiresAt: toIso(f.expiresAt)!, campaignName: f.campaignName, description: f.description || undefined,
      ...(mode === 'segment' ? { segmentId: f.segmentId } : { userIds: f.userIds.split(/[\s,;]+/).filter(Boolean).map(Number) }),
    }),
    onSuccess: onDone,
  })
  return (
    <Modal title="Asignar créditos promocionales" onClose={onClose} wide>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Monto por usuario"><Input type="number" step="0.01" min="0.01" required value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} /></Field>
          <Field label="Expira"><Input type="datetime-local" required value={f.expiresAt} onChange={(e) => setF({ ...f, expiresAt: e.target.value })} /></Field>
        </div>
        <Field label="Nombre de campaña"><Input required value={f.campaignName} onChange={(e) => setF({ ...f, campaignName: e.target.value })} /></Field>
        <Field label="Descripción (opcional)"><Input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></Field>
        <div className="flex gap-4 text-sm">
          <label className="flex items-center gap-1"><input type="radio" checked={mode === 'segment'} onChange={() => setMode('segment')} /> Segmento</label>
          <label className="flex items-center gap-1"><input type="radio" checked={mode === 'users'} onChange={() => setMode('users')} /> Lista de usuarios</label>
        </div>
        {mode === 'segment' ? (
          <Field label="Segmento" hint={segs.data?.find((s) => s.id === f.segmentId)?.description}>
            <Select required value={f.segmentId} onChange={(e) => setF({ ...f, segmentId: e.target.value })}>
              <option value="">Selecciona…</option>
              {segs.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </Field>
        ) : (
          <Field label="IDs de usuario" hint="Separados por coma, espacio o salto de línea">
            <Textarea rows={3} required value={f.userIds} onChange={(e) => setF({ ...f, userIds: e.target.value })} />
          </Field>
        )}
        <ErrorBox error={m.error ?? segs.error} />
        {m.data && (
          <div className="space-y-2">
            <SuccessBox>Usuarios: {m.data.totalUsers} · Asignados: {m.data.assigned} · Fallidos: {m.data.failed}</SuccessBox>
            {m.data.errors.length > 0 && (
              <ul className="max-h-32 overflow-y-auto rounded-lg bg-red-50 p-2 text-xs text-red-700">
                {m.data.errors.map((e) => <li key={e.userId}>Usuario {e.userId}: {e.error}</li>)}
              </ul>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Asignando…' : 'Asignar'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function UserDialog({ onClose }: { onClose: () => void }) {
  const [input, setInput] = useState('')
  const [id, setId] = useState<number | null>(null)
  const q = useQuery({ queryKey: ['breakdown', id], queryFn: () => getBalanceBreakdown(id!), enabled: id !== null })
  return (
    <Modal title="Saldo de usuario" onClose={onClose} wide>
      <form className="mb-4 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); setId(toInt(input) ?? null) }}>
        <Field label="ID de usuario" className="flex-1"><Input type="number" required value={input} onChange={(e) => setInput(e.target.value)} /></Field>
        <Button type="submit">Consultar</Button>
      </form>
      {q.isLoading && <Spinner />}
      <ErrorBox error={q.error} />
      {q.data && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatCard label="Total" value={money(q.data.total)} />
          <StatCard label="Giftcard" value={money(q.data.giftcard)} sub={`${q.data.activeGiftcards} activas`} />
          <StatCard label="Crédito promo" value={money(q.data.credit)} sub={`${q.data.activePromotionalCredits} activos`} />
          <StatCard label="Reembolso" value={money(q.data.refund)} />
          <StatCard label="Reseñas" value={money(q.data.review)} />
          <StatCard label="Depositado" value={money(q.data.totalDeposited)} />
          <StatCard label="Reembolsado" value={money(q.data.totalRefunded)} />
          <StatCard label="Retirado" value={money(q.data.totalWithdrawn)} />
        </div>
      )}
    </Modal>
  )
}

function TxDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['transaction', id], queryFn: () => getTransactionById(id) })
  const wallet = useQuery({ queryKey: ['wallet', q.data?.walletId], queryFn: () => getWalletById(q.data!.walletId), enabled: !!q.data?.walletId })
  const t = q.data
  return (
    <Modal title="Detalle de transacción" onClose={onClose} wide>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : t && (
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {([
            ['ID', t.id], ['Tipo', t.type], ['Monto', money(t.amount)], ['Fecha', dateTime(t.createdAt)], ['Descripción', t.description],
            ['Usuario (externo)', t.externalUserId ?? '—'], ['Wallet', t.walletId],
            ['Saldo wallet', money(wallet.data?.balance ?? t.walletBalance)], ['Booking', t.bookingId ?? '—'],
            ['Código', t.redemptionCode ?? '—'], ['Comentario', t.comment ?? '—'], ['Expira', dateTime(t.expiresAt)],
            ...(t.promotionalCredit ? ([
              ['Campaña', t.promotionalCredit.campaignName], ['Original', money(t.promotionalCredit.originalAmount)],
              ['Usado', money(t.promotionalCredit.usedAmount)], ['Disponible', money(t.promotionalCredit.availableAmount)],
              ['Expira crédito', dateTime(t.promotionalCredit.expiresAt)], ['Expirado', t.promotionalCredit.isExpired ? 'Sí' : 'No'],
            ] as [string, React.ReactNode][]) : []),
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 break-all">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  )
}

function ExpirationDialog({ tx, onClose, onDone }: { tx: Transaction; onClose: () => void; onDone: () => void }) {
  const [v, setV] = useState('')
  const m = useMutation({ mutationFn: () => updatePromotionalCreditExpiration(tx.promotionalCredit!.id, toIso(v)!), onSuccess: onDone })
  return (
    <Modal title="Editar expiración" onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <p className="text-sm text-slate-600">Campaña: <b>{tx.promotionalCredit?.campaignName}</b> · Expira actualmente: {dateTime(tx.promotionalCredit?.expiresAt)}</p>
        <Field label="Nueva fecha de expiración"><Input type="datetime-local" required value={v} onChange={(e) => setV(e.target.value)} /></Field>
        <ErrorBox error={m.error} />
        {m.isSuccess && <SuccessBox>Expiración actualizada.</SuccessBox>}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" disabled={m.isPending}>Guardar</Button>
        </div>
      </form>
    </Modal>
  )
}
