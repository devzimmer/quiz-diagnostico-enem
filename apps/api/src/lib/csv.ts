const BOM = '﻿'
/** Começos que planilhas interpretam como fórmula (CSV/formula injection). */
const FORMULA_START = /^[=+\-@\t\r]/

function cell(value: string | number): string {
  // números são dados nossos (nota): não há fórmula a neutralizar
  if (typeof value === 'number') return String(value)
  const safe = FORMULA_START.test(value) ? `'${value}` : value
  return /[;"\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
}

/**
 * CSV para Excel em pt-BR: separador `;`, BOM para o Excel reconhecer UTF-8, CRLF.
 * Texto vindo do usuário que comece com `=`, `+`, `-`, `@`, tab ou CR ganha `'` na frente.
 */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  const lines = [header, ...rows].map((row) => row.map(cell).join(';'))
  return `${BOM}${lines.join('\r\n')}\r\n`
}
