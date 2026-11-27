export type AuthUser = { id: string; email: string | null; role: string | null }

/** Valida um JWT de acesso e devolve o usuário; lança HttpError 401 se inválido. */
export type VerifyToken = (token: string) => Promise<AuthUser>
