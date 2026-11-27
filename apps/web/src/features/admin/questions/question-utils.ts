import type { InactiveAdminQuestion } from '@quiz/shared'
import { formatDate } from '@/lib/format'

/** Nova ordem com o item `index` trocado pelo vizinho (`-1` sobe, `1` desce). */
export function moveItem<T>(list: readonly T[], index: number, delta: -1 | 1): T[] {
  const target = index + delta
  const next = [...list]
  if (target < 0 || target >= list.length) return next
  ;[next[index], next[target]] = [next[target]!, next[index]!]
  return next
}

/** Maior peso entre as alternativas (campos vazios contam como 0). */
export function maxWeight(options: readonly { weight: number }[]): number {
  return options.reduce((max, o) => (Number.isFinite(o.weight) ? Math.max(max, o.weight) : max), 0)
}

export function inactiveReasonLabel(
  question: Pick<InactiveAdminQuestion, 'inactiveReason' | 'replacedBy' | 'deactivatedAt'>,
): string {
  const date = formatDate(question.deactivatedAt)
  if (question.inactiveReason === 'deactivated') return `Desativada em ${date}`
  const position = question.replacedBy?.position
  return position
    ? `Substituída pela versão atual da pergunta ${position} em ${date}`
    : `Substituída por uma nova versão em ${date}`
}

export const answersLabel = (count: number) =>
  count === 0 ? 'Sem respostas ainda' : count === 1 ? '1 resposta' : `${count} respostas`
