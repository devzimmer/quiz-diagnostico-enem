import { describe, expect, it } from 'vitest'
import { introCopy } from './intro-copy'

describe('introCopy', () => {
  it('usa o número atual de perguntas (o marketing pode mudar pelo painel)', () => {
    expect(introCopy(11)).toEqual({
      lead: 'Responda 11 perguntas rápidas',
      item: '11 perguntas de múltipla escolha',
    })
    expect(introCopy(1).item).toBe('1 pergunta de múltipla escolha')
  })

  it('antes de carregar o quiz, não chuta um número', () => {
    expect(introCopy(undefined)).toEqual({
      lead: 'Responda algumas perguntas rápidas',
      item: 'Perguntas de múltipla escolha',
    })
  })
})
