import { config } from '../config'
import { ApiError, request } from './http'
import type { UserSession } from './types'

interface SignInResponse {
  data: {
    token: string
    user: { id: string | number; name: string; lastname: string; roles: string[] }
  }
}

// POST {AUTH}/api/auth/sign-in
export async function signIn(email: string, password: string): Promise<UserSession> {
  try {
    const json = await request<SignInResponse>('/api/auth/sign-in', {
      method: 'POST',
      baseUrl: config.msAuthUrl,
      auth: false,
      body: { email, password, source: 'dashboard' },
      errors: {
        400: 'Credenciales inválidas.',
        401: 'Credenciales inválidas.',
        403: 'Tu cuenta no tiene permisos para acceder al dashboard.',
        404: 'Credenciales inválidas.',
        429: 'Demasiados intentos. Espera un momento e inténtalo de nuevo.',
      },
    })
    const { token, user } = json.data
    return {
      id: Number(user.id),
      name: user.name,
      lastName: user.lastname,
      accessToken: token,
      roles: user.roles,
    }
  } catch (e) {
    if (e instanceof ApiError) throw e
    throw new Error('Respuesta de login inválida')
  }
}
