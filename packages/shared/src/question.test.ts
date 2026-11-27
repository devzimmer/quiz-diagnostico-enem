import { describe, expect, it } from 'vitest'
import { questionContentSchema } from './question'

const option = (text: string, weight: number) => ({ text, weight })
const base = {
  text: 'Quantos simulados você já fez?',
  options: [option('Nenhum', 0), option('Vários', 10)],
}

describe('questionContentSchema', () => {
  it('aceita 2 alternativas e faz trim dos textos', () => {
    const parsed = questionContentSchema.parse({
      text: '  Quantos simulados você já fez?  ',
      options: [option(' Nenhum ', 0), option('Vários', 10)],
    })
    expect(parsed.text).toBe('Quantos simulados você já fez?')
    expect(parsed.options[0]?.text).toBe('Nenhum')
  })

  it('aceita 6 alternativas', () => {
    const options = Array.from({ length: 6 }, (_, i) => option(`Opção ${i}`, i))
    expect(questionContentSchema.safeParse({ ...base, options }).success).toBe(true)
  })

  it.each([1, 7])('rejeita %i alternativas', (n) => {
    const options = Array.from({ length: n }, (_, i) => option(`Opção ${i}`, i))
    expect(questionContentSchema.safeParse({ ...base, options }).success).toBe(false)
  })

  it.each([-1, 101, 2.5])('rejeita peso %s', (weight) => {
    const options = [option('A', weight), option('B', 0)]
    expect(questionContentSchema.safeParse({ ...base, options }).success).toBe(false)
  })

  it('rejeita texto da pergunta com 4 caracteres', () =>
    expect(questionContentSchema.safeParse({ ...base, text: 'Abcd' }).success).toBe(false))

  it('rejeita alternativa com texto vazio', () => {
    const options = [option('   ', 1), option('B', 0)]
    expect(questionContentSchema.safeParse({ ...base, options }).success).toBe(false)
  })
})
