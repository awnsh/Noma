import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { NoticeSurface } from './notice/NoticeSurface'
import './styles/globals.css'
import './styles/motion-content.css'

/**
 * One bundle, two windows. The main window loads this normally; Noma
 * Notice's window loads the same index.html with `?surface=notice`
 * (main/notifications/notificationWindow.ts) and gets the floating card
 * instead of the app shell.
 *
 * A query parameter rather than a second Vite entry point on purpose: the
 * notice is built from the app's own components, tokens and fonts, so it
 * should ship as part of the same bundle. This way the build config,
 * the preload and the packaging story all stay exactly as they were.
 */
const isNoticeSurface = new URLSearchParams(window.location.search).get('surface') === 'notice'

// The notice window is transparent; its document must not paint the app's
// page canvas over the desktop behind it (see globals.css).
if (isNoticeSurface) document.documentElement.classList.add('noma-notice-surface')

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>{isNoticeSurface ? <NoticeSurface /> : <App />}</React.StrictMode>
)
