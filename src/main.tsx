import './utils/reactSlotPatch'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ModusWcThemeProvider, setAssetPath } from '@trimble-oss/moduswebcomponents-react'
import './index.css'
import App from './App.tsx'

setAssetPath(`${window.location.origin}${import.meta.env.BASE_URL}`)

createRoot(document.getElementById('root')!).render(
  <ModusWcThemeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ModusWcThemeProvider>,
)
