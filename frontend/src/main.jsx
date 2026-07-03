import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './css/global.css'
import './css/components.css'
import './css/animations.css'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
