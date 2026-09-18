<<<<<<< HEAD
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
=======
import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import './i18n/config.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<div className="min-h-screen bg-[#0A122C] flex items-center justify-center text-white text-lg">Loading...</div>}>
      <App />
    </Suspense>
  </StrictMode>,
)
>>>>>>> d04f360fd06044540c5688a5c1c27c786e7355f0
