import { Route, Routes } from 'react-router-dom'
import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import ScrollToHash from './components/layout/ScrollToHash'
import Home from './pages/Home'
import Contact from './pages/Contact'
import Privacy from './pages/Privacy'
import Terms from './pages/Terms'

/**
 * The router/layout shell: `Navigation` and `Footer` are shared chrome
 * across every route, `Routes` swaps only the page content between them.
 * The single-page marketing scroll (`Home`, formerly this file's own
 * inline JSX) got its own page component when routing was added for
 * `/contact`, `/privacy`, and `/terms` — see that file's own doc comment.
 * `ScrollToHash` (not React Router's default, which doesn't jump on route
 * change on its own) resets scroll position on every navigation, and
 * finishes the job for a `/#hash` link from `SiteLink.tsx`.
 */
export default function App() {
  // Reduced-motion users get plain native scroll rather than Lenis's eased
  // momentum — smooth scrolling is a nicety, not something to force on people
  // who've asked their system to minimize motion.
  const reduceMotion = useReducedMotion()

  const page = (
    <div className="min-h-screen bg-base-950">
      <ScrollToHash />
      <Navigation />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
        </Routes>
      </main>
      <Footer />
    </div>
  )

  if (reduceMotion) return page

  return (
    // `anchors` defaults to false — without it, every in-page `<a href="#...">`
    // (nav links, Hero's CTA, Footer's links) falls straight through to the
    // browser's native instant jump, completely bypassing Lenis, which only
    // smooths wheel/touch/programmatic scrolling on its own. The offset keeps
    // a scrolled-to heading clear of the fixed top nav bar.
    <ReactLenis root options={{ lerp: 0.11, duration: 1.1, wheelMultiplier: 1, anchors: { offset: -80 } }}>
      {page}
    </ReactLenis>
  )
}
