import type { BandRange } from '@quiz/shared'
import { cn } from '@/lib/utils'

/** Régua 0–100 com as faixas (largura proporcional ao intervalo) e o marcador da nota. */
export function ScoreScale({
  score,
  bands,
  current,
}: {
  score: number
  bands: BandRange[]
  current: string
}) {
  const span = (b: BandRange) => b.maxScore - b.minScore + 1
  const columns = bands.map((b) => `${span(b)}fr`).join(' ')
  return (
    <div aria-hidden className="relative">
      <div className="grid gap-1" style={{ gridTemplateColumns: columns }}>
        {bands.map((b, i) => (
          <span
            key={b.slug}
            className={cn(
              'h-2.5',
              i === 0 && 'rounded-l-full',
              i === bands.length - 1 && 'rounded-r-full',
              b.slug === current ? 'bg-amarelo' : 'bg-white/35',
            )}
          />
        ))}
      </div>
      <span
        className="absolute -top-[5px] size-5 rounded-full border-4 border-tinta bg-white"
        style={{ left: `calc(${score}% - 10px)` }}
      />
      <div
        className="mt-2.5 grid gap-1 text-[11px] font-semibold text-azul-claro"
        style={{ gridTemplateColumns: columns }}
      >
        {bands.map((b) => (
          <span key={b.slug} className={cn(b.slug === current && 'text-white')}>
            {b.minScore}–{b.maxScore}
          </span>
        ))}
      </div>
    </div>
  )
}
