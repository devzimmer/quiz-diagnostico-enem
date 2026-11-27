import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

const LETTERS = 'ABCDEFGH'

export function OptionButton({
  index,
  text,
  selected,
  onSelect,
}: {
  index: number
  text: string
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        'flex min-h-16 w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3 text-left transition active:scale-[0.99]',
        selected
          ? 'border-azul-fundo bg-azul-suave shadow-opcao-sel'
          : 'border-azul-claro bg-white shadow-opcao hover:border-[#8DBBF5]',
      )}
    >
      <span
        aria-hidden
        className={cn(
          'flex size-[34px] shrink-0 items-center justify-center rounded-full text-sm font-extrabold transition-colors',
          selected ? 'bg-azul-fundo text-white' : 'bg-azul-claro text-azul-esc',
        )}
      >
        {selected ? <Check className="size-4" strokeWidth={3} /> : LETTERS[index]}
      </span>
      <span className="flex-1 text-base font-medium leading-snug text-tinta">{text}</span>
    </button>
  )
}
