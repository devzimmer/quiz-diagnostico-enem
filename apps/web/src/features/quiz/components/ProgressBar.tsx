import { cn } from '@/lib/utils'

export function ProgressBar({ current, total }: { current: number; total: number }) {
  return (
    <div
      role="progressbar"
      aria-label="Progresso do quiz"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-valuetext={`Pergunta ${current} de ${total}`}
      className="grid gap-1"
      style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-2 rounded-full transition-colors duration-300',
            i < current ? 'bg-azul-fundo' : 'bg-azul-claro',
          )}
        />
      ))}
    </div>
  )
}
