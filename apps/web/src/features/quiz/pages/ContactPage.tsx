import { zodResolver } from '@hookform/resolvers/zod'
import { type LeadInput, leadInputSchema } from '@quiz/shared'
import { ArrowLeft, ArrowRight, Check, Loader2, Lock } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import type { z } from 'zod'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FieldError } from '@/components/ui/field'
import { ApiError } from '@/lib/api-client'
import { formatPhone } from '@/lib/format'
import { cn } from '@/lib/utils'
import { QuizShell } from '../components/QuizLayout'
import { QuestionSkeleton, QuizLoadError } from '../components/QuizStates'
import { useSubmitQuiz } from '../hooks'
import { useSyncedQuiz } from '../useSyncedQuiz'

type FormInput = z.input<typeof leadInputSchema>
const FIELDS = ['name', 'email', 'phone'] as const

const inputClass =
  'h-[52px] w-full rounded-xl border-2 border-azul-claro bg-white px-4 text-base text-tinta outline-none transition placeholder:text-tinta-2/60 focus:border-azul-fundo focus:ring-4 focus:ring-azul-fundo/15 disabled:opacity-60 aria-[invalid=true]:border-[#D90D00] aria-[invalid=true]:bg-[#FFF6F5]'

export function ContactPage() {
  const navigate = useNavigate()
  const { query, quiz, state, dispatch } = useSyncedQuiz()
  const submit = useSubmitQuiz()
  const [pendingLead, setPendingLead] = useState<LeadInput | null>(null)

  const form = useForm<FormInput, unknown, LeadInput>({
    resolver: zodResolver(leadInputSchema),
    mode: 'onTouched',
    defaultValues: { name: '', email: '', phone: '' },
  })
  const { errors } = form.formState

  if (query.isError && !quiz) {
    return <QuizLoadError onRetry={() => query.refetch()} retrying={query.isFetching} />
  }
  if (!quiz) return <QuestionSkeleton />
  if (state.result) return <Navigate to="/quiz/resultado" replace />
  const allAnswered = quiz.questions.every((q) => state.answers[q.id])
  if (!allAnswered) return <Navigate to="/quiz" replace />

  const send = (lead: LeadInput, confirmReplace = false) =>
    submit.mutate(
      {
        lead,
        answers: quiz.questions.map((q) => ({ questionId: q.id, optionId: state.answers[q.id]! })),
        ...(confirmReplace ? { confirmReplace: true } : {}),
      },
      {
        onSuccess: (result) => {
          setPendingLead(null)
          dispatch({ type: 'finish', result, lead: { name: lead.name, phone: lead.phone } })
          navigate('/quiz/resultado', { replace: true })
        },
        onError: (error) => {
          if (!(error instanceof ApiError))
            return void toast.error('Algo deu errado. Tente de novo.')
          switch (error.code) {
            case 'LEAD_ALREADY_SUBMITTED':
              setPendingLead(lead)
              return
            case 'VALIDATION_ERROR': {
              setPendingLead(null)
              let mapped = false
              for (const field of FIELDS) {
                const message = error.fieldErrors[`lead.${field}`]?.[0]
                if (message) {
                  form.setError(field, { message }, { shouldFocus: !mapped })
                  mapped = true
                }
              }
              if (!mapped) toast.error(error.message)
              return
            }
            case 'QUIZ_OUTDATED':
              setPendingLead(null)
              toast.info('O quiz foi atualizado. Vamos recomeçar com as perguntas novas.')
              dispatch({ type: 'reset' })
              navigate('/', { replace: true })
              return
            default:
              setPendingLead(null)
              toast.error('Não foi possível enviar', {
                description:
                  error.code === 'RATE_LIMITED'
                    ? error.message
                    : 'Suas respostas continuam salvas. Tente de novo em instantes.',
              })
          }
        },
      },
    )

  const sending = submit.isPending

  return (
    <QuizShell>
      <header className="flex h-11 items-center justify-between">
        <Link
          to="/quiz"
          className="-ml-1 flex h-11 items-center gap-1.5 pr-2 text-[15px] font-semibold text-azul-texto hover:text-azul-esc"
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={2.5} />
          Revisar respostas
        </Link>
        <span className="flex items-center gap-1.5 rounded-full bg-[#C9F5D6] px-2.5 py-1.5 text-[13px] font-bold text-[#065E28]">
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
          {quiz.questions.length} de {quiz.questions.length}
        </span>
      </header>

      <div className="mt-7">
        <span className="selo">Último passo</span>
      </div>
      <h1 className="mt-4 font-display text-[36px] uppercase leading-[1.08]">
        Seu diagnóstico <span className="marca-texto">está pronto</span>
      </h1>
      <p className="mt-3 text-base leading-relaxed text-tinta-2">
        Deixe seu contato para ver o resultado. Nosso time pode te chamar para montar um plano com
        você.
      </p>

      <form
        id="lead-form"
        noValidate
        onSubmit={form.handleSubmit((lead) => send(lead))}
        className="mt-6 flex flex-col gap-4"
      >
        <fieldset disabled={sending} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="name" className="text-sm font-semibold">
              Nome completo
            </label>
            <input
              id="name"
              autoComplete="name"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-erro' : undefined}
              className={inputClass}
              {...form.register('name')}
            />
            <FieldError id="name-erro">{errors.name?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" className="text-sm font-semibold">
              E-mail
            </label>
            <input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-erro' : undefined}
              className={inputClass}
              {...form.register('email')}
            />
            <FieldError id="email-erro">{errors.email?.message}</FieldError>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="phone" className="text-sm font-semibold">
              WhatsApp com DDD
            </label>
            <Controller
              control={form.control}
              name="phone"
              render={({ field }) => (
                <input
                  id="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(11) 98765-4321"
                  aria-invalid={!!errors.phone}
                  aria-describedby={errors.phone ? 'phone-erro' : undefined}
                  className={inputClass}
                  name={field.name}
                  ref={field.ref}
                  value={field.value}
                  onBlur={field.onBlur}
                  onChange={(e) => field.onChange(formatPhone(e.target.value))}
                />
              )}
            />
            <FieldError id="phone-erro">{errors.phone?.message}</FieldError>
          </div>
        </fieldset>
      </form>

      <div className="min-h-8 flex-1" />

      <button type="submit" form="lead-form" className="btn-cta" disabled={sending}>
        {sending ? (
          <>
            <Loader2 aria-hidden className="size-5 animate-spin" />
            Calculando resultado…
          </>
        ) : (
          <>
            Ver meu resultado
            <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
          </>
        )}
      </button>
      <p
        className={cn(
          'mt-3.5 flex items-center justify-center gap-1.5 text-center text-xs text-tinta-2',
        )}
      >
        <Lock aria-hidden className="size-3.5" />
        Seus dados ficam com a gente. Nada de spam.
      </p>

      <ConfirmDialog
        tone="quiz"
        open={pendingLead !== null}
        onOpenChange={(open) => !open && setPendingLead(null)}
        title="Você já fez este diagnóstico"
        description="Se continuar, seu resultado anterior será substituído por este."
        confirmLabel="Continuar"
        pending={sending}
        onConfirm={() => pendingLead && send(pendingLead, true)}
      />
    </QuizShell>
  )
}
