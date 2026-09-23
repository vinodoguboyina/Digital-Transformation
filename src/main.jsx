import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const savedScroll = sessionStorage.getItem('dt-scroll')
if (savedScroll != null) {
  sessionStorage.removeItem('dt-scroll')
  try {
    const { y, t } = JSON.parse(savedScroll)
    if (Date.now() - t < 4000) {
      history.scrollRestoration = 'manual'
      const restore = () => window.scrollTo(0, y)
      restore()
      requestAnimationFrame(restore)
      window.addEventListener('load', restore)
    }
  } catch {
    // Ignore a stale scroll marker.
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
