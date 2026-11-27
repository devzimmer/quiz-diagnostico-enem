import type { AdminQuestion } from '@quiz/shared'
import { ChevronDown, ChevronUp, CircleMinus, Pencil } from 'lucide-react'
import { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { ApiError } from '@/lib/api-client'
import { OptionChips } from './OptionChips'
import { answersLabel, maxWeight, moveItem } from './question-utils'
import { useDeactivateQuestion, useReorderQuestions } from './useQuestions'

const arrowClass =
  'flex size-10 items-center justify-center rounded-[10px] text-[#3B4866] hover:bg-[#EFF2F8] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent'

export function ActiveQuestionList({ questions }: { questions: AdminQuestion[] }) {
  const { search } = useLocation()
  const reorder = useReorderQuestions()
  const deactivate = useDeactivateQuestion()
  const [toDeactivate, setToDeactivate] = useState<AdminQuestion | null>(null)

  const move = (index: number, delta: -1 | 1) => {
    const ids = moveItem(
      questions.map((q) => q.id),
      index,
      delta,
    )
    reorder.mutate(ids, {
      onError: () => toast.error('Não foi possível mudar a ordem. A lista voltou ao que era.'),
    })
  }

  const confirmDeactivate = () => {
    if (!toDeactivate) return
    deactivate.mutate(toDeactivate.id, {
      onSuccess: () => {
        toast.success('Pergunta desativada. Ela não aparece mais no quiz.')
        setToDeactivate(null)
      },
      onError: (error) => {
        setToDeactivate(null)
        toast.error(
          error instanceof ApiError && error.code === 'LAST_ACTIVE_QUESTION'
            ? 'O quiz precisa de pelo menos uma pergunta ativa.'
            : 'Não foi possível desativar a pergunta. Tente de novo.',
        )
      },
    })
  }

  return (
    <>
      <ol className="flex flex-col gap-3">
        {questions.map((question, index) => {
          const n = index + 1
          return (
            <li
              key={question.id}
              className="flex items-start gap-3.5 rounded-[14px] border border-painel-borda bg-white p-4"
            >
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  className={arrowClass}
                  aria-label={`Subir pergunta ${n}`}
                  disabled={index === 0 || reorder.isPending}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp aria-hidden className="size-[18px]" strokeWidth={2.5} />
                </button>
                <span className="text-[15px] font-bold tabular-nums">{n}</span>
                <button
                  type="button"
                  className={arrowClass}
                  aria-label={`Descer pergunta ${n}`}
                  disabled={index === questions.length - 1 || reorder.isPending}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown aria-hidden className="size-[18px]" strokeWidth={2.5} />
                </button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-2.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-[1_1_320px]">
                    <p className="text-base font-semibold leading-snug">{question.text}</p>
                    <p className="mt-1 text-[13px] text-painel-sub">
                      {answersLabel(question.answerCount)} · vale até {maxWeight(question.options)}{' '}
                      pontos
                    </p>
                  </div>
                  <div className="flex gap-1.5">
                    <Button asChild variant="secondary" size="sm">
                      <Link
                        to={{ pathname: `/admin/perguntas/${question.id}`, search }}
                        aria-label={`Editar pergunta ${n}`}
                      >
                        <Pencil aria-hidden />
                        Editar
                      </Link>
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => setToDeactivate(question)}
                      aria-label={`Desativar pergunta ${n}`}
                    >
                      <CircleMinus aria-hidden />
                      Desativar
                    </Button>
                  </div>
                </div>
                <OptionChips options={question.options} />
              </div>
            </li>
          )
        })}
      </ol>

      <ConfirmDialog
        open={toDeactivate !== null}
        onOpenChange={(open) => !open && setToDeactivate(null)}
        title="Desativar esta pergunta?"
        description={
          <>
            “{toDeactivate?.text}” sai do quiz agora. Nada é apagado: as respostas dos leads
            continuam no histórico e você pode reativá-la depois.
          </>
        }
        confirmLabel="Desativar"
        danger
        pending={deactivate.isPending}
        onConfirm={confirmDeactivate}
      />
    </>
  )
}
