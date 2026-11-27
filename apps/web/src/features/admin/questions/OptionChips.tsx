import type { AdminOption } from '@quiz/shared'

/** Alternativas com seus pontos, em chips compactos. */
export function OptionChips({ options }: { options: AdminOption[] }) {
  return (
    <ul className="flex flex-wrap gap-1.5" aria-label="Alternativas e pontos">
      {options.map((option) => (
        <li
          key={option.id}
          className="inline-flex items-center gap-2 rounded-lg border border-[#E8ECF3] bg-painel-fundo py-[5px] pl-2.5 pr-1.5 text-[13px] text-[#3B4866]"
        >
          {option.text}
          <span className="rounded-md border border-[#DCE2EC] bg-white px-[7px] py-px text-xs font-bold tabular-nums text-painel-texto">
            {option.weight}
            <span className="sr-only"> pontos</span>
          </span>
        </li>
      ))}
    </ul>
  )
}
