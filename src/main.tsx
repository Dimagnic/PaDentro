import { lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

const Admin = lazy(() => import('./admin/Admin'))
const Track = lazy(() => import('./Track'))
const path = location.pathname.replace(/\/+$/, '')

createRoot(document.getElementById('root')!).render(
  path === '/admin' ? <Suspense fallback={null}><Admin /></Suspense>
  : path === '/pedido' ? <Suspense fallback={null}><Track /></Suspense>
  : <App />,
)
