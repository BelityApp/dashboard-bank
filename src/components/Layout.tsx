import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const groups = [
  {
    title: 'Bank',
    items: [
      { to: '/giftcards', label: 'Giftcards' },
      { to: '/transactions', label: 'Transacciones' },
    ],
  },
  {
    title: 'Programa Referidos',
    items: [
      { to: '/referrals/dashboard', label: 'Dashboard' },
      { to: '/referrals/list', label: 'Referidos' },
      { to: '/referrals/rewards', label: 'Recompensas' },
      { to: '/referrals/config', label: 'Configuración' },
    ],
  },
]

export default function Layout() {
  const { session, logout } = useAuth()
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
        <NavLink to="/home" className="px-5 py-5 text-xl font-bold tracking-widest text-brand-600">
          Belity
        </NavLink>
        <nav className="flex-1 space-y-4 overflow-y-auto px-3">
          {groups.map((g) => (
            <div key={g.title}>
              <div className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{g.title}</div>
              {g.items.map((i) => (
                <NavLink
                  key={i.to}
                  to={i.to}
                  className={({ isActive }) =>
                    `block rounded-lg px-3 py-2 text-sm ${isActive ? 'bg-brand-50 font-medium text-brand-700' : 'text-slate-600 hover:bg-slate-50'}`
                  }
                >
                  {i.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="border-t border-slate-200 p-3">
          <div className="mb-2 truncate px-2 text-xs text-slate-500">
            {session?.name} {session?.lastName}
          </div>
          <button onClick={logout} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">
            Cerrar sesión
          </button>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  )
}
