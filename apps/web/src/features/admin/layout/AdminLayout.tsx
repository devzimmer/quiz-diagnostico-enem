import { LogOut } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useAuth } from '../auth/AuthProvider'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'rounded-lg px-3 py-2 text-sm font-semibold no-underline transition-colors',
    isActive ? 'bg-marca-suave text-marca' : 'text-[#3B4866] hover:bg-[#EFF2F8]',
  )

export function AdminLayout() {
  const { session, signOut } = useAuth()
  const { pathname } = useLocation()
  return (
    <div className="min-h-dvh bg-painel-fundo font-admin text-painel-texto">
      <header className="border-b border-painel-borda bg-white">
        <div className="mx-auto flex min-h-16 max-w-[1280px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
          <Logo className="h-8" />
          <nav aria-label="Principal" className="flex gap-1">
            {/* Leads continua ativo no detalhe (/admin/leads/:id) */}
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                navClass({ isActive: isActive || pathname.startsWith('/admin/leads') })
              }
              end
            >
              Leads
            </NavLink>
            <NavLink to="/admin/perguntas" className={navClass}>
              Perguntas
            </NavLink>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-painel-sub sm:inline">{session?.user.email}</span>
            <Button variant="secondary" size="sm" onClick={() => void signOut()}>
              <LogOut aria-hidden />
              Sair
            </Button>
          </div>
        </div>
      </header>
      <Outlet />
    </div>
  )
}
