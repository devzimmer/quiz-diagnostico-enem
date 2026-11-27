import type { Session } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  /** Lança `InvalidCredentialsError` para e-mail/senha errados. */
  signIn(email: string, password: string): Promise<void>
  signOut(): Promise<void>
}

export class InvalidCredentialsError extends Error {}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!supabase) return void setLoading(false)
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next))
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase não configurado')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) return
    if (error.status === 400) throw new InvalidCredentialsError(error.message)
    throw error
  }, [])

  const signOut = useCallback(async () => {
    await supabase?.auth.signOut()
    // Garante a saída na tela mesmo se o servidor de auth não responder.
    setSession(null)
    queryClient.removeQueries({ queryKey: ['admin'] })
  }, [queryClient])

  const value = useMemo(
    () => ({ session, loading, signIn, signOut }),
    [session, loading, signIn, signOut],
  )
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
