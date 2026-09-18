import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import i18n from './i18n/config.js'

try {
  const trackImg = new Image()
  trackImg.src = `/api/v1/track/pixel?url=${encodeURIComponent(window.location.href)}&r=${Math.random()}`
} catch (err) {
  console.error('tracking pixel failed', err)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#0A122C] flex items-center justify-center text-white text-lg">{i18n.t('common.loading')}</div>}>
      <App />
    </Suspense>
  </StrictMode>,
)
