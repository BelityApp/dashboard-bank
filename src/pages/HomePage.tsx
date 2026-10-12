import { useAuth } from '../auth/AuthContext'

export default function HomePage() {
  const { session } = useAuth()
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <h1 className="text-4xl font-bold tracking-widest text-brand-600">Belity</h1>
      <p className="mt-3 text-lg font-light tracking-wide text-slate-500">where beauty meets you</p>
      <p className="mt-6 text-sm text-slate-400">Hi, {session?.name}! 💜</p>
    </div>
  )
}
