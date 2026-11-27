import { describe, expect, it } from 'vitest'
import { safeNextPath } from './next-path'

describe('safeNextPath', () => {
  it('aceita rotas internas do painel', () => {
    expect(safeNextPath('/admin/perguntas?status=desativadas')).toBe(
      '/admin/perguntas?status=desativadas',
    )
    expect(safeNextPath('/admin')).toBe('/admin')
  })

  it.each([null, '', 'https://evil.com', '//evil.com/admin', '/quiz', '/admin/login', '/admin\\x'])(
    'recusa %s e volta para /admin',
    (value) => expect(safeNextPath(value)).toBe('/admin'),
  )
})
