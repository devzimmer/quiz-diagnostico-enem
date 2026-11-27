import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase'
import { type AdminFetch, createAdminFetch } from './admin-fetch'
import { useAuth } from './auth/AuthProvider'

/** Cliente da API admin: token da sessão atual, 401 → login com aviso, 403 → toast. */
export function useAdminApi(): AdminFetch {
  const { signOut } = useAuth()
  const navigate = useNavigate()
  return useMemo(
    () =>
      createAdminFetch({
        getToken: async () => (await supabase?.auth.getSession())?.data.session?.access_token,
        onUnauthorized: async () => {
          await signOut()
          navigate('/admin/login?expired=1', { replace: true })
        },
        onForbidden: () =>
          toast.error('Seu usuário não tem acesso ao painel.', { id: 'admin-forbidden' }),
      }),
    [signOut, navigate],
  )
}
