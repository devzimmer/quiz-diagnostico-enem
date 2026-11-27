import { describe, expect, it } from 'vitest'
import { escapeLike } from './like'

describe('escapeLike', () => {
  it('escapa curingas e a barra invertida', () =>
    expect(escapeLike('50%_off\\')).toBe('50\\%\\_off\\\\'))
  it('mantém texto comum', () => expect(escapeLike('ana souza')).toBe('ana souza'))
})
