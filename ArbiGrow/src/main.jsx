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
