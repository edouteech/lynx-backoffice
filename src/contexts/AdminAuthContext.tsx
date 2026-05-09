/* eslint-disable react-refresh/only-export-components -- Provider + hook même fichier */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { ADMIN_SESSION_STORAGE_KEY } from '../lib/adminSession'
import { apiFetch } from '../lib/api'
import type { ApiAdminUser } from '../types/apiAdmin'

type StoredSession = {
  token: string
  user: ApiAdminUser
}

type AdminAuthContextValue = {
  user: ApiAdminUser | null
  bootstrapping: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null)

function readSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as StoredSession
    if (o?.token && o?.user?.email) return o
    return null
  } catch {
    return null
  }
}

function writeSession(s: StoredSession | null) {
  if (!s) {
    sessionStorage.removeItem(ADMIN_SESSION_STORAGE_KEY)
    return
  }
  sessionStorage.setItem(ADMIN_SESSION_STORAGE_KEY, JSON.stringify(s))
}

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<ApiAdminUser | null>(null)
  const [bootstrapping, setBootstrapping] = useState(true)

  useEffect(() => {
    let cancelled = false
    const existing = readSession()
    if (!existing?.token) {
      queueMicrotask(() => {
        if (!cancelled) setBootstrapping(false)
      })
      return () => {
        cancelled = true
      }
    }

    ;(async () => {
      try {
        const fresh = await apiFetch<ApiAdminUser>('/auth/user', {
          headers: { Authorization: `Bearer ${existing.token}` },
        })
        if (!fresh.platform_role?.slug) {
          writeSession(null)
          if (!cancelled) setUser(null)
          return
        }
        writeSession({ token: existing.token, user: fresh })
        if (!cancelled) setUser(fresh)
      } catch {
        writeSession(null)
        if (!cancelled) setUser(null)
      } finally {
        if (!cancelled) setBootstrapping(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiFetch<{ token: string; user: ApiAdminUser }>(
      '/auth/login',
      {
        method: 'POST',
        json: { email: email.trim(), password },
        auth: false,
      },
    )
    if (!res.user?.platform_role?.slug) {
      throw new Error(
        'Ce compte n’a pas le rôle Admin (plateforme). Accès refusé.',
      )
    }
    writeSession({ token: res.token, user: res.user })
    setUser(res.user)
  }, [])

  const logout = useCallback(async () => {
    const s = readSession()
    if (s?.token) {
      try {
        await apiFetch('/auth/logout', { method: 'POST' })
      } catch {
        // on vide la session locale même si l’API échoue
      }
    }
    writeSession(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, bootstrapping, login, logout }),
    [user, bootstrapping, login, logout],
  )

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext)
  if (!ctx) {
    throw new Error('useAdminAuth doit être utilisé dans AdminAuthProvider')
  }
  return ctx
}
