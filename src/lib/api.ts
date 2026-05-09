import { ADMIN_SESSION_STORAGE_KEY } from './adminSession'

/**
 * Base API (ex. `http://127.0.0.1:8000/api`). Vide = URLs relatives `/api/...` (proxy Vite → Laravel).
 */
export function getApiBaseUrl(): string {
  const v = import.meta.env.VITE_API_URL as string | undefined
  if (v && typeof v === 'string' && v.trim()) {
    return v.replace(/\/$/, '')
  }
  return ''
}

export function apiUrl(path: string): string {
  const base = getApiBaseUrl()
  const p = path.startsWith('/') ? path : `/${path}`
  if (!base) return p
  return `${base}${p}`
}

export function getStoredToken(): string | null {
  try {
    const raw = sessionStorage.getItem(ADMIN_SESSION_STORAGE_KEY)
    if (!raw) return null
    const o = JSON.parse(raw) as { token?: string }
    return typeof o.token === 'string' && o.token ? o.token : null
  } catch {
    return null
  }
}

export type ApiFetchOptions = RequestInit & {
  json?: unknown
  /** false = ne pas envoyer Bearer (login, etc.) */
  auth?: boolean
}

export async function apiFetch<T = unknown>(
  path: string,
  init: ApiFetchOptions = {},
): Promise<T> {
  const { json, auth = true, headers: initHeaders, ...rest } = init
  const headers = new Headers(initHeaders)
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json')
  }
  if (auth) {
    const token = getStoredToken()
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`)
    }
  }
  let body = rest.body
  if (json !== undefined) {
    headers.set('Content-Type', 'application/json')
    body = JSON.stringify(json)
  }
  const res = await fetch(apiUrl(path), { ...rest, headers, body })
  const text = await res.text()
  let data: unknown = null
  if (text !== '') {
    try {
      data = JSON.parse(text) as unknown
    } catch {
      data = text
    }
  }
  if (!res.ok) {
    let msg = res.statusText
    if (data && typeof data === 'object') {
      const o = data as Record<string, unknown>
      if (typeof o.message === 'string') msg = o.message
      else if (Array.isArray(o.errors)) msg = JSON.stringify(o.errors)
    }
    const err = new Error(msg) as Error & { status: number; body: unknown }
    err.status = res.status
    err.body = data
    throw err
  }
  return data as T
}
