import { zodResolver } from '@hookform/resolvers/zod'
import {
  type AdminQuestion,
  QUESTION_LIMITS,
  type QuestionContent,
  questionContentSchema,
} from '@quiz/shared'
import { Loader2, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { type FieldPath, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import type { z } from 'zod'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FieldError, Input, Label, Textarea } from '@/components/ui/field'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { answersLabel, maxWeight } from './question-utils'
import { type SaveQuestionResult, useActiveQuestions, useSaveQuestion } from './useQuestions'

type FormInput = z.input<typeof questionContentSchema>

const EMPTY: FormInput = {
  text: '',
  options: [
    { text: '', weight: 0 },
    { text: '', weight: 0 },
  ],
}

/** Rotas `/admin/perguntas/nova` e `/admin/perguntas/:id` (só perguntas ativas são editáveis). */
export function QuestionEditorDrawer() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const close = () => navigate({ pathname: '/admin/perguntas', search })
  const active = useActiveQuestions()

  if (!id) return <QuestionForm onClose={close} />

  const index = active.data?.findIndex((q) => q.id === id) ?? -1
  if (index >= 0) {
    return (
      <QuestionForm
        key={id}
        question={active.data![index]}
        position={index + 1}
        total={active.data!.length}
        onClose={close}
      />
    )
  }

  return (
    <Sheet open onOpenChange={(open) => !open && close()} title="Editar pergunta">
      {active.isPending ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Carregando pergunta">
          <Skeleton className="h-20 bg-[#EEF1F6]" />
          <Skeleton className="h-64 bg-[#EEF1F6]" />
        </div>
      ) : (
        <p className="py-10 text-center text-[15px] text-painel-sub">
          Pergunta não encontrada. Só perguntas ativas podem ser editadas.
        </p>
      )}
    </Sheet>
  )
}

