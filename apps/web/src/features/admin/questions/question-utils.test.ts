import type { InactiveAdminQuestion } from '@quiz/shared'
import { describe, expect, it } from 'vitest'
import { inactiveReasonLabel, maxWeight, moveItem } from './question-utils'

describe('moveItem', () => {
  it('troca o item com o vizinho na direção pedida', () => {
    expect(moveItem(['a', 'b', 'c'], 1, -1)).toEqual(['b', 'a', 'c'])
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'c', 'b'])
  })

  it('nas pontas devolve a mesma ordem', () => {
    expect(moveItem(['a', 'b'], 0, -1)).toEqual(['a', 'b'])
    expect(moveItem(['a', 'b'], 1, 1)).toEqual(['a', 'b'])
  })

  it('não altera o array original', () => {
    const list = ['a', 'b']
    moveItem(list, 0, 1)
    expect(list).toEqual(['a', 'b'])
  })
})

describe('maxWeight', () => {
  it('maior peso válido, ignorando campos vazios', () => {
    expect(maxWeight([{ weight: 3 }, { weight: 10 }, { weight: Number.NaN }])).toBe(10)
    expect(maxWeight([])).toBe(0)
  })
})

describe('inactiveReasonLabel', () => {
  const base = {
    id: 'q1',
    text: 'Pergunta',
    answerCount: 3,
    options: [],
    deactivatedAt: '2026-11-20T15:00:00.000Z',
  } satisfies Partial<InactiveAdminQuestion>

  it('substituída mostra a posição da versão atual', () => {
    expect(
      inactiveReasonLabel({
        ...base,
        inactiveReason: 'replaced',
        replacedBy: { id: 'q2', position: 6 },
      }),
    ).toBe('Substituída pela versão atual da pergunta 6 em 20/11/2026')
  })

  it('substituída por versão que também saiu do quiz', () => {
    expect(
      inactiveReasonLabel({
        ...base,
        inactiveReason: 'replaced',
        replacedBy: { id: 'q2', position: null },
      }),
    ).toBe('Substituída por uma nova versão em 20/11/2026')
  })

  it('desativada', () => {
    expect(inactiveReasonLabel({ ...base, inactiveReason: 'deactivated', replacedBy: null })).toBe(
      'Desativada em 20/11/2026',
    )
  })
})
