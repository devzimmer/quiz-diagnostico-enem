export type Env = {
  HYPERDRIVE: Hyperdrive
  SUPABASE_URL: string
  /** Segredo HS256 do Supabase (ambiente local). Em produção com chaves assimétricas, usa-se o JWKS. */
  SUPABASE_JWT_SECRET?: string
  /** Origens permitidas no CORS, separadas por vírgula. */
  ALLOWED_ORIGINS?: string
  SUBMISSION_LIMITER?: RateLimit
}
