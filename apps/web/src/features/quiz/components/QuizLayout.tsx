import { Outlet } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { QuizProvider } from '../QuizProvider'

/** Moldura das telas do quiz: papel quadriculado, coluna estreita (mobile first) centralizada. */
export function QuizShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className="min-h-dvh bg-papel-grade">
      <main
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-[480px] flex-col px-6 pb-7 pt-4',
          className,
        )}
      >
        {children}
      </main>
    </div>
  )
}

export function QuizRoutesLayout() {
  return (
    <QuizProvider>
      <Outlet />
    </QuizProvider>
  )
}
