/** Destino pós-login vindo de `?next=`: só rotas do próprio painel (evita open redirect). */
export function safeNextPath(value: string | null): string {
  if (!value || !/^\/admin(?:[/?#]|$)/.test(value)) return '/admin'
  if (value.includes('\\') || value.startsWith('/admin/login')) return '/admin'
  return value
}
