import { config } from '../config'

const TOKEN_KEY = 'access_token'
const SESSION_KEY = 'user_session'

export const tokenStore = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (t: string) => localStorage.setItem(TOKEN_KEY, t),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(SESSION_KEY)
  },
  sessionKey: SESSION_KEY,
}

export class ApiError extends Error {
  status: number
  body: string
  constructor(status: number, message: string, body = '') {
    super(message)
    this.status = status
    this.body = body
  }
}

let onUnauthorized: (() => void) | null = null
export const setUnauthorizedHandler = (fn: (() => void) | null) => {
  onUnauthorized = fn
}

type Query = Record<string, string | number | boolean | undefined | null>

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'
  query?: Query
  body?: unknown
  baseUrl?: string
  auth?: boolean
  /** Map status code -> friendly message */
  errors?: Record<number, string | ((body: string) => string)>
}

const defaultErrors: Record<number, string> = {
  401: 'No autorizado. Inicia sesión con una cuenta autorizada.',
  403: 'No tienes permisos para realizar esta acción.',
  404: 'Recurso no encontrado.',
  500: 'Algo salió mal. Inténtalo de nuevo más tarde.',
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, baseUrl = config.msBankUrl, auth = true, errors } = opts
  const url = new URL(baseUrl + path)
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
    }
  }
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  }
  const token = tokenStore.get()
  if (auth && token) headers.Authorization = `Bearer ${token}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (e) {
    throw new ApiError(0, `Error de red: ${(e as Error).message}`)
  }

  if (res.ok) {
    const text = await res.text()
    return (text ? JSON.parse(text) : undefined) as T
  }

  const text = await res.text()
  if (res.status === 401 && auth) onUnauthorized?.()
  const custom = errors?.[res.status]
  const msg =
    typeof custom === 'function'
      ? custom(text)
      : (custom ?? defaultErrors[res.status] ?? `Error ${res.status}`)
  throw new ApiError(res.status, msg, text)
}
