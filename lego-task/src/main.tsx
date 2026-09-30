import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/atkinson-hyperlegible-next'
import './styles/global.css'
import App from './App.tsx'
import { useSession } from './state/session'

if (import.meta.env.DEV) {
  ;(window as any).useSession = useSession
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
