import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { getReferralConfig, updateReferralConfig } from '../api/referrals'
import { Button, Card, ErrorBox, Field, Input, PageHeader, Spinner, SuccessBox, Textarea } from '../components/ui'
import { dateTime } from '../lib/format'

export default function ReferralsConfigPage() {
  const qc = useQueryClient()
  const q = useQuery({ queryKey: ['referral-config'], queryFn: getReferralConfig })
  const [f, setF] = useState({ referrerRewardValue: '', referredRewardValue: '', referralExpirationDays: '', creditExpirationDays: '', maxReferralsPerUser: '', maxRewardPerMonth: '', isActive: true, invitationMessage: '', storeUrl: '' })

  useEffect(() => {
    const c = q.data
    if (c) setF({
      referrerRewardValue: String(c.referrerRewardValue), referredRewardValue: String(c.referredRewardValue),
      referralExpirationDays: String(c.referralExpirationDays), creditExpirationDays: String(c.creditExpirationDays),
      maxReferralsPerUser: c.maxReferralsPerUser?.toString() ?? '', maxRewardPerMonth: c.maxRewardPerMonth?.toString() ?? '',
      isActive: c.isActive, invitationMessage: c.invitationMessage ?? '', storeUrl: c.storeUrl ?? '',
    })
  }, [q.data])

  const m = useMutation({
    mutationFn: () => updateReferralConfig({
      referrerRewardValue: Number(f.referrerRewardValue), referredRewardValue: Number(f.referredRewardValue),
      referralExpirationDays: Number(f.referralExpirationDays), creditExpirationDays: Number(f.creditExpirationDays),
      ...(f.maxReferralsPerUser ? { maxReferralsPerUser: Number(f.maxReferralsPerUser) } : {}),
      ...(f.maxRewardPerMonth ? { maxRewardPerMonth: Number(f.maxRewardPerMonth) } : {}),
      isActive: f.isActive,
      ...(f.invitationMessage ? { invitationMessage: f.invitationMessage } : {}),
      ...(f.storeUrl ? { storeUrl: f.storeUrl } : {}),
    }),
    onSuccess: (c) => qc.setQueryData(['referral-config'], c),
  })
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value })

  return (
    <>
      <PageHeader title="Programa de Referidos · Configuración" />
      {q.isLoading ? <Spinner /> : q.error ? <ErrorBox error={q.error} /> : (
        <Card className="max-w-3xl">
          <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => { e.preventDefault(); m.mutate() }}>
            <Field label="Recompensa referidor"><Input type="number" step="0.01" min="0" required value={f.referrerRewardValue} onChange={set('referrerRewardValue')} /></Field>
            <Field label="Recompensa referido"><Input type="number" step="0.01" min="0" required value={f.referredRewardValue} onChange={set('referredRewardValue')} /></Field>
            <Field label="Días de expiración del referido"><Input type="number" min="1" required value={f.referralExpirationDays} onChange={set('referralExpirationDays')} /></Field>
            <Field label="Días de expiración del crédito"><Input type="number" min="1" required value={f.creditExpirationDays} onChange={set('creditExpirationDays')} /></Field>
            <Field label="Máx. referidos por usuario" hint="Vacío = sin límite"><Input type="number" min="1" value={f.maxReferralsPerUser} onChange={set('maxReferralsPerUser')} /></Field>
            <Field label="Máx. recompensa por mes" hint="Vacío = sin límite"><Input type="number" step="0.01" min="0" value={f.maxRewardPerMonth} onChange={set('maxRewardPerMonth')} /></Field>
            <Field label="URL de la tienda" className="sm:col-span-2"><Input type="url" value={f.storeUrl} onChange={set('storeUrl')} /></Field>
            <Field label="Mensaje de invitación" className="sm:col-span-2"><Textarea rows={3} value={f.invitationMessage} onChange={set('invitationMessage')} /></Field>
            <label className="flex items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={f.isActive} onChange={(e) => setF({ ...f, isActive: e.target.checked })} /> Programa activo</label>
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
      )}
    </>
  )
}
