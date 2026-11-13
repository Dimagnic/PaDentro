import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const Admin = lazy(() => import('./admin/Admin'))
const isAdmin = location.pathname.replace(/\/+$/, '') === '/admin'

createRoot(document.getElementById('root')!).render(
  isAdmin ? <Suspense fallback={null}><Admin /></Suspense> : <App />,
)