function QuestionForm({
  question,
  position,
  total,
  onClose,
}: {
  question?: AdminQuestion
  position?: number
  total?: number
  onClose: () => void
}) {
  const save = useSaveQuestion()
  const [pendingContent, setPendingContent] = useState<QuestionContent | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const isNew = !question
  const answerCount = question?.answerCount ?? 0
  const createsVersion = answerCount > 0

  const form = useForm<FormInput, unknown, QuestionContent>({
    resolver: zodResolver(questionContentSchema),
    mode: 'onTouched',
    defaultValues: question
      ? {
          text: question.text,
          options: question.options.map(({ text, weight }) => ({ text, weight })),
        }
      : EMPTY,
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'options' })
  const { errors, isDirty } = form.formState
  const text = useWatch({ control: form.control, name: 'text' })
  const options = useWatch({ control: form.control, name: 'options' })

  const requestClose = () => (isDirty && !save.isPending ? setConfirmDiscard(true) : onClose())

  const notify = (result: SaveQuestionResult) => {
    if (result.created) toast.success(`Pergunta criada na posição ${result.question.position}.`)
    else if (result.versioned)
      toast.success('Nova versão criada. O histórico dos leads foi preservado.')
    else toast.success('Pergunta atualizada.')
  }

  const persist = (content: QuestionContent) =>
    save.mutate(
      { id: question?.id, content },
      {
        onSuccess: (result) => {
          setPendingContent(null)
          notify(result)
          onClose()
        },
        onError: (error) => {
          setPendingContent(null)
          if (!(error instanceof ApiError))
            return void toast.error('Algo deu errado. Tente de novo.')
          if (error.code === 'VALIDATION_ERROR') {
            const entries = Object.entries(error.fieldErrors)
            for (const [path, messages] of entries) {
              form.setError(path as FieldPath<FormInput>, { message: messages[0] })
            }
            if (entries.length === 0) toast.error(error.message)
            return
          }
          if (error.status === 404 || error.status === 409) {
            // pergunta saiu do quiz ou foi substituída em outra aba
            toast.error(error.message)
            return onClose()
          }
          toast.error('Não foi possível salvar. Suas alterações continuam no formulário.')
        },
      },
    )

  const onSubmit = form.handleSubmit((content) =>
    createsVersion ? setPendingContent(content) : persist(content),
  )

  const optionsError = errors.options?.message ?? errors.options?.root?.message
  const submitLabel = createsVersion ? 'Salvar nova versão' : isNew ? 'Criar pergunta' : 'Salvar'

  return (
    <>
      <Sheet
        open
        onOpenChange={(open) => !open && requestClose()}
        className="max-w-[600px]"
        title={isNew ? 'Nova pergunta' : 'Editar pergunta'}
        description={
          isNew
            ? 'Entra no fim do quiz assim que for criada.'
            : `Pergunta ${position} de ${total} · ${answersLabel(answerCount)}`
        }
        footer={
          <>
            <Button variant="secondary" size="lg" className="h-11" onClick={requestClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              form="question-form"
              size="lg"
              className="h-11"
              disabled={save.isPending}
            >
              {save.isPending && <Loader2 aria-hidden className="animate-spin" />}
              {submitLabel}
            </Button>
          </>
        }
      >
        <form
          id="question-form"
          noValidate
          onSubmit={onSubmit}
          className="flex flex-col gap-[22px]"
        >
          {createsVersion && (
            <div
              role="note"
              className="flex items-start gap-3 rounded-xl border border-[#F2D98A] bg-[#FFF8E1] px-4 py-3.5 text-sm leading-normal text-[#5C4300]"
            >
              <TriangleAlert aria-hidden className="mt-px size-5 shrink-0 text-[#8A6400]" />
              <p>
                <strong>Esta pergunta já tem {answersLabel(answerCount)}.</strong> Ao salvar,
                criamos uma nova versão no lugar dela. As respostas antigas continuam ligadas à
                versão atual, e novos leads passam a ver a nova.
              </p>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-texto">Texto da pergunta</Label>
            <Textarea
              id="q-texto"
              rows={2}
              maxLength={QUESTION_LIMITS.textMax}
              aria-invalid={!!errors.text}
              aria-describedby={errors.text ? 'q-texto-erro q-texto-conta' : 'q-texto-conta'}
              {...form.register('text')}
            />
            <span id="q-texto-conta" className="text-xs text-painel-sub">
              {text?.length ?? 0} / {QUESTION_LIMITS.textMax} caracteres
            </span>
            <FieldError id="q-texto-erro">{errors.text?.message}</FieldError>
          </div>

          <fieldset className="flex flex-col gap-2.5">
            <legend className="text-sm font-semibold">Alternativas</legend>
            <div
              aria-hidden
              className="mt-2.5 grid grid-cols-[minmax(0,1fr)_96px_44px] gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-painel-sub"
            >
              <span>Texto</span>
              <span>Pontos</span>
              <span />
            </div>
            {fields.map((field, i) => {
              const optionErrors = errors.options?.[i]
              const errorId = `q-opcao-${i}-erro`
              return (
                <div key={field.id} className="flex flex-col gap-1">
                  <div className="grid grid-cols-[minmax(0,1fr)_96px_44px] items-center gap-2">
                    <Input
                      aria-label={`Texto da alternativa ${i + 1}`}
                      maxLength={QUESTION_LIMITS.optionTextMax}
                      aria-invalid={!!optionErrors?.text}
                      aria-describedby={optionErrors ? errorId : undefined}
                      className="h-11 text-sm"
                      {...form.register(`options.${i}.text`)}
                    />
                    <Input
                      type="number"
                      min={QUESTION_LIMITS.weightMin}
                      max={QUESTION_LIMITS.weightMax}
                      step={1}
                      inputMode="numeric"
                      aria-label={`Pontos da alternativa ${i + 1}`}
                      aria-invalid={!!optionErrors?.weight}
                      aria-describedby={optionErrors ? errorId : undefined}
                      className="h-11 text-sm tabular-nums"
                      {...form.register(`options.${i}.weight`, { valueAsNumber: true })}
                    />
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      disabled={fields.length <= QUESTION_LIMITS.optionsMin}
                      aria-label={`Remover alternativa ${i + 1}`}
                      className="flex size-11 items-center justify-center rounded-[10px] text-painel-sub hover:bg-[#EFF2F8] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
                    >
                      <Trash2 aria-hidden className="size-[18px]" />
                    </button>
                  </div>
                  <FieldError id={errorId}>
                    {optionErrors?.text?.message ?? optionErrors?.weight?.message}
                  </FieldError>
                </div>
              )
            })}
            {fields.length < QUESTION_LIMITS.optionsMax && (
              <button
                type="button"
                onClick={() =>
                  append({ text: '', weight: 0 }, { focusName: `options.${fields.length}.text` })
                }
                className="flex h-11 items-center justify-center gap-2 rounded-[10px] border-[1.5px] border-dashed border-[#C5CEDD] text-sm font-semibold text-[#3B4866] hover:border-marca hover:text-marca"
              >
                <Plus aria-hidden className="size-4" strokeWidth={2.5} />
                Adicionar alternativa
              </button>
            )}
            <FieldError id="q-opcoes-erro">{optionsError}</FieldError>
            <p className="text-[13px] text-painel-sub">
              De {QUESTION_LIMITS.optionsMin} a {QUESTION_LIMITS.optionsMax} alternativas. Pontos de{' '}
              {QUESTION_LIMITS.weightMin} a {QUESTION_LIMITS.weightMax}. Maior peso desta pergunta:{' '}
              <strong className="text-painel-texto">{maxWeight(options ?? [])}</strong>.
            </p>
          </fieldset>
        </form>
      </Sheet>

      <ConfirmDialog
        open={pendingContent !== null}
        onOpenChange={(open) => !open && setPendingContent(null)}
        title="Salvar como nova versão?"
        description={`${answerCount === 1 ? 'A resposta já registrada continua ligada' : `As ${answerCount} respostas já registradas continuam ligadas`} ao texto atual. A partir de agora, o quiz mostra a nova versão.`}
        confirmLabel="Salvar nova versão"
        pending={save.isPending}
        onConfirm={() => pendingContent && persist(pendingContent)}
      />

      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Descartar alterações?"
        description="O que você mudou nesta pergunta ainda não foi salvo."
        confirmLabel="Descartar"
        cancelLabel="Continuar editando"
        danger
        onConfirm={() => {
          setConfirmDiscard(false)
          onClose()
        }}
      />
    </>
  )
}
