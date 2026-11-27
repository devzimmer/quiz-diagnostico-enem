import { CircleAlert, Info, Plus } from 'lucide-react'
import { Link, Outlet, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { useAdminQuizSummary } from '../useAdminQuizSummary'
import { ActiveQuestionList } from './ActiveQuestionList'
import { InactiveQuestionList } from './InactiveQuestionList'
import { useActiveQuestions, useInactiveQuestions } from './useQuestions'

export function QuestionsPage() {
  const [searchParams] = useSearchParams()
  const showInactive = searchParams.get('status') === 'desativadas'
  const summary = useAdminQuizSummary()

  return (
    <main className="mx-auto flex max-w-[960px] flex-col gap-5 px-4 pb-12 pt-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[28px] font-bold tracking-tight">Perguntas do quiz</h1>
          <p className="mt-1 text-[15px] text-painel-sub">
            Alterações entram no ar na hora, sem novo deploy.
          </p>
        </div>
        <Button asChild>
          <Link to={{ pathname: '/admin/perguntas/nova', search: searchParams.toString() }}>
            <Plus aria-hidden strokeWidth={2.5} />
            Nova pergunta
          </Link>
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#D3DAFB] bg-marca-suave px-4 py-3.5 text-sm leading-normal text-[#1E2F66]">
        <Info aria-hidden className="mt-px size-5 shrink-0 text-marca" />
        <p>
          Perguntas que já têm respostas nunca são sobrescritas: ao editar, criamos uma nova versão
          e o histórico dos leads continua apontando para a versão que eles viram. Desativar tira a
          pergunta do quiz sem apagar nada.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <nav
          aria-label="Filtrar perguntas por status"
          className="inline-flex gap-1 rounded-xl bg-[#E6EAF2] p-1"
        >
          <TabLink to="/admin/perguntas" active={!showInactive} count={summary.data?.activeCount}>
            Ativas
          </TabLink>
          <TabLink
            to="/admin/perguntas?status=desativadas"
            active={showInactive}
            count={summary.data?.inactiveCount}
          >
            Desativadas
          </TabLink>
        </nav>
        {!showInactive && summary.data && (
          <span className="text-sm text-[#3B4866]">
            Pontuação máxima atual:{' '}
            <strong className="text-painel-texto">{summary.data.maxPoints} pontos</strong>
          </span>
        )}
      </div>

      {showInactive ? <InactiveTab /> : <ActiveTab />}

      {/* editor (/admin/perguntas/nova e /admin/perguntas/:id) abre por cima da lista */}
      <Outlet />
    </main>
  )
}

function TabLink({
  to,
  active,
  count,
  children,
}: {
  to: string
  active: boolean
  count?: number
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-10 items-center gap-2 rounded-[9px] px-3.5 text-sm font-semibold no-underline transition-colors',
        active
          ? 'bg-white text-painel-texto shadow-[0_1px_3px_rgba(20,37,77,0.12)]'
          : 'text-[#3B4866] hover:text-painel-texto',
      )}
    >
      {children}
      {count !== undefined && (
        <span
          className={cn(
            'rounded-full px-2 py-px text-xs font-bold',
            active ? 'bg-marca text-white' : 'bg-[#D5DCE8] text-painel-texto',
          )}
        >
          {count}
        </span>
      )}
    </Link>
  )
}

function ActiveTab() {
  const { data, isPending, isError, refetch, isFetching } = useActiveQuestions()
  if (isPending) return <ListSkeleton />
  if (isError) return <LoadError onRetry={() => void refetch()} retrying={isFetching} />
  return (
    <>
      {data.length === 0 ? (
        <p className="rounded-[14px] border border-dashed border-[#C5CEDD] bg-white px-6 py-10 text-center text-sm text-painel-sub">
          Nenhuma pergunta ativa. Crie uma pergunta para o quiz voltar ao ar.
        </p>
      ) : (
        <ActiveQuestionList questions={data} />
      )}
      <p className="text-[13px] text-painel-sub">
        A pontuação máxima é a soma do maior peso de cada pergunta ativa. A nota do lead é sempre
        convertida para 0–100.
      </p>
    </>
  )
}

function InactiveTab() {
  const { data, isPending, isError, refetch, isFetching } = useInactiveQuestions()
  if (isPending) return <ListSkeleton />
  if (isError) return <LoadError onRetry={() => void refetch()} retrying={isFetching} />
  if (data.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-[#C5CEDD] bg-white px-6 py-10 text-center text-sm text-painel-sub">
        Nenhuma pergunta desativada. Versões antigas e perguntas tiradas do quiz aparecem aqui.
      </p>
    )
  }
  return (
    <>
      <p className="text-sm text-[#3B4866]">
        Perguntas fora do quiz. Elas continuam guardadas porque há leads que as responderam.
      </p>
      <InactiveQuestionList questions={data} />
    </>
  )
}

function ListSkeleton() {
  return (
    <div className="flex flex-col gap-3" role="status" aria-label="Carregando perguntas">
      {Array.from({ length: 4 }, (_, i) => (
        <Skeleton key={i} className="h-32 rounded-[14px] bg-white" />
      ))}
    </div>
  )
}

function LoadError({ onRetry, retrying }: { onRetry: () => void; retrying: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-[14px] border border-painel-borda bg-white px-6 py-12 text-center">
      <CircleAlert aria-hidden className="size-8 text-erro" />
      <p className="font-semibold">Não foi possível carregar as perguntas.</p>
      <Button variant="secondary" onClick={onRetry} disabled={retrying}>
        Tentar de novo
      </Button>
    </div>
  )
}
