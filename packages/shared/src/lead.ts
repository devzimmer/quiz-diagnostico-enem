import { z } from 'zod'

export const PHONE_ERROR_MESSAGE = 'Informe DDD + número. Ex.: (11) 98765-4321'

/** DDD sem zero (11–99) + 8 dígitos (fixo) ou 9 + 8 dígitos (celular). */
const BR_PHONE = /^[1-9]{2}(?:9\d{8}|\d{8})$/

/**
 * Reduz o telefone a dígitos no formato DDD + número.
 * Aceita colagens comuns: com +55, com zero de tronco em celular (0xx 9xxxx-xxxx) e com máscara.
 * O zero de tronco só é removido com 12 dígitos: com 11, "0" + DDD + fixo é indistinguível
 * de um DDD inválido começando com zero, que deve ser rejeitado.
 */
export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.length === 12 && digits.startsWith('0')) digits = digits.slice(1)
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2)
  }
  return digits
}

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase()
}

export const leadInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Informe seu nome (mínimo de 3 letras)')
    .max(100, 'Nome muito longo (máximo de 100 caracteres)'),
  email: z
    .string()
    .transform(normalizeEmail)
    .pipe(z.string().email('Informe um e-mail válido').max(254, 'E-mail muito longo')),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((digits) => BR_PHONE.test(digits), PHONE_ERROR_MESSAGE),
})

export type LeadInput = z.output<typeof leadInputSchema>
