import { RotateCw, WifiOff } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { QuizShell } from './QuizLayout'

export function QuestionSkeleton() {
  return (
    <QuizShell>
      <div aria-busy="true" aria-live="polite" className="flex flex-1 flex-col">
        <span className="sr-only">Carregando perguntas…</span>
        <div className="flex h-11 items-center justify-between">
          <Skeleton className="h-[18px] w-20" />
          <Skeleton className="h-[18px] w-28" />
        </div>
        <Skeleton className="mt-2 h-2 rounded-full" />
        <Skeleton className="mt-11 h-9 w-full" />
        <Skeleton className="mt-2.5 h-9 w-3/4" />
        <div className="mt-8 flex flex-col gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
        <p className="mt-auto text-center text-sm text-tinta-2">Preparando seu diagnóstico…</p>
      </div>
    </QuizShell>
  )
}

export function QuizLoadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <QuizShell className="items-center justify-center text-center">
      <span className="flex size-[72px] -rotate-3 items-center justify-center rounded-[22px] bg-[#FFF1E3] text-[#9A4A00]">
        <WifiOff aria-hidden className="size-9" />
      </span>
      <h1 className="mt-6 font-display text-3xl uppercase leading-tight">
        Não conseguimos carregar o quiz
      </h1>
      <p className="mt-3 text-base leading-relaxed text-tinta-2">
        Pode ser a sua conexão. Confira a internet e tente de novo.
      </p>
      <button
        type="button"
        onClick={onRetry}
        disabled={retrying}
        className="mt-7 inline-flex h-[52px] items-center gap-2 rounded-full border-2 border-azul-fundo bg-white px-7 text-[15px] font-extrabold uppercase tracking-wide text-azul-esc hover:bg-azul-suave disabled:opacity-60"
      >
        <RotateCw aria-hidden className={retrying ? 'size-[18px] animate-spin' : 'size-[18px]'} />
        Tentar de novo
      </button>
    </QuizShell>
  )
}
