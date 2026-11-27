import * as AlertDialog from '@radix-ui/react-alert-dialog'
import { cn } from '@/lib/utils'

/** Diálogo de confirmação acessível (Radix AlertDialog). */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancelar',
  onConfirm,
  tone = 'admin',
  pending = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: React.ReactNode
  confirmLabel: string
  cancelLabel?: string
  onConfirm: () => void
  tone?: 'quiz' | 'admin'
  pending?: boolean
}) {
  const quiz = tone === 'quiz'
  return (
    <AlertDialog.Root open={open} onOpenChange={onOpenChange}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-[rgba(11,42,91,0.5)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <AlertDialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white p-6 shadow-2xl data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            quiz ? 'font-sans text-tinta' : 'font-admin text-painel-texto',
          )}
        >
          <AlertDialog.Title
            className={cn(
              quiz ? 'font-display text-[26px] uppercase leading-tight' : 'text-lg font-bold',
            )}
          >
            {title}
          </AlertDialog.Title>
          <AlertDialog.Description
            className={cn(
              'mt-2 text-[15px] leading-relaxed',
              quiz ? 'text-tinta-2' : 'text-painel-sub',
            )}
          >
            {description}
          </AlertDialog.Description>
          <div className={cn('mt-6 flex gap-3', quiz ? 'flex-col-reverse' : 'justify-end')}>
            <AlertDialog.Cancel
              className={cn(
                quiz
                  ? 'h-12 rounded-full border-2 border-azul-fundo font-bold text-azul-esc hover:bg-azul-suave'
                  : 'h-10 rounded-[10px] border border-[#D5DCE8] px-4 text-sm font-semibold hover:bg-painel-fundo',
              )}
            >
              {cancelLabel}
            </AlertDialog.Cancel>
            <AlertDialog.Action
              disabled={pending}
              onClick={(event) => {
                event.preventDefault()
                onConfirm()
              }}
              className={cn(
                quiz
                  ? 'btn-cta h-12 text-[15px]'
                  : 'h-10 rounded-[10px] bg-marca px-4 text-sm font-semibold text-white hover:bg-marca-hover disabled:opacity-60',
              )}
            >
              {confirmLabel}
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  )
}
