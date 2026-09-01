import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Problem from './components/sections/Problem'
import HowNomaWorks from './components/sections/HowNomaWorks'
import AppPreview from './components/sections/AppPreview'
import InteractiveDemo from './components/sections/InteractiveDemo'
import Hardware from './components/sections/Hardware'
import Modules from './components/sections/Modules'
import Vision from './components/sections/Vision'
import Founder from './components/sections/Founder'
import CTA from './components/sections/CTA'

export default function App() {
  // Reduced-motion users get plain native scroll rather than Lenis's eased
  // momentum — smooth scrolling is a nicety, not something to force on people
  // who've asked their system to minimize motion.
  const reduceMotion = useReducedMotion()

  const page = (
    <div className="min-h-screen bg-base-950">
      <Navigation />
      <main>
        <Hero />
        <Problem />
        <HowNomaWorks />
        <AppPreview />
        <InteractiveDemo />
        <Hardware />
        <Modules />
        <Vision />
        <Founder />
        <CTA />
      </main>
      <Footer />
    </div>
  )

  if (reduceMotion) return page

  return (
    // `anchors` defaults to false — without it, every in-page `<a href="#...">`
    // (nav links, Hero's "See How It Works", Footer's links) falls straight
    // through to the browser's native instant jump, completely bypassing
    // Lenis, which only smooths wheel/touch/programmatic scrolling on its
    // own. The offset keeps a scrolled-to heading clear of the floating
    // glass nav pill instead of tucking under it.
    <ReactLenis root options={{ lerp: 0.11, duration: 1.1, wheelMultiplier: 1, anchors: { offset: -96 } }}>
      {page}
    </ReactLenis>
  )
}
