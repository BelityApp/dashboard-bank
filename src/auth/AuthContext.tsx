import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { signIn } from '../api/auth'
import { setUnauthorizedHandler, tokenStore } from '../api/http'
import type { UserSession } from '../api/types'

interface AuthValue {
  session: UserSession | null
  login: (email: string, password: string) => Promise<void>
  logout: () => void
}

const Ctx = createContext<AuthValue | null>(null)

function loadSession(): UserSession | null {
  try {
    const raw = localStorage.getItem(tokenStore.sessionKey)
    if (!raw || !tokenStore.get()) return null
    return JSON.parse(raw) as UserSession
  } catch {
    return null
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(loadSession)

  const logout = useCallback(() => {
    tokenStore.clear()
    setSession(null)
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const s = await signIn(email, password)
    tokenStore.set(s.accessToken)
    localStorage.setItem(tokenStore.sessionKey, JSON.stringify(s))
    setSession(s)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  const value = useMemo(() => ({ session, login, logout }), [session, login, logout])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth must be used within AuthProvider')
  return v
}
