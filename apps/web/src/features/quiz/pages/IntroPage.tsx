import { ArrowRight, Clock, ListChecks, Target } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Logo } from '@/components/Logo'
import { QuizShell } from '../components/QuizLayout'
import { useQuizState } from '../QuizProvider'

const ITEMS = [
  { icon: ListChecks, text: '10 perguntas de múltipla escolha' },
  { icon: Clock, text: 'Leva cerca de 2 minutos' },
  { icon: Target, text: 'Resultado na hora, com o que focar agora' },
]

export function IntroPage() {
  const { state, dispatch } = useQuizState()
  const inProgress = !state.result && Object.keys(state.answers).length > 0

  return (
    <QuizShell>
      <header className="flex h-11 items-center justify-between">
        <Logo className="h-9" />
      </header>

      <div className="mt-10">
        <span className="selo">Diagnóstico gratuito</span>
      </div>

      <h1 className="mt-5 font-display text-[46px] uppercase leading-[1.04] sm:text-[52px]">
        Qual é a sua <span className="marca-texto">chance real</span> de passar no ENEM?
      </h1>

      <p className="mt-4 text-[17px] leading-relaxed text-tinta-2">
        Responda 10 perguntas rápidas sobre a sua rotina de estudos e descubra em que ponto da
        preparação você está.
      </p>

      <ul className="mt-7 flex flex-col gap-3.5 rounded-[18px] border-[1.5px] border-azul-claro bg-white p-[18px] shadow-[0_8px_24px_rgba(11,42,91,0.06)]">
        {ITEMS.map(({ icon: Icon, text }) => (
          <li key={text} className="flex items-center gap-3 text-[15px] font-medium">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-azul-claro text-azul-fundo">
              <Icon aria-hidden className="size-5" />
            </span>
            {text}
          </li>
        ))}
      </ul>

      <div className="flex-1" />

      <div className="mb-2.5 mt-8 flex items-start justify-end pr-4" aria-hidden>
        <span className="-rotate-[4deg] font-hand text-[19px] text-azul-texto">
          é rapidinho, prometo!
        </span>
        <svg width="34" height="30" viewBox="0 0 34 30" fill="none" className="ml-1 mt-3.5">
          <path
            d="M4 4c10 2 18 9 22 20M20 21l6 4 2-7"
            stroke="#0866D6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <Link
        to="/quiz"
        className="btn-cta"
        onClick={() => {
          if (state.result) dispatch({ type: 'reset' })
        }}
      >
        {inProgress ? 'Continuar diagnóstico' : 'Começar diagnóstico'}
        <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />
      </Link>
      {inProgress ? (
        <button
          type="button"
          onClick={() => dispatch({ type: 'reset' })}
          className="mt-3 h-11 text-sm font-semibold text-azul-texto underline-offset-4 hover:underline"
        >
          Recomeçar do zero
        </button>
      ) : (
        <p className="mt-4 text-center text-[13px] text-tinta-2">
          Gratuito · você só deixa seu contato no final
        </p>
      )}
    </QuizShell>
  )
}
