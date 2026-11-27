import { createBrowserRouter } from 'react-router-dom'
import { QuizRoutesLayout } from './features/quiz/components/QuizLayout'
import { ContactPage } from './features/quiz/pages/ContactPage'
import { IntroPage } from './features/quiz/pages/IntroPage'
import { QuestionPage } from './features/quiz/pages/QuestionPage'
import { ResultPage } from './features/quiz/pages/ResultPage'

const EmConstrucao = ({ nome }: { nome: string }) => (
  <main className="grid min-h-dvh place-items-center bg-papel-grade p-6 text-center">
    <h1 className="font-display text-4xl uppercase">{nome}</h1>
  </main>
)

export const router = createBrowserRouter([
  {
    element: <QuizRoutesLayout />,
    children: [
      { path: '/', element: <IntroPage /> },
      { path: '/quiz', element: <QuestionPage /> },
      { path: '/quiz/contato', element: <ContactPage /> },
      { path: '/quiz/resultado', element: <ResultPage /> },
    ],
  },
  { path: '/admin/*', element: <EmConstrucao nome="Admin" /> },
])
