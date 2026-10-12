import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { getAllRewards } from '../api/referrals'
import { Badge, ErrorBox, Field, FilterBar, Input, PageHeader, Pagination, Select, Spinner, statusTone, Table, Td } from '../components/ui'
import { dateTime, money, toInt } from '../lib/format'

export default function RewardsPage() {
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [draft, setDraft] = useState({ status: '', userId: '', type: '' })
  const [filters, setFilters] = useState<{ status?: string; userId?: number }>({})
  const [type, setType] = useState('')

  const q = useQuery({ queryKey: ['rewards', page, limit, filters], queryFn: () => getAllRewards(page, limit, filters) })
  // The API only filters by status/userId; reward type is filtered client-side on the current page.
  const rows = q.data?.data.filter((r) => !type || r.rewardType === type) ?? []

  return (
    <>
      <PageHeader title="Programa de Referidos · Recompensas" />
      <FilterBar
        onApply={() => { setPage(1); setType(draft.type); setFilters({ status: draft.status || undefined, userId: toInt(draft.userId) }) }}
        onClear={() => { setDraft({ status: '', userId: '', type: '' }); setType(''); setPage(1); setFilters({}) }}
      >
        <Field label="Estado">
          <Select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
            <option value="">Todos</option>{['PENDING', 'APPLIED', 'EXPIRED'].map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Tipo (página actual)">
          <Select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
            <option value="">Todos</option><option value="REFERRER_REWARD">Referidor</option><option value="REFERRED_REWARD">Referido</option>
          </Select>
        </Field>
        <Field label="ID de usuario"><Input type="number" value={draft.userId} onChange={(e) => setDraft({ ...draft, userId: e.target.value })} /></Field>
      </FilterBar>
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : q.data && (
        <>
          <Table head={['Usuario', 'Tipo', 'Valor', 'Estado', 'Referidor', 'Referido', 'Creada', 'Aplicada', 'Expira']} empty={!rows.length}>
            {rows.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50">
                <Td>#{r.userId}</Td>
                <Td><Badge tone={r.rewardType === 'REFERRER_REWARD' ? 'purple' : 'blue'}>{r.rewardType === 'REFERRER_REWARD' ? 'Referidor' : 'Referido'}</Badge></Td>
                <Td className="font-medium">{money(r.rewardValue)}</Td>
                <Td><Badge tone={statusTone(r.status) as 'gray'}>{r.status}</Badge></Td>
                <Td>#{r.referrerId}</Td><Td>#{r.referredId}</Td>
                <Td>{dateTime(r.createdAt)}</Td><Td>{dateTime(r.appliedAt)}</Td><Td>{dateTime(r.expiresAt)}</Td>
              </tr>
            ))}
          </Table>
          <Pagination page={q.data.page} totalPages={q.data.totalPages} total={q.data.total} limit={limit} onPage={setPage} onLimit={(l) => { setLimit(l); setPage(1) }} />
        </>
      )}
    </>
  )
}
