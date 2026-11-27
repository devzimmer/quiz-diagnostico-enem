import { MessageCircle, RotateCcw } from 'lucide-react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { formatPhone } from '@/lib/format'
import { QuizShell } from '../components/QuizLayout'
import { ScoreScale } from '../components/ScoreScale'
import { useQuizState } from '../QuizProvider'

export function ResultPage() {
  const navigate = useNavigate()
  const { state, dispatch } = useQuizState()
  const { result, lead } = state
  if (!result) return <Navigate to="/" replace />

  const firstName = lead?.name.split(' ')[0]

  return (
    <QuizShell className="px-5 pb-10">
      <header className="flex h-11 items-center justify-between">
        <Logo className="h-9" />
        <span className="text-[13px] font-medium text-tinta-2">Seu diagnóstico</span>
      </header>

      <section
        aria-labelledby="nota"
        className="relative mt-4 rounded-3xl bg-azul-grade px-[22px] pb-6 pt-7 text-white shadow-[0_10px_30px_rgba(10,109,230,0.25)] duration-500 animate-in fade-in zoom-in-95"
      >
        <p id="nota" className="text-[15px] font-medium">
          {firstName ? `${firstName}, sua pontuação é` : 'Sua pontuação é'}
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-x-3 gap-y-2">
          <p className="flex items-end gap-2" aria-label={`${result.score} de 100 pontos`}>
            <span className="font-display text-[112px] leading-[0.95]">{result.score}</span>
            <span className="font-display text-3xl leading-[1.6] text-azul-claro">/100</span>
          </p>
          <span className="mb-3 rotate-[4deg] bg-amarelo px-3 py-2 text-[13px] font-extrabold uppercase tracking-[0.06em] text-tinta shadow-[0_3px_0_rgba(0,0,0,0.15)]">
            {result.band.label}
          </span>
        </div>
        {/* `bands` pode faltar em um resultado salvo por uma versão anterior do app */}
        {result.bands?.length > 0 && (
          <div className="mt-[22px]">
            <ScoreScale score={result.score} bands={result.bands} current={result.band.slug} />
          </div>
        )}
        <p className="mt-[22px] text-lg font-semibold leading-snug">{result.band.message}</p>
      </section>

      <section className="mt-5 flex items-start gap-3.5 rounded-[20px] border-[1.5px] border-azul-claro bg-white p-[18px]">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#C9F5D6] text-[#065E28]">
          <MessageCircle aria-hidden className="size-[22px]" />
        </span>
        <div>
          <h2 className="text-[15px] font-bold">Próximo passo</h2>
          <p className="mt-1 text-sm leading-relaxed text-tinta-2">
            {lead
              ? `Nosso time vai te chamar no WhatsApp ${formatPhone(lead.phone)} para conversar sobre o seu plano.`
              : 'Nosso time vai entrar em contato para conversar sobre o seu plano.'}
          </p>
        </div>
      </section>

      <div className="mt-9 flex items-baseline justify-between">
        <h2 className="font-display text-[28px] uppercase">
          Suas <span className="marca-texto">respostas</span>
        </h2>
        <span aria-hidden className="-rotate-3 font-hand text-[17px] text-azul-texto">
          o seu raio-x
        </span>
      </div>

      <ol className="mt-4 flex flex-col gap-2.5">
        {result.answers.map((answer) => (
          <li
            key={answer.position}
            className="flex gap-3 rounded-2xl border-[1.5px] border-azul-claro bg-white px-4 py-3.5"
          >
            <span
              aria-hidden
              className="flex size-7 shrink-0 items-center justify-center rounded-full bg-azul-claro text-[13px] font-extrabold text-azul-esc"
            >
              {answer.position}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <span className="text-[13px] leading-snug text-tinta-2">{answer.question}</span>
              <span className="text-[15px] font-semibold leading-snug">{answer.option}</span>
            </div>
          </li>
        ))}
      </ol>

      <button
        type="button"
        onClick={() => {
          dispatch({ type: 'reset' })
          navigate('/')
        }}
        className="mx-auto mt-8 flex h-11 items-center gap-2 text-sm font-semibold text-azul-texto underline-offset-4 hover:underline"
      >
        <RotateCcw aria-hidden className="size-4" />
        Refazer diagnóstico
      </button>
    </QuizShell>
  )
}
