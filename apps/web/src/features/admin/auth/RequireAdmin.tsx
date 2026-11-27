import { Loader2, ShieldAlert } from 'lucide-react'
import { Navigate, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from './AuthProvider'

/** Só renderiza o painel com sessão de admin; sem sessão, manda para o login guardando a rota. */
export function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { session, loading, signOut } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-painel-fundo" role="status">
        <Loader2 aria-hidden className="size-6 animate-spin text-marca" />
        <span className="sr-only">Carregando…</span>
      </div>
    )
  }
  if (!session) {
    const next = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/admin/login?next=${next}`} replace />
  }
  // A API é quem garante o acesso; aqui é só para não mostrar um painel que vai falhar.
  if (session.user.app_metadata.role !== 'admin') {
    return (
      <main className="grid min-h-dvh place-items-center bg-painel-fundo p-6 font-admin text-painel-texto">
        <div className="flex max-w-sm flex-col items-center gap-3 text-center">
          <ShieldAlert aria-hidden className="size-10 text-erro" />
          <h1 className="text-xl font-bold">Sem acesso ao painel</h1>
          <p className="text-[15px] text-painel-sub">
            A conta {session.user.email} não tem permissão de administrador.
          </p>
          <Button variant="secondary" onClick={() => void signOut()}>
            Entrar com outra conta
          </Button>
        </div>
      </main>
    )
  }
  return <>{children}</>
}
