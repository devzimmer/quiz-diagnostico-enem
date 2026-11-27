import { describe, expect, it } from 'vitest'
import { formatDate, formatDateTime, formatPhone } from './format'

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
