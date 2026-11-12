import { Route, Routes } from 'react-router-dom'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import ScrollToHash from './components/layout/ScrollToHash'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'
import Uninstall from './pages/Uninstall'
import Feedback from './pages/Feedback'

/**
 * Router/layout shell. 2026-11-12 keyboard redesign: plain native scrolling
 * (Lenis removed), and /device dropped, since it described the old desktop
 * hardware concept. /uninstall and /feedback stay reachable for existing
 * app beta users but are no longer linked from the site.
 */
export default function App() {
  return (
    <div className="min-h-screen bg-paper">
      <ScrollToHash />
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/uninstall" element={<Uninstall />} />
          <Route path="/feedback" element={<Feedback />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )
}
