import { describe, expect, it } from 'vitest'
import { PHONE_ERROR_MESSAGE, leadInputSchema, normalizeEmail, normalizePhone } from './lead'

describe('normalizePhone', () => {
  it.each([
    ['(11) 98765-4321', '11987654321'],
    ['+55 11 98765-4321', '11987654321'],
    ['011987654321', '11987654321'],
    ['11 3456-7890', '1134567890'],
    ['+55 (11) 3456-7890', '1134567890'],
    ['55987654321', '55987654321'],
  ])('%s → %s', (raw, expected) => expect(normalizePhone(raw)).toBe(expected))
})

describe('normalizeEmail', () => {
  it('remove espaços e passa para minúsculas', () =>
    expect(normalizeEmail('  Maria@Email.COM ')).toBe('maria@email.com'))
})

describe('leadInputSchema', () => {
  const valid = { name: 'Mariana Souza', email: 'mariana@email.com', phone: '(11) 98765-4321' }

  it('aceita e normaliza', () => {
    expect(
      leadInputSchema.parse({ ...valid, name: '  Mariana Souza ', email: '  Maria@Email.COM ' }),
    ).toEqual({
      name: 'Mariana Souza',
      email: 'maria@email.com',
      phone: '11987654321',
    })
  })

  it('aceita telefone fixo', () =>
    expect(leadInputSchema.parse({ ...valid, phone: '(11) 3456-7890' }).phone).toBe('1134567890'))

  it('rejeita nome com menos de 3 caracteres após trim', () =>
    expect(leadInputSchema.safeParse({ ...valid, name: ' Al ' }).success).toBe(false))

  it('rejeita nome com mais de 100 caracteres', () =>
    expect(leadInputSchema.safeParse({ ...valid, name: 'a'.repeat(101) }).success).toBe(false))

  it.each(['mariana@', 'mariana.email.com', ''])('rejeita e-mail "%s"', (email) =>
    expect(leadInputSchema.safeParse({ ...valid, email }).success).toBe(false),
  )

  it.each([
    '98765-4321',
    '(01) 98765-4321',
    '(10) 98765-4321',
    '(11) 88765-4321',
    '(11) 98765-43210',
    '',
  ])('rejeita telefone "%s" com a mensagem padrão', (phone) => {
    const r = leadInputSchema.safeParse({ ...valid, phone })
    expect(r.success).toBe(false)
    expect(r.error?.flatten().fieldErrors.phone).toEqual([PHONE_ERROR_MESSAGE])
  })
})
