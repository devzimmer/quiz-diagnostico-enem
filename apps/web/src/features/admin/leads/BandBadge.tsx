import { cn } from '@/lib/utils'

/** Cores por faixa do seed; faixas novas caem no estilo neutro. */
const BAND_STYLES: Record<string, string> = {
  'ponto-de-partida': 'bg-[#FFF1E3] text-[#8A4300]',
  'em-construcao': 'bg-[#FFF6C2] text-[#6B5000]',
  'bom-caminho': 'bg-[#DCEBFF] text-[#0749A8]',
  'reta-final': 'bg-[#D6F5E0] text-[#065E28]',
}

/** Cores das barras por faixa (validadas para daltonismo; sempre com rótulo ao lado). */
export const BAND_BAR_COLORS: Record<string, string> = {
  'ponto-de-partida': '#C2410C',
  'em-construcao': '#C99A06',
  'bom-caminho': '#0A6DE6',
  'reta-final': '#0C6E32',
}

export function BandBadge({ slug, label }: { slug: string; label: string }) {
  return (
    <span
      className={cn(
        'inline-block whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold',
        BAND_STYLES[slug] ?? 'bg-[#EEF1F6] text-painel-texto',
      )}
    >
      {label}
    </span>
  )
}
