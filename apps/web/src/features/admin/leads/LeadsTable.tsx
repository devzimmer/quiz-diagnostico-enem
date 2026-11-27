import type { LeadListItem } from '@quiz/shared'
import { Link } from 'react-router-dom'
import { Skeleton } from '@/components/ui/skeleton'
import { formatDateTime, formatPhone } from '@/lib/format'
import { BandBadge } from './BandBadge'

const th = 'px-3 py-3 font-semibold'

export function LeadsTable({ leads, search }: { leads: LeadListItem[]; search: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] border-collapse text-sm">
        <caption className="sr-only">Leads capturados, do mais recente para o mais antigo</caption>
        <thead>
          <tr className="bg-[#F8FAFD] text-left text-xs uppercase tracking-[0.04em] text-painel-sub">
            <th scope="col" className={`${th} pl-5`}>
              Nome
            </th>
            <th scope="col" className={th}>
              E-mail
            </th>
            <th scope="col" className={th}>
              Telefone
            </th>
            <th scope="col" className={`${th} text-right`}>
              Pontuação
            </th>
            <th scope="col" className={th}>
              Faixa
            </th>
            <th scope="col" aria-sort="descending" className={`${th} text-painel-texto`}>
              Cadastro ↓
            </th>
            <th scope="col" className={`${th} pr-5`}>
              <span className="sr-only">Ações</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.id} className="border-t border-[#EEF1F6] hover:bg-[#F7F9FD]">
              <td className="whitespace-nowrap py-3.5 pl-5 pr-3 font-semibold">{lead.name}</td>
              <td className="px-3 py-3.5 text-[#3B4866]">{lead.email}</td>
              <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-[#3B4866]">
                {formatPhone(lead.phone)}
              </td>
              <td className="px-3 py-3.5 text-right font-bold tabular-nums">{lead.score}</td>
              <td className="px-3 py-3.5">
                <BandBadge slug={lead.band.slug} label={lead.band.label} />
              </td>
              <td className="whitespace-nowrap px-3 py-3.5 tabular-nums text-[#3B4866]">
                {formatDateTime(lead.createdAt)}
              </td>
              <td className="py-2 pl-3 pr-5 text-right">
                <Link
                  to={{ pathname: `/admin/leads/${lead.id}`, search }}
                  className="inline-flex h-9 items-center whitespace-nowrap rounded-lg px-3 text-[13px] font-semibold text-marca no-underline hover:bg-marca-suave"
                  aria-label={`Ver respostas de ${lead.name}`}
                >
                  Ver respostas
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LeadsTableSkeleton() {
  return (
    <div className="flex flex-col gap-px" role="status" aria-label="Carregando leads">
      {Array.from({ length: 8 }, (_, i) => (
        <div key={i} className="flex items-center gap-6 border-t border-[#EEF1F6] px-5 py-4">
          <Skeleton className="h-4 w-36 bg-[#EEF1F6]" />
          <Skeleton className="h-4 w-48 bg-[#EEF1F6]" />
          <Skeleton className="h-4 w-28 bg-[#EEF1F6]" />
          <Skeleton className="ml-auto h-4 w-24 bg-[#EEF1F6]" />
        </div>
      ))}
    </div>
  )
}
