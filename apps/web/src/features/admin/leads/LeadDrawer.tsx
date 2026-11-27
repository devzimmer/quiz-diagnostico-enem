import { CircleAlert, Copy, MessageCircle } from 'lucide-react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Sheet } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { ApiError } from '@/lib/api-client'
import { formatDateTime, formatPhone } from '@/lib/format'
import { BandBadge } from './BandBadge'
import { useLead } from './useLeads'

const atTime = (iso: string) => formatDateTime(iso).replace(' ', ' às ')

/** Detalhe do lead em drawer, numa rota aninhada à lista (fechar preserva busca e filtros). */
export function LeadDrawer() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { search } = useLocation()
  const { data: lead, isPending, error, refetch, isFetching } = useLead(id)

  const close = () => navigate({ pathname: '/admin', search })

  const copyEmail = async (email: string) => {
    try {
      await navigator.clipboard.writeText(email)
      toast.success('E-mail copiado')
    } catch {
      toast.error('Não foi possível copiar. Selecione o e-mail e copie manualmente.')
    }
  }

  const notFound = error instanceof ApiError && error.status === 404

  return (
    <Sheet
      open
      onOpenChange={(open) => !open && close()}
      title={lead?.name ?? (isPending ? 'Carregando…' : 'Lead')}
      description={lead ? `Lead · cadastrado em ${atTime(lead.createdAt)}` : undefined}
    >
      {isPending ? (
        <div className="flex flex-col gap-4" role="status" aria-label="Carregando lead">
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-[72px] bg-[#EEF1F6]" />
            <Skeleton className="h-[72px] bg-[#EEF1F6]" />
          </div>
          <Skeleton className="h-24 bg-[#EEF1F6]" />
          <Skeleton className="h-72 bg-[#EEF1F6]" />
        </div>
      ) : !lead ? (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <CircleAlert aria-hidden className="size-8 text-painel-sub" />
          <p className="font-semibold">
            {notFound ? 'Lead não encontrado.' : 'Não foi possível carregar este lead.'}
          </p>
          {!notFound && (
            <Button variant="secondary" onClick={() => void refetch()} disabled={isFetching}>
              Tentar de novo
            </Button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="min-w-0 rounded-xl border border-painel-borda px-4 py-3.5">
              <p className="text-xs font-medium text-painel-sub">E-mail</p>
              <div className="mt-1 flex items-center gap-1">
                <a
                  href={`mailto:${lead.email}`}
                  title={lead.email}
                  className="truncate text-sm font-semibold text-marca"
                >
                  {lead.email}
                </a>
                <button
                  type="button"
                  onClick={() => void copyEmail(lead.email)}
                  aria-label="Copiar e-mail"
                  className="flex size-8 shrink-0 items-center justify-center rounded-lg text-painel-sub hover:bg-[#EFF2F8]"
                >
                  <Copy aria-hidden className="size-4" />
                </button>
              </div>
            </div>
            <div className="min-w-0 rounded-xl border border-painel-borda px-4 py-3.5">
              <p className="text-xs font-medium text-painel-sub">Telefone</p>
              <div className="mt-1 flex items-center justify-between gap-2">
                <span className="whitespace-nowrap text-sm font-semibold tabular-nums">
                  {formatPhone(lead.phone)}
                </span>
                <a
                  href={`https://wa.me/55${lead.phone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg bg-[#0C7F38] px-2.5 text-xs font-semibold text-white no-underline hover:bg-[#0A6B2F]"
                >
                  <MessageCircle aria-hidden className="size-3.5" />
                  WhatsApp
                  <span className="sr-only">(abre em nova aba)</span>
                </a>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 rounded-[14px] border border-[#DCE3FB] bg-[#F4F7FF] px-5 py-[18px]">
            <div>
              <p className="text-xs font-medium text-painel-sub">Pontuação</p>
              <p className="mt-0.5 text-4xl font-bold leading-tight tracking-tight">
                {lead.score}
                <span className="text-base font-medium text-painel-sub"> /100</span>
              </p>
            </div>
            <div className="min-w-0 flex-[1_1_200px]">
              <BandBadge slug={lead.band.slug} label={lead.band.label} />
              <p className="mt-2 text-[13px] leading-snug text-[#3B4866]">{lead.band.message}</p>
            </div>
          </div>

          <p className="text-[13px] text-painel-sub">
            Respondido em {atTime(lead.submittedAt)}
            {lead.submissionCount > 1 &&
              ` · fez o quiz ${lead.submissionCount} vezes; mostrando o envio mais recente`}
          </p>

          <div>
            <h3 className="text-[15px] font-semibold">
              Respostas <span className="font-medium text-painel-sub">({lead.answers.length})</span>
            </h3>
            <ol className="mt-3 overflow-hidden rounded-xl border border-painel-borda">
              {lead.answers.map((answer) => (
                <li
                  key={answer.position}
                  className="flex items-start gap-3 border-t border-[#EEF1F6] px-4 py-3.5 first:border-t-0"
                >
                  <span className="w-6 shrink-0 text-[13px] font-bold tabular-nums text-painel-sub">
                    {answer.position}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="text-[13px] leading-snug text-painel-sub">
                      {answer.question}
                    </span>
                    <span className="text-sm font-semibold leading-snug">{answer.option}</span>
                  </div>
                  <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#3B4866]">
                    {answer.weight} pts
                  </span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </Sheet>
  )
}
