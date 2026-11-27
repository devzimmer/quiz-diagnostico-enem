import { useEffect } from 'react'
import { Outlet, type RouteObject, useRoutes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout } from './layout/AdminLayout'
import { LeadDrawer } from './leads/LeadDrawer'
import { LeadsPage } from './leads/LeadsPage'

const EmBreve = ({ titulo }: { titulo: string }) => (
  <main className="mx-auto max-w-[1280px] px-4 py-8 sm:px-6">
    <h1 className="text-[28px] font-bold tracking-tight">{titulo}</h1>
  </main>
)

/** Rotas do painel; carregadas sob demanda para não pesar no bundle do quiz. */
export const adminRoutes: RouteObject[] = [
  {
    element: (
      <AuthProvider>
        <Outlet />
      </AuthProvider>
    ),
    children: [
      { path: 'login', element: <LoginPage /> },
      {
        element: (
          <RequireAdmin>
            <AdminLayout />
          </RequireAdmin>
        ),
        children: [
          {
            element: <LeadsPage />,
            children: [
              { index: true, element: null },
              { path: 'leads/:id', element: <LeadDrawer /> },
            ],
          },
          { path: 'perguntas', element: <EmBreve titulo="Perguntas" /> },
          { path: 'perguntas/nova', element: <EmBreve titulo="Nova pergunta" /> },
          { path: 'perguntas/:id', element: <EmBreve titulo="Editar pergunta" /> },
        ],
      },
    ],
  },
]

/** Ponto de entrada do painel, montado em `/admin/*`. */
export function AdminApp() {
  useEffect(() => {
    const previous = document.title
    document.title = 'Painel de leads — Plataforma Assaad'
    return () => {
      document.title = previous
    }
  }, [])
  return useRoutes(adminRoutes)
}
