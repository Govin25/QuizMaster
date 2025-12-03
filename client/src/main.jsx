import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { registerServiceWorker, captureInstallPrompt } from './utils/pwa'

// Initialize PWA features
if (import.meta.env.PROD) {
  registerServiceWorker().catch(console.error);
  captureInstallPrompt();
}

createRoot(document.getElementById('root')).render(
  <App />
)
