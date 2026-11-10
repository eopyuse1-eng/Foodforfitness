import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import { AppDialogProvider } from './components/common/AppDialog.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppDialogProvider>
      <App />
    </AppDialogProvider>
  </React.StrictMode>,
)

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}