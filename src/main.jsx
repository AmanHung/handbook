import { StrictMode, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const previewMode = import.meta.env.DEV ? new URLSearchParams(window.location.search).get('preview') : '';
const RootView = previewMode === 'integration' ? lazy(() => import('./components/PassportIntegrationPreview.jsx')) : previewMode === 'intern'
  ? lazy(() => import('./components/InternPassportPreview.jsx')) : App;

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Suspense fallback={<p style={{ padding: 24 }}>載入學習護照…</p>}><RootView /></Suspense>
  </StrictMode>,
)
