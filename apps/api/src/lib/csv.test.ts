import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

const BOM = '﻿'

describe('toCsv', () => {
  it('BOM, separador ; e CRLF entre linhas', () => {
    expect(toCsv(['Nome', 'Pontuação'], [['Ana', 64]])).toBe(`${BOM}Nome;Pontuação\r\nAna;64\r\n`)
  })

  it('aspas em células com ;, aspas ou quebra de linha', () => {
    expect(toCsv(['a'], [['x;y'], ['diz "oi"'], ['linha\nnova']])).toBe(
      `${BOM}a\r\n"x;y"\r\n"diz ""oi"""\r\n"linha\nnova"\r\n`,
    )
  })

  it.each(['=SOMA(A1)', '+5511', '-1', '@cmd', '\tx', '\rx'])(
    'neutraliza fórmula: %j ganha apóstrofo',
    (value) => {
      const line = toCsv(['a'], [[value]]).split('\r\n')[1]!
      expect(line.replace(/^"|"$/g, '').startsWith(`'${value[0]}`)).toBe(true)
    },
  )

  it('números negativos de verdade não são alterados', () => {
    expect(toCsv(['n'], [[-1]])).toBe(`${BOM}n\r\n-1\r\n`)
  })
})
