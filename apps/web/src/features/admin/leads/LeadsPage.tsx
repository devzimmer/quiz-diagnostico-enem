import { CircleAlert, Inbox, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Outlet, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { StatsPanel } from '../dashboard/StatsPanel'
import { useDebouncedValue } from '../useDebouncedValue'
import { LeadFilters } from './LeadFilters'
import { LeadsTable, LeadsTableSkeleton } from './LeadsTable'
import { LEADS_PAGE_SIZE, readLeadParams } from './lead-params'
import { useAdminQuizSummary } from '../useAdminQuizSummary'
import { useLeads } from './useLeads'

export function LeadsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const params = readLeadParams(searchParams)
  const quiz = useAdminQuizSummary()
  const leads = useLeads(params)

  // Campo de busca responde na hora; a URL (e a consulta) só depois de 300 ms parado.
  const [term, setTerm] = useState(params.search)
  const debouncedTerm = useDebouncedValue(term, 300)

  const update = (changes: Record<string, string | null>) =>
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        for (const [key, value] of Object.entries(changes)) {
          if (value) next.set(key, value)
          else next.delete(key)
        }
        return next
      },
      { replace: true },
    )

  useEffect(() => {
    if (debouncedTerm.trim() !== params.search) update({ q: debouncedTerm.trim(), page: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage ao termo estabilizado
  }, [debouncedTerm])

  useEffect(() => {
    // voltar/avançar no navegador muda a URL: o campo acompanha
    if (params.search !== debouncedTerm.trim()) setTerm(params.search)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só reage à URL
  }, [params.search])

  const clearFilters = () => {
    setTerm('')
    update({ q: null, faixa: null, page: null })
  }

  const data = leads.data
  const total = data?.pagination.total ?? 0
  const first = (params.page - 1) * LEADS_PAGE_SIZE + 1
  const last = Math.min(params.page * LEADS_PAGE_SIZE, total)
  const hasFilters = Boolean(params.search || params.band)

  return (
    <main className="mx-auto flex max-w-[1280px] flex-col gap-6 px-4 pb-12 pt-8 sm:px-6">
      <div>
        <h1 className="text-[28px] font-bold tracking-tight">Leads</h1>
        <p className="mt-1 text-[15px] text-painel-sub">
          Contatos capturados pelo quiz de diagnóstico ENEM.
        </p>
      </div>

      <StatsPanel />

      <section
        aria-label="Lista de leads"
        className="overflow-hidden rounded-[14px] border border-painel-borda bg-white"
      >
        <LeadFilters
          search={term}
          onSearchChange={setTerm}
          bands={quiz.data?.bands ?? []}
          band={params.band}
          onBandChange={(slug) => update({ faixa: slug, page: null })}
        />

        {leads.isPending ? (
          <LeadsTableSkeleton />
        ) : leads.isError && !data ? (
          <EmptyState
            icon={<CircleAlert className="text-erro" />}
            title="Não foi possível carregar os leads"
            text="Verifique a conexão e tente de novo."
            action={
              <Button
                variant="secondary"
                onClick={() => void leads.refetch()}
                disabled={leads.isFetching}
              >
                Tentar de novo
              </Button>
            }
          />
        ) : data && data.data.length > 0 ? (
          <div
            className={leads.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}
            aria-busy={leads.isFetching}
          >
            <LeadsTable leads={data.data} search={searchParams.toString()} />
          </div>
        ) : params.page > 1 && total > 0 ? (
          <EmptyState
            icon={<Inbox />}
            title="Esta página não tem leads"
            text={`A lista tem ${total} leads.`}
            action={
              <Button variant="secondary" onClick={() => update({ page: null })}>
                Ir para a primeira página
              </Button>
            }
          />
        ) : hasFilters ? (
          <EmptyState
            icon={<SearchX />}
            title={
              params.search
                ? `Nenhum lead encontrado para “${params.search}”`
                : 'Nenhum lead nesta faixa'
            }
            text="Tente outro termo ou limpe os filtros."
            action={
              <Button variant="secondary" onClick={clearFilters}>
                Limpar filtros
              </Button>
            }
          />
        ) : (
          <EmptyState
            icon={<Inbox />}
            title="Nenhum lead ainda"
            text="Os contatos aparecem aqui assim que alguém concluir o quiz."
          />
        )}

        {total > 0 && data && data.data.length > 0 && (
          <nav
            aria-label="Paginação"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-painel-borda px-5 py-3.5"
          >
            <span className="text-[13px] text-painel-sub" aria-live="polite">
              Mostrando {first}–{last} de {total}
            </span>
            <div className="flex gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={params.page <= 1}
                onClick={() => update({ page: params.page > 2 ? String(params.page - 1) : null })}
              >
                Anterior
              </Button>
              <Button
                variant="secondary"
                size="sm"
                disabled={last >= total}
                onClick={() => update({ page: String(params.page + 1) })}
              >
                Próxima
              </Button>
            </div>
          </nav>
        )}
      </section>

      {/* detalhe do lead (/admin/leads/:id) abre por cima da lista */}
      <Outlet />
    </main>
  )
}

function EmptyState({
  icon,
  title,
  text,
  action,
}: {
  icon: React.ReactNode
  title: string
  text: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
      <span aria-hidden className="mb-1 text-painel-sub [&_svg]:size-8">
        {icon}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="text-sm text-painel-sub">{text}</p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  )
}
