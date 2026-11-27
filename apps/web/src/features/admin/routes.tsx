import { useEffect } from 'react'
import { Outlet, type RouteObject, useRoutes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RequireAdmin } from './auth/RequireAdmin'
import { AdminLayout } from './layout/AdminLayout'
import { LeadDrawer } from './leads/LeadDrawer'
import { LeadsPage } from './leads/LeadsPage'
import { QuestionEditorDrawer } from './questions/QuestionEditorDrawer'
import { QuestionsPage } from './questions/QuestionsPage'

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
          {
            path: 'perguntas',
            element: <QuestionsPage />,
            children: [
              { index: true, element: null },
              { path: 'nova', element: <QuestionEditorDrawer /> },
              { path: ':id', element: <QuestionEditorDrawer /> },
            ],
          },
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
