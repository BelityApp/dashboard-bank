import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import * as api from '../api/beliterReferrals'
import type { BeliterPayout, BeliterReferralFilters } from '../api/types'
import { codeOptions, SearchField, userOptions } from '../components/SearchField'
import { Badge, Button, Card, ErrorBox, Field, FilterBar, Input, Modal, PageHeader, Pagination, Select, Spinner, StatCard, statusTone, SuccessBox, Table, Tabs, Td, Textarea } from '../components/ui'
import { dateTime, endOfDayIso, money, startOfDayIso } from '../lib/format'

type Tab = 'stats' | 'referrals' | 'payouts' | 'config'
const tabs: { id: Tab; label: string }[] = [
  { id: 'stats', label: 'Estadísticas' }, { id: 'referrals', label: 'Referidos' },
  { id: 'payouts', label: 'Pagos' }, { id: 'config', label: 'Configuración' },
]

export default function BeliterReferralsPage() {
  const [tab, setTab] = useState<Tab>('stats')
  return (
    <>
      <PageHeader title="Referidos Beliter" />
      <Tabs tabs={tabs} value={tab} onChange={setTab} />
      {tab === 'stats' && <StatsTab />}
      {tab === 'referrals' && <ReferralsTab />}
      {tab === 'payouts' && <PayoutsTab />}
      {tab === 'config' && <ConfigTab />}
    </>
  )
}

function StatsTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['b-stats'], queryFn: api.getStats })
  const summary = useQuery({ queryKey: ['b-pending-summary'], queryFn: api.getPayoutsPendingSummary })
  const process = useMutation({
    mutationFn: api.processPending,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['b-stats'] }); qc.invalidateQueries({ queryKey: ['b-referrals'] }) },
  })
  const s = q.data
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button disabled={process.isPending} onClick={() => process.mutate()}>{process.isPending ? 'Procesando…' : 'Procesar pendientes'}</Button>
        {process.data && <SuccessBox>Completados: {process.data.completed} · Omitidos: {process.data.skipped} · Total: {process.data.totalProcessed}</SuccessBox>}
      </div>
      <ErrorBox error={process.error} />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : s && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Referidos" value={s.totalReferrals} />
          <StatCard label="Completados" value={s.completedReferrals} />
          <StatCard label="Pendientes" value={s.pendingReferrals} />
          <StatCard label="Expirados" value={s.expiredReferrals} />
          <StatCard label="Conversión" value={`${s.conversionRate.toFixed(1)}%`} />
          <StatCard label="Pagos totales" value={money(s.totalPayoutsAmount)} />
          <StatCard label="Pagos pendientes" value={money(s.pendingPayoutsAmount)} />
        </div>
      )}
      <Card>
        <h2 className="mb-3 font-semibold">Pagos pendientes por referidor</h2>
        {summary.isLoading ? <Spinner /> : summary.error ? <ErrorBox error={summary.error} /> : (
          <Table head={['Referidor', 'Pagos pendientes', 'Monto total']} empty={!summary.data?.length}>
            {summary.data?.map((r) => <tr key={r.referrerExternalId}><Td>#{r.referrerExternalId}</Td><Td>{r.pendingCount}</Td><Td className="font-medium">{money(r.totalAmount)}</Td></tr>)}
          </Table>
        )}
      </Card>
    </div>
  )
}

function ReferralsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [draft, setDraft] = useState({ status: '', start: '', end: '' })
  const [code, setCode] = useState<string | null>(null)
  const [referrer, setReferrer] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [filters, setFilters] = useState<BeliterReferralFilters>({})
  const [detail, setDetail] = useState<string | null>(null)

  const q = useQuery({ queryKey: ['b-referrals', page, limit, filters], queryFn: () => api.getReferrals(page, limit, filters) })
  const refresh = () => qc.invalidateQueries({ queryKey: ['b-referrals'] })
  const cancel = useMutation({ mutationFn: api.cancelReferral, onSuccess: refresh })
  const toggle = useMutation({ mutationFn: (v: { userId: number; activate: boolean }) => (v.activate ? api.activateCode(v.userId) : api.deactivateCode(v.userId)) })

  return (
    <>
      <FilterBar
        onApply={() => { setPage(1); setFilters({ status: draft.status || undefined, code: code ?? undefined, referrerId: referrer ? Number(referrer) : undefined, startDate: startOfDayIso(draft.start), endDate: endOfDayIso(draft.end) }) }}
        onClear={() => { setDraft({ status: '', start: '', end: '' }); setCode(null); setReferrer(null); setResetKey((k) => k + 1); setPage(1); setFilters({}) }}
      >
        <Field label="Estado">
          <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Todos</option><option value="PENDING">Pendiente</option><option value="COMPLETED">Completado</option><option value="EXPIRED">Expirado</option><option value="CANCELED">Cancelado</option>
          </Select>
        </Field>
        <SearchField label="Código" resetKey={resetKey} onSearch={async (s) => codeOptions(await api.searchReferrers(s))} onSelect={setCode} />
        <SearchField label="ID Referidor" resetKey={resetKey} onSearch={async (s) => userOptions(await api.searchReferrers(s))} onSelect={setReferrer} />
        <Field label="Desde"><Input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
        <Field label="Hasta"><Input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
      </FilterBar>
      <div className="mb-3"><ErrorBox error={cancel.error ?? toggle.error} />{toggle.isSuccess && <SuccessBox>Código actualizado.</SuccessBox>}</div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data && (
        <>
          <Table head={['Creado', 'Código', 'Referidor', 'Referido', 'Estado', 'Completado', 'Expira', 'Comisión hasta', 'Pago', 'Acciones']} empty={!q.data.data.length}>
            {q.data.data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td>{dateTime(r.createdAt)}</Td><Td className="font-mono">{r.code}</Td>
                <Td>#{r.referrerExternalId}</Td><Td>#{r.referredExternalId}</Td>
                <Td><Badge tone={statusTone(r.status) as 'gray'}>{r.status}</Badge></Td>
                <Td>{dateTime(r.completedAt)}</Td><Td>{dateTime(r.expiresAt)}</Td><Td>{dateTime(r.commissionExpiresAt)}</Td>
                <Td>{r.payout ? <>{money(r.payout.amount)} <Badge tone={statusTone(r.payout.status) as 'gray'}>{r.payout.status}</Badge></> : '—'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setDetail(r.id)}>Ver</Button>
                    {r.status === 'PENDING' && <Button variant="ghost" onClick={() => window.confirm('¿Cancelar este referido?') && cancel.mutate(r.id)}>Cancelar</Button>}
                    <Button variant="ghost" onClick={() => window.confirm(`¿Desactivar el código del usuario #${r.referrerExternalId}?`) && toggle.mutate({ userId: r.referrerExternalId, activate: false })}>Desactivar cód.</Button>
                    <Button variant="ghost" onClick={() => toggle.mutate({ userId: r.referrerExternalId, activate: true })}>Activar cód.</Button>
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1) }} />
        </>
      )}
      {detail && <DetailDialog id={detail} onClose={() => setDetail(null)} />}
    </>
  )
}

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['b-referral', id], queryFn: () => api.getReferralById(id) })
  const r = q.data
  return (
    <Modal title="Detalle de referido Beliter" onClose={onClose}>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : r && (
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {([
            ['ID', r.id], ['Código', r.code], ['Estado', r.status], ['Referidor', `#${r.referrerExternalId}`], ['Referido', `#${r.referredExternalId}`],
            ['Creado', dateTime(r.createdAt)], ['Completado', dateTime(r.completedAt)], ['Expira', dateTime(r.expiresAt)],
            ['Comisión hasta', dateTime(r.commissionExpiresAt)], ['Pago', r.payout ? `${money(r.payout.amount)} (${r.payout.status})` : '—'],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 break-all">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  )
}

function PayoutsTab() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [status, setStatus] = useState('')
  const [referrer, setReferrer] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [filters, setFilters] = useState<{ status?: string; referrerId?: number }>({})
  const [action, setAction] = useState<{ payout: BeliterPayout; kind: 'pay' | 'cancel' } | null>(null)

  const q = useQuery({ queryKey: ['b-payouts', page, limit, filters], queryFn: () => api.getPayouts(page, limit, filters) })
  const refresh = () => { qc.invalidateQueries({ queryKey: ['b-payouts'] }); qc.invalidateQueries({ queryKey: ['b-pending-summary'] }); qc.invalidateQueries({ queryKey: ['b-stats'] }) }

  return (
    <>
      <FilterBar
        onApply={() => { setPage(1); setFilters({ status: status || undefined, referrerId: referrer ? Number(referrer) : undefined }) }}
        onClear={() => { setStatus(''); setReferrer(null); setResetKey((k) => k + 1); setPage(1); setFilters({}) }}
      >
        <Field label="Estado del pago">
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option><option value="PENDING">Pendiente</option><option value="PAID">Pagado</option><option value="CANCELED">Cancelado</option>
          </Select>
        </Field>
        <SearchField label="Referidor" resetKey={resetKey} onSearch={async (s) => userOptions(await api.searchReferrers(s))} onSelect={setReferrer} />
      </FilterBar>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data && (
        <>
          <Table head={['Fecha', 'Referidor', 'Referido', 'Monto', 'Estado', 'Pagado en', 'Pagado por', 'Notas', 'Acciones']} empty={!q.data.data.length}>
            {q.data.data.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50">
                <Td>{dateTime(p.createdAt)}</Td><Td>#{p.referrerExternalId}</Td><Td>#{p.referredExternalId}</Td>
                <Td className="font-medium">{money(p.amount)}</Td>
                <Td><Badge tone={statusTone(p.status) as 'gray'}>{p.status}</Badge></Td>
                <Td>{dateTime(p.paidAt)}</Td><Td>{p.paidBy ?? '—'}</Td><Td className="max-w-xs truncate">{p.notes ?? '—'}</Td>
                <Td>
                  {p.status === 'PENDING' && (
                    <div className="flex gap-1">
                      <Button variant="ghost" onClick={() => setAction({ payout: p, kind: 'pay' })}>Marcar pagado</Button>
                      <Button variant="ghost" onClick={() => setAction({ payout: p, kind: 'cancel' })}>Cancelar</Button>
                    </div>
                  )}
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1) }} />
        </>
      )}
      {action && <PayoutActionDialog {...action} onClose={() => setAction(null)} onDone={refresh} />}
    </>
  )
}

