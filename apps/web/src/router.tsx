import { createBrowserRouter } from 'react-router-dom'
import { QuizRoutesLayout } from './features/quiz/components/QuizLayout'
import { ContactPage } from './features/quiz/pages/ContactPage'
import { IntroPage } from './features/quiz/pages/IntroPage'
import { QuestionPage } from './features/quiz/pages/QuestionPage'
import { ResultPage } from './features/quiz/pages/ResultPage'

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
  {
    // O painel (e o supabase-js) só é baixado por quem acessa /admin.
    path: '/admin/*',
    lazy: () => import('./features/admin/routes').then((m) => ({ Component: m.AdminApp })),
  },
])
