import { ArrowLeft, ArrowRight } from 'lucide-react'
import { useRef } from 'react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import { OptionButton } from '../components/OptionButton'
import { ProgressBar } from '../components/ProgressBar'
import { QuizShell } from '../components/QuizLayout'
import { QuestionSkeleton, QuizLoadError } from '../components/QuizStates'
import { useSyncedQuiz } from '../useSyncedQuiz'

export function QuestionPage() {
  const navigate = useNavigate()
  const { query, quiz, state, dispatch } = useSyncedQuiz()
  const direction = useRef<1 | -1>(1)

  if (query.isError && !quiz) {
    return <QuizLoadError onRetry={() => query.refetch()} retrying={query.isFetching} />
  }
  if (!quiz) return <QuestionSkeleton />

  const total = quiz.questions.length
  const question = quiz.questions[state.step]
  if (!question) return <QuestionSkeleton />
  const selected = state.answers[question.id]
  const isLast = state.step === total - 1

  const goBack = () => {
    direction.current = -1
    if (state.step === 0) navigate('/')
    else dispatch({ type: 'back' })
  }
  const goNext = () => {
    if (!selected) return
    direction.current = 1
    if (isLast) navigate('/quiz/contato')
    else dispatch({ type: 'next', total })
  }

  return (
    <QuizShell>
      <header className="flex h-11 items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="-ml-1 flex h-11 items-center gap-1.5 pr-2 text-[15px] font-semibold text-azul-texto hover:text-azul-esc"
        >
          <ArrowLeft aria-hidden className="size-5" strokeWidth={2.5} />
          Voltar
        </button>
        <span className="text-sm font-semibold text-tinta-2" aria-live="polite">
          Pergunta <strong className="text-tinta">{state.step + 1}</strong> de {total}
        </span>
      </header>
      <div className="mt-2">
        <ProgressBar current={state.step + 1} total={total} />
      </div>

      {/* animação só de entrada, em CSS: a troca de pergunta nunca espera uma animação terminar */}
      <section
        key={question.id}
        className={cn(
          'duration-200 animate-in fade-in',
          direction.current === 1 ? 'slide-in-from-right-8' : 'slide-in-from-left-8',
        )}
        aria-labelledby={`pergunta-${question.id}`}
      >
        <h1
          id={`pergunta-${question.id}`}
          className="mt-9 font-display text-[32px] uppercase leading-[1.1] sm:text-[34px]"
        >
          {question.text}
        </h1>
        <div
          role="radiogroup"
          aria-labelledby={`pergunta-${question.id}`}
          className="mt-7 flex flex-col gap-3"
        >
          {question.options.map((option, i) => (
            <OptionButton
              key={option.id}
              index={i}
              text={option.text}
              selected={selected === option.id}
              onSelect={() =>
                dispatch({ type: 'answer', questionId: question.id, optionId: option.id })
              }
            />
          ))}
        </div>
      </section>

      <div className="min-h-8 flex-1" />

      <button type="button" className="btn-cta" disabled={!selected} onClick={goNext}>
        {selected ? (isLast ? 'Ver meu resultado' : 'Próxima') : 'Escolha uma opção'}
        {selected && <ArrowRight aria-hidden className="size-5" strokeWidth={2.5} />}
      </button>
      <p className="mt-3.5 text-center text-[13px] text-tinta-2">
        Você pode voltar e mudar suas respostas.
      </p>
    </QuizShell>
  )
}