function PayoutActionDialog({ payout, kind, onClose, onDone }: { payout: BeliterPayout; kind: 'pay' | 'cancel'; onClose: () => void; onDone: () => void }) {
  const [notes, setNotes] = useState('')
  const m = useMutation({
    mutationFn: () => (kind === 'pay' ? api.markPayoutPaid(payout.id, notes || undefined) : api.cancelPayout(payout.id, notes || undefined)),
    onSuccess: () => { onDone(); onClose() },
  })
  return (
    <Modal title={kind === 'pay' ? 'Marcar pago como pagado' : 'Cancelar pago'} onClose={onClose}>
      <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <p className="text-sm text-slate-600">Referidor #{payout.referrerExternalId} · <b>{money(payout.amount)}</b></p>
        <Field label="Notas (opcional)"><Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <ErrorBox error={m.error} />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button type="submit" variant={kind === 'pay' ? 'primary' : 'danger'} disabled={m.isPending}>{kind === 'pay' ? 'Confirmar pago' : 'Cancelar pago'}</Button>
        </div>
      </form>
    </Modal>
  )
}

function ConfigTab() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['b-config'], queryFn: api.getConfig })
  const [f, setF] = useState({ payout: '', level: '', duration: '', expiration: '', max: '', message: '', isActive: true })
  useEffect(() => {
    const c = q.data
    if (c) setF({ payout: String(c.referrerPayoutAmount), level: String(c.referredSalonLevelId), duration: String(c.referredCommissionDurationDays), expiration: String(c.referralExpirationDays), max: c.maxReferralsPerUser?.toString() ?? '', message: c.invitationMessage ?? '', isActive: c.isActive })
  }, [q.data])
  const m = useMutation({
    mutationFn: () => api.updateConfig({
      referrerPayoutAmount: Number(f.payout), referredSalonLevelId: Number(f.level), referredCommissionDurationDays: Number(f.duration),
      referralExpirationDays: Number(f.expiration), isActive: f.isActive,
      maxReferralsPerUser: f.max === '' ? null : Number(f.max), invitationMessage: f.message === '' ? null : f.message,
    }),
    onSuccess: (c) => qc.setQueryData(['b-config'], c),
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })
  if (q.isLoading) return <Spinner />
  if (q.error) return <ErrorBox error={q.error} />
  return (
    <Card className="max-w-3xl">
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
        <Field label="Pago al referidor"><Input type="number" step="0.01" min="0" required value={f.payout} onChange={set('payout')} /></Field>
        <Field label="ID de nivel de salón del referido"><Input type="number" min="0" required value={f.level} onChange={set('level')} /></Field>
        <Field label="Duración de la comisión (días)"><Input type="number" min="1" required value={f.duration} onChange={set('duration')} /></Field>
        <Field label="Expiración del referido (días)"><Input type="number" min="1" required value={f.expiration} onChange={set('expiration')} /></Field>
        <Field label="Máx. referidos por usuario" hint="Vacío = sin límite"><Input type="number" min="1" value={f.max} onChange={set('max')} /></Field>
        <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Programa activo</label>
        <Field label="Mensaje de invitación" className="sm:col-span-2"><Textarea rows={3} value={f.message} onChange={set('message')} /></Field>
        <div className="space-y-2 sm:col-span-2">
          <ErrorBox error={m.error} />
          {m.isSuccess && <SuccessBox>Configuración guardada.</SuccessBox>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">Actualizado: {dateTime(q.data?.updatedAt)}</span>
            <Button type="submit" disabled={m.isPending}>{m.isPending ? 'Guardando…' : 'Guardar'}</Button>
          </div>
        </div>
      </form>
    </Card>
  )
}
