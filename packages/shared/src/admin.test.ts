import { describe, expect, it } from 'vitest'
import { leadListQuerySchema, questionStatusSchema, reorderSchema } from './admin'

describe('leadListQuerySchema', () => {
  it('converte números da query string e aplica padrões', () => {
    expect(leadListQuerySchema.parse({ page: '2', pageSize: '50' })).toEqual({
      page: 2,
      pageSize: 50,
    })
    expect(leadListQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 })
  })

  it('faz trim da busca e descarta busca vazia', () => {
    expect(leadListQuerySchema.parse({ search: '  ana ' }).search).toBe('ana')
    expect(leadListQuerySchema.parse({ search: '   ' }).search).toBeUndefined()
  })

  it.each([{ pageSize: '101' }, { page: '0' }, { band: 'Bom Caminho' }, { page: 'abc' }])(
    'rejeita %o',
    (query) => expect(leadListQuerySchema.safeParse(query).success).toBe(false),
  )

  it('aceita slug de faixa', () =>
    expect(leadListQuerySchema.parse({ band: 'bom-caminho' }).band).toBe('bom-caminho'))
})

describe('questionStatusSchema', () => {
  it('padrão active', () => expect(questionStatusSchema.parse(undefined)).toBe('active'))
  it('rejeita outro valor', () => expect(questionStatusSchema.safeParse('foo').success).toBe(false))
})

describe('reorderSchema', () => {
  const a = '6f1b3c2e-6a52-4f0e-9a0e-0a7a1c6b8d01'
  it('rejeita ids repetidos', () =>
    expect(reorderSchema.safeParse({ questionIds: [a, a] }).success).toBe(false))
  it('aceita lista válida', () =>
    expect(reorderSchema.parse({ questionIds: [a] }).questionIds).toEqual([a]))
})
