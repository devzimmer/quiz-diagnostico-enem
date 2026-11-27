import type { BandRange } from '@quiz/shared'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  search: string
  onSearchChange: (value: string) => void
  bands: BandRange[]
  band: string | null
  onBandChange: (slug: string | null) => void
}

const chipClass = (active: boolean) =>
  cn(
    'h-9 rounded-full border-[1.5px] px-3 text-[13px] font-semibold transition-colors',
    active
      ? 'border-marca bg-marca text-white'
      : 'border-[#D5DCE8] bg-white text-painel-texto hover:border-marca',
  )

export function LeadFilters({ search, onSearchChange, bands, band, onBandChange }: Props) {
  const options = [{ slug: null, label: 'Todas' }, ...bands]
  return (
    <div className="flex flex-wrap items-center gap-4 border-b border-painel-borda px-5 py-4">
      <div className="relative min-w-0 max-w-[380px] flex-[1_1_280px]">
        <label htmlFor="busca" className="sr-only">
          Buscar por nome ou e-mail
        </label>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-3 top-[11px] size-[18px] text-painel-sub"
        />
        <input
          id="busca"
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por nome ou e-mail"
          maxLength={100}
          className="h-10 w-full rounded-[10px] border-[1.5px] border-[#D5DCE8] bg-white pl-[38px] pr-3 text-sm outline-none transition focus:border-marca focus:ring-4 focus:ring-marca/10"
        />
      </div>
      <div role="group" aria-label="Filtrar por faixa" className="flex flex-wrap gap-2">
        {options.map((option) => {
          const active = option.slug === band
          return (
            <button
              key={option.slug ?? 'todas'}
              type="button"
              aria-pressed={active}
              onClick={() => onBandChange(option.slug)}
              className={chipClass(active)}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
