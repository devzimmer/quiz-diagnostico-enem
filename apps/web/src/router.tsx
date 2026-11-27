import { createBrowserRouter } from 'react-router-dom'

const EmConstrucao = ({ nome }: { nome: string }) => (
  <main className="grid min-h-dvh place-items-center bg-papel-grade p-6 text-center">
    <h1 className="font-display text-4xl uppercase">{nome}</h1>
  </main>
)

export const router = createBrowserRouter([
  { path: '/', element: <EmConstrucao nome="Início" /> },
  { path: '/quiz', element: <EmConstrucao nome="Perguntas" /> },
  { path: '/quiz/contato', element: <EmConstrucao nome="Contato" /> },
  { path: '/quiz/resultado', element: <EmConstrucao nome="Resultado" /> },
  { path: '/admin/*', element: <EmConstrucao nome="Admin" /> },
])
