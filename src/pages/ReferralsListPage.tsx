import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { activateReferralCode, deactivateReferralCode, getAllReferrals, getReferralById, getUserStats, searchReferred, searchReferrers, updateReferralStatus } from '../api/referrals'
import type { Referral, ReferralFilters } from '../api/types'
import { SearchField, userOptions } from '../components/SearchField'
import { Badge, Button, ErrorBox, Field, FilterBar, Input, Modal, PageHeader, Pagination, Select, Spinner, StatCard, statusTone, Table, Td } from '../components/ui'
import { dateTime, endOfDayIso, money, startOfDayIso } from '../lib/format'

export default function ReferralsListPage() {
  const qc = useQueryClient()
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [draft, setDraft] = useState({ status: '', code: '', start: '', end: '' })
  const [referrer, setReferrer] = useState<string | null>(null)
  const [referred, setReferred] = useState<string | null>(null)
  const [resetKey, setResetKey] = useState(0)
  const [filters, setFilters] = useState<ReferralFilters>({})
  const [detail, setDetail] = useState<string | null>(null)
  const [statsFor, setStatsFor] = useState<number | null>(null)

  const q = useQuery({ queryKey: ['referrals', page, limit, filters], queryFn: () => getAllReferrals(page, limit, filters) })

  const apply = () => {
    setPage(1)
    setFilters({
      status: draft.status || undefined,
      code: draft.code || undefined,
      referrerId: referrer ? Number(referrer) : undefined,
      referredId: referred ? Number(referred) : undefined,
      startDate: startOfDayIso(draft.start),
      endDate: endOfDayIso(draft.end),
    })
  }
  const clear = () => {
    setDraft({ status: '', code: '', start: '', end: '' })
    setReferrer(null); setReferred(null); setResetKey((k) => k + 1)
    setPage(1); setFilters({})
  }

  const setStatus = useMutation({
    mutationFn: (v: { id: string; status: string }) => updateReferralStatus(v.id, v.status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['referrals'] }),
  })
  const toggleCode = useMutation({
    mutationFn: (v: { userId: number; activate: boolean }) => (v.activate ? activateReferralCode(v.userId) : deactivateReferralCode(v.userId)),
  })

  const confirmStatus = (r: Referral, status: string) => {
    if (window.confirm(`¿Cambiar el estado del referido a ${status}?`)) setStatus.mutate({ id: r.id, status })
  }

  return (
    <>
      <PageHeader title="Programa de Referidos · Referidos" />
      <FilterBar onApply={apply} onClear={clear}>
        <Field label="Estado">
          <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Todos</option>
            {['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELED'].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Código"><Input value={draft.code} onChange={(e) => setDraft({ ...draft, code: e.target.value })} /></Field>
        <SearchField label="Referidor" resetKey={resetKey} onSearch={async (s) => userOptions(await searchReferrers(s))} onSelect={setReferrer} />
        <SearchField label="Referido" resetKey={resetKey} onSearch={async (s) => userOptions(await searchReferred(s))} onSelect={setReferred} />
        <Field label="Desde"><Input type="date" value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></Field>
        <Field label="Hasta"><Input type="date" value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></Field>
      </FilterBar>

      <div className="mb-3 space-y-2"><ErrorBox error={setStatus.error ?? toggleCode.error} /></div>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data && (
        <>
          <Table head={['Código', 'Referidor', 'Referido', 'Estado', 'Creado', 'Completado', 'Expira', 'Recompensa', 'Acciones']} empty={!q.data.data.length}>
            {q.data.data.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td className="font-mono">{r.code}</Td>
                <Td><button className="text-brand-700 hover:underline" onClick={() => setStatsFor(r.referrerId)}>#{r.referrerId}</button></Td>
                <Td>#{r.referredId}</Td>
                <Td><Badge tone={statusTone(r.status) as 'gray'}>{r.status}</Badge></Td>
                <Td>{dateTime(r.createdAt)}</Td>
                <Td>{dateTime(r.completedAt)}</Td>
                <Td>{dateTime(r.expiresAt)}</Td>
                <Td>{r.rewardGranted ? `Sí (${r.totalRewards})` : 'No'}</Td>
                <Td>
                  <div className="flex gap-1">
                    <Button variant="ghost" onClick={() => setDetail(r.id)}>Ver</Button>
                    {r.status !== 'COMPLETED' && <Button variant="ghost" onClick={() => confirmStatus(r, 'COMPLETED')}>Completar</Button>}
                    {r.status !== 'PENDING' && <Button variant="ghost" onClick={() => confirmStatus(r, 'PENDING')}>Pendiente</Button>}
                  </div>
                </Td>
              </tr>
            ))}
          </Table>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1) }} />
        </>
      )}

      {detail && <DetailDialog id={detail} onClose={() => setDetail(null)} />}
      {statsFor !== null && (
        <UserStatsDialog userId={statsFor} onClose={() => setStatsFor(null)} onToggle={(activate) => toggleCode.mutate({ userId: statsFor, activate }, { onSuccess: () => qc.invalidateQueries({ queryKey: ['user-stats', statsFor] }) })} busy={toggleCode.isPending} />
      )}
    </>
  )
}

function DetailDialog({ id, onClose }: { id: string; onClose: () => void }) {
  const q = useQuery({ queryKey: ['referral', id], queryFn: () => getReferralById(id) })
  const r = q.data
  return (
    <Modal title="Detalle de referido" onClose={onClose}>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : r && (
        <dl className="grid grid-cols-3 gap-y-2 text-sm">
          {([
            ['ID', r.id], ['Código', r.code], ['Estado', r.status], ['Referidor', `#${r.referrerId}`], ['Referido', `#${r.referredId}`],
            ['Creado', dateTime(r.createdAt)], ['Completado', dateTime(r.completedAt)], ['Expira', dateTime(r.expiresAt)],
            ['Recompensa otorgada', r.rewardGranted ? 'Sí' : 'No'], ['Total recompensas', r.totalRewards], ['Actualizado', dateTime(r.updatedAt)],
          ] as [string, React.ReactNode][]).map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-slate-500">{k}</dt><dd className="col-span-2 break-all">{v}</dd></div>
          ))}
        </dl>
      )}
    </Modal>
  )
}

function UserStatsDialog({ userId, onClose, onToggle, busy }: { userId: number; onClose: () => void; onToggle: (activate: boolean) => void; busy: boolean }) {
  const q = useQuery({ queryKey: ['user-stats', userId], queryFn: () => getUserStats(userId) })
  const s = q.data
  return (
    <Modal title={`Estadísticas del usuario #${userId}`} onClose={onClose} wide>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : s && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div>Código: <b className="font-mono">{s.code}</b> <Badge tone={s.isActive ? 'green' : 'red'}>{s.isActive ? 'Activo' : 'Inactivo'}</Badge></div>
            <Button variant={s.isActive ? 'danger' : 'primary'} disabled={busy} onClick={() => onToggle(!s.isActive)}>{s.isActive ? 'Desactivar código' : 'Activar código'}</Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCard label="Total" value={s.totalReferrals} />
            <StatCard label="Completados" value={s.completedReferrals} />
            <StatCard label="Pendientes" value={s.pendingReferrals} />
            <StatCard label="Expirados" value={s.expiredReferrals} />
            <StatCard label="Recompensas ganadas" value={money(s.totalRewardsEarned)} />
            <StatCard label="Último referido" value={<span className="text-base">{dateTime(s.lastReferralDate)}</span>} />
          </div>
        </>
      )}
    </Modal>
  )
}
