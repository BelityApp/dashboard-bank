import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { expirePendingReferrals, getGlobalStats, processPendingReferrals } from '../api/referrals'
import { Button, Card, ErrorBox, PageHeader, Spinner, StatCard, SuccessBox, Table, Td } from '../components/ui'
import { money } from '../lib/format'

export default function ReferralsDashboardPage() {
  const qc = useQueryClient()
  const stats = useQuery({ queryKey: ['referral-stats'], queryFn: getGlobalStats })
  const [msg, setMsg] = useState<string | null>(null)
  const done = () => qc.invalidateQueries({ queryKey: ['referral-stats'] })

  const process = useMutation({
    mutationFn: processPendingReferrals,
    onSuccess: (r) => { setMsg(`Procesados: ${r.completed} completados, ${r.skipped} omitidos, ${r.expired} expirados.`); done() },
  })
  const expire = useMutation({
    mutationFn: expirePendingReferrals,
    onSuccess: (n) => { setMsg(`${n} referidos expirados.`); done() },
  })

  const s = stats.data
  return (
    <>
      <PageHeader
        title="Programa de Referidos · Dashboard"
        actions={
          <>
            <Button variant="secondary" disabled={expire.isPending} onClick={() => { setMsg(null); expire.mutate() }}>Expirar pendientes</Button>
            <Button disabled={process.isPending} onClick={() => { setMsg(null); process.mutate() }}>Procesar pendientes</Button>
          </>
        }
      />
      <div className="mb-4 space-y-2">
        {msg && <SuccessBox>{msg}</SuccessBox>}
        <ErrorBox error={process.error ?? expire.error} />
      </div>
      {stats.isLoading ? <Spinner /> : stats.error ? <ErrorBox error={stats.error} /> : s && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatCard label="Códigos" value={s.totalReferralCodes} />
            <StatCard label="Referidos" value={s.totalReferrals} />
            <StatCard label="Completados" value={s.completedReferrals} />
            <StatCard label="Pendientes" value={s.pendingReferrals} />
            <StatCard label="Expirados" value={s.expiredReferrals} />
            <StatCard label="Conversión" value={`${s.conversionRate.toFixed(1)}%`} />
            <StatCard label="Recompensas" value={money(s.totalRewardsValue)} />
          </div>
          <Card>
            <h2 className="mb-3 font-semibold">Top referidores</h2>
            <Table head={['#', 'Usuario', 'Referidos']} empty={!s.topReferrers.length}>
              {s.topReferrers.map((t, i) => (
                <tr key={t.userId}><Td>{i + 1}</Td><Td>#{t.userId}</Td><Td>{t.totalReferrals}</Td></tr>
              ))}
            </Table>
          </Card>
        </>
      )}
    </>
  )
}
