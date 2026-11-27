import { zodResolver } from '@hookform/resolvers/zod'
import { CircleAlert, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { z } from 'zod'
import { Logo } from '@/components/Logo'
import { Button } from '@/components/ui/button'
import { FieldError, Input, Label } from '@/components/ui/field'
import { supabase } from '@/lib/supabase'
import { InvalidCredentialsError, useAuth } from './AuthProvider'
import { safeNextPath } from './next-path'

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Informe o e-mail.').email('E-mail inválido.'),
  password: z.string().min(1, 'Informe a senha.'),
})
type LoginInput = z.infer<typeof loginSchema>

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const next = safeNextPath(params.get('next'))
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(
    params.get('expired') === '1' ? 'Sua sessão expirou. Entre de novo.' : null,
  )

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })
  const { errors, isSubmitting } = form.formState

  if (!loading && session) return <Navigate to={next} replace />

  const onSubmit = form.handleSubmit(async ({ email, password }) => {
    setFormError(null)
    try {
      await signIn(email, password)
      navigate(next, { replace: true })
    } catch (error) {
      setFormError(
        error instanceof InvalidCredentialsError
          ? 'E-mail ou senha incorretos.'
          : 'Não foi possível entrar agora. Tente de novo em instantes.',
      )
    }
  })

  return (
    <main className="flex min-h-dvh items-center justify-center bg-painel-fundo px-4 py-12 font-admin text-painel-texto">
      <div className="flex w-full max-w-[420px] flex-col gap-6">
        <div className="flex flex-col items-center gap-4 text-center">
          <Logo className="h-10" />
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Painel de leads</h1>
            <p className="mt-1.5 text-[15px] text-painel-sub">
              Entre com a conta do time comercial.
            </p>
          </div>
        </div>

        <form
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-[18px] rounded-2xl border border-painel-borda bg-white p-7 shadow-[0_1px_2px_rgba(20,37,77,.04),0_8px_24px_rgba(20,37,77,.06)]"
        >
          {!supabase && (
            <p role="alert" className="text-sm text-erro">
              Login indisponível: configure VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.
            </p>
          )}
          {formError && (
            <div
              role="alert"
              className="flex items-center gap-2.5 rounded-[10px] border border-erro-borda bg-erro-fundo px-3.5 py-3 text-sm text-[#A30A00]"
            >
              <CircleAlert aria-hidden className="size-[18px] shrink-0" />
              {formError}
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adm-email">E-mail</Label>
            <Input
              id="adm-email"
              type="email"
              autoComplete="username"
              className="h-[46px]"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'adm-email-erro' : undefined}
              {...form.register('email')}
            />
            <FieldError id="adm-email-erro">{errors.email?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adm-senha">Senha</Label>
            <div className="relative">
              <Input
                id="adm-senha"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                className="h-[46px] pr-12"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? 'adm-senha-erro' : undefined}
                {...form.register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                aria-pressed={showPassword}
                className="absolute right-0.5 top-px flex size-11 items-center justify-center rounded-lg text-painel-sub hover:bg-[#EFF2F8]"
              >
                {showPassword ? (
                  <EyeOff aria-hidden className="size-5" />
                ) : (
                  <Eye aria-hidden className="size-5" />
                )}
              </button>
            </div>
            <FieldError id="adm-senha-erro">{errors.password?.message}</FieldError>
          </div>

          <Button type="submit" size="lg" disabled={isSubmitting || !supabase}>
            {isSubmitting && <Loader2 aria-hidden className="animate-spin" />}
            {isSubmitting ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="text-center text-[13px] text-painel-sub">
          Acesso restrito. Usuários são criados pelo time de tecnologia.
        </p>
      </div>
    </main>
  )
}
