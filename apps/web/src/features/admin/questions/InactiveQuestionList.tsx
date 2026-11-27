import type { InactiveAdminQuestion } from '@quiz/shared'
import { RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ApiError } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { OptionChips } from './OptionChips'
import { answersLabel, inactiveReasonLabel } from './question-utils'
import { useReactivateQuestion } from './useQuestions'

export function InactiveQuestionList({ questions }: { questions: InactiveAdminQuestion[] }) {
  const reactivate = useReactivateQuestion()

  const onReactivate = (question: InactiveAdminQuestion) =>
    reactivate.mutate(question.id, {
      onSuccess: (active) =>
        toast.success(`Pergunta reativada no fim do quiz (posição ${active.position}).`),
      onError: (error) =>
        toast.error(
          error instanceof ApiError && error.status === 409
            ? error.message
            : 'Não foi possível reativar a pergunta. Tente de novo.',
        ),
    })

  return (
    <ol className="flex flex-col gap-3">
      {questions.map((question) => (
        <li
          key={question.id}
          className="flex flex-col gap-2.5 rounded-[14px] border border-painel-borda bg-[#FBFCFE] px-[18px] py-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-[1_1_320px] flex-col items-start gap-1.5">
              <span
                className={cn(
                  'rounded-full px-[9px] py-[3px] text-xs font-semibold',
                  question.inactiveReason === 'replaced'
                    ? 'bg-marca-suave text-[#1E2F99]'
                    : 'bg-[#EEF0F4] text-[#3B4866]',
                )}
              >
                {inactiveReasonLabel(question)}
              </span>
              <p className="text-base font-semibold leading-snug text-[#3B4866]">{question.text}</p>
              <p className="text-[13px] text-painel-sub">{answersLabel(question.answerCount)}</p>
            </div>
            {question.inactiveReason === 'deactivated' && (
              <Button
                variant="secondary"
                size="sm"
                disabled={reactivate.isPending && reactivate.variables === question.id}
                onClick={() => onReactivate(question)}
              >
                <RotateCcw aria-hidden />
                Reativar
              </Button>
            )}
          </div>
          <OptionChips options={question.options} />
        </li>
      ))}
    </ol>
  )
}
