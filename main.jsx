import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './BusLogANM.jsx'

// Preload fonts per performance
const link = document.createElement('link')
link.rel = 'preload'
link.as = 'style'
link.href = 'https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;600;700&family=IBM+Plex+Mono:wght@400;600&display=swap'
document.head.appendChild(link)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)