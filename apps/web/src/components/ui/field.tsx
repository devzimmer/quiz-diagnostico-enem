import * as LabelPrimitive from '@radix-ui/react-label'
import { CircleAlert } from 'lucide-react'
import { forwardRef } from 'react'
import { cn } from '@/lib/utils'

export const Label = forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root ref={ref} className={cn('text-sm font-semibold', className)} {...props} />
))
Label.displayName = 'Label'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-11 w-full rounded-[10px] border-[1.5px] border-[#D5DCE8] bg-white px-3.5 text-[15px] outline-none transition focus:border-marca focus:ring-4 focus:ring-marca/10 disabled:opacity-60 aria-[invalid=true]:border-erro aria-[invalid=true]:bg-erro-fundo',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      'w-full resize-y rounded-[10px] border-[1.5px] border-[#D5DCE8] bg-white px-3.5 py-3 text-[15px] leading-snug outline-none transition focus:border-marca focus:ring-4 focus:ring-marca/10 aria-[invalid=true]:border-erro',
      className,
    )}
    {...props}
  />
))
Textarea.displayName = 'Textarea'

/** Mensagem de erro de campo, ligada ao input por `aria-describedby`. */
export function FieldError({ id, children }: { id: string; children?: React.ReactNode }) {
  if (!children) return null
  return (
    <p id={id} className="flex items-center gap-1.5 text-[13px] font-medium text-erro">
      <CircleAlert aria-hidden className="size-4 shrink-0" />
      {children}
    </p>
  )
}
