import { describe, expect, it } from 'vitest'
import { leadsApiPath, readLeadParams } from './lead-params'

describe('readLeadParams', () => {
  it('lê busca, faixa e página da URL', () => {
    expect(readLeadParams(new URLSearchParams('q=mari&faixa=reta-final&page=3'))).toEqual({
      search: 'mari',
      band: 'reta-final',
      page: 3,
    })
  })

  it('valores ausentes ou inválidos viram o padrão', () => {
    expect(readLeadParams(new URLSearchParams('page=abc&faixa='))).toEqual({
      search: '',
      band: null,
      page: 1,
    })
    expect(readLeadParams(new URLSearchParams('page=-2')).page).toBe(1)
    expect(readLeadParams(new URLSearchParams('page=2.5')).page).toBe(1)
  })
})

describe('leadsApiPath', () => {
  it('monta a consulta só com o que foi informado', () => {
    expect(leadsApiPath({ search: '', band: null, page: 1 }, 20)).toBe(
      '/admin/leads?page=1&pageSize=20',
    )
    expect(leadsApiPath({ search: ' 50% off ', band: 'bom-caminho', page: 2 }, 10)).toBe(
      '/admin/leads?page=2&pageSize=10&search=50%25+off&band=bom-caminho',
    )
  })
})
