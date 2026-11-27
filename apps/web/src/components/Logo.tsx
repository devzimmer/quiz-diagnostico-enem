import logoUrl from '@/assets/logo.svg'
import { cn } from '@/lib/utils'

export const Logo = ({ className }: { className?: string }) => (
  <img src={logoUrl} alt="Plataforma Assaad" className={cn('h-8 w-auto', className)} />
)
