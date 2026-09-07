import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import ProductDemo from './components/sections/ProductDemo'
import HowNomaWorks from './components/sections/HowNomaWorks'
import AppPreview from './components/sections/AppPreview'
import AdaptiveIntelligence from './components/sections/AdaptiveIntelligence'
import Problem from './components/sections/Problem'
import Hardware from './components/sections/Hardware'
import Founder from './components/sections/Founder'
import FAQ from './components/sections/FAQ'
import CTA from './components/sections/CTA'
// `WorkflowDemo` (the original "Flow learns a shortcut" section — a keyboard
// illustration + a big centered caption, the same visual recipe as
// ProductDemo) was replaced, not just shelved: real feedback was that it
// read as a repeated section. `AdaptiveIntelligence` tells the same "Noma
// learns" story but built to look nothing like it — a realistic software
// window instead of the keyboard SVG. Not deleted: `WorkflowDemo.tsx` and
// the `usePinnedScroll` hook it shares with the other two are untouched on
// disk, in case it's wanted back.
// import WorkflowDemo from './components/sections/WorkflowDemo'

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
        <ProductDemo />
        <HowNomaWorks />
        <AppPreview />
        <AdaptiveIntelligence />
        <Problem />
        <Hardware />
        <Founder />
        <FAQ />
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
