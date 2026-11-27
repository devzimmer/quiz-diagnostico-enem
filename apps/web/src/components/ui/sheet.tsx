import * as Dialog from '@radix-ui/react-dialog'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Drawer lateral (Radix Dialog): foco preso, Esc fecha, leitores de tela anunciam o título. */
export function Sheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  className,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: React.ReactNode
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-[rgba(20,37,77,0.45)] data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          className={cn(
            'fixed inset-y-0 right-0 z-50 flex w-full max-w-[560px] flex-col bg-white font-admin text-painel-texto shadow-[-12px_0_40px_rgba(20,37,77,0.18)] outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-right',
            className,
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-painel-borda px-6 py-5">
            <div className="min-w-0">
              {description && (
                <Dialog.Description className="text-[13px] font-medium text-painel-sub">
                  {description}
                </Dialog.Description>
              )}
              <Dialog.Title className="mt-1 text-[22px] font-bold tracking-tight">
                {title}
              </Dialog.Title>
            </div>
            <Dialog.Close
              aria-label="Fechar"
              className="flex size-10 shrink-0 items-center justify-center rounded-[10px] text-painel-sub hover:bg-[#EFF2F8]"
            >
              <X className="size-5" aria-hidden />
            </Dialog.Close>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
          {footer && (
            <div className="flex flex-wrap justify-end gap-2.5 border-t border-painel-borda px-6 py-4">
              {footer}
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
