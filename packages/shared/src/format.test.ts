import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatPhone, maskPhoneInput } from './format'
import { leadInputSchema } from './lead'

describe('formatPhone', () => {
  it.each([
    ['11987654321', '(11) 98765-4321'],
    ['1134567890', '(11) 3456-7890'],
    ['1198', '(11) 98'],
    ['1', '(1'],
    ['', ''],
    ['(11) 98765-4321', '(11) 98765-4321'],
    ['119876543210000', '(11) 98765-4321'],
  ])('%s → %s', (raw, expected) => expect(formatPhone(raw)).toBe(expected))
})

describe('datas em America/Sao_Paulo', () => {
  it('formatDateTime', () =>
    expect(formatDateTime('2026-11-27T17:32:00Z')).toBe('27/11/2026 14:32'))
  it('formatDate', () => expect(formatDate('2026-11-28T01:00:00Z')).toBe('27/11/2026'))
})

describe('maskPhoneInput (campo de telefone)', () => {
  const inputs = ['+55 11 98765-4321', '011987654321', '(11) 98765-4321']

  it.each(inputs)('colar %s mostra (11) 98765-4321 e passa no schema', (pasted) => {
    const shown = maskPhoneInput(pasted)
    expect(shown).toBe('(11) 98765-4321')
    expect(leadInputSchema.shape.phone.parse(shown)).toBe('11987654321')
  })

  it.each(inputs)('digitar %s tecla a tecla termina válido', (typed) => {
    let field = ''
    for (const char of typed) field = maskPhoneInput(field + char)
    expect(field).toBe('(11) 98765-4321')
  })
})
