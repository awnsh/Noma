import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Problem from './components/sections/Problem'
import AdaptiveIntelligence from './components/sections/AdaptiveIntelligence'
import ProductDemo from './components/sections/ProductDemo'
import NomaLoop from './components/sections/NomaLoop'
import Difference from './components/sections/Difference'
import Holo from './components/sections/Holo'
import Hardware from './components/sections/Hardware'
import SoftwareHardwareSplit from './components/sections/SoftwareHardwareSplit'
import Applications from './components/sections/Applications'
import Privacy from './components/sections/Privacy'
import BuildingInPublic from './components/sections/BuildingInPublic'
import CTA from './components/sections/CTA'

// The full-redesign page order (2026-09-16): Hero opens on the product, not
// a dashboard. Problem sets up "too many workflows" with real app icons.
// AdaptiveIntelligence (id="watch") and ProductDemo (id="adapt") are the two
// flagship pinned-scroll demonstrations — Watch+Learn, then Adapt — each
// already thoroughly tested; a third, overlapping click-driven demo
// (`HowNomaWorks.tsx`) and the standalone `FAQ.tsx` were retired rather than
// kept as a fourth/fifth voice repeating the same "Noma notices patterns"
// idea (still on disk in git history if ever wanted back). NomaLoop is a
// compact recap, not a new explanation. Difference sets up why any of this
// matters before Holo (the free software product, embedding the real
// interactive `AppPreview` mockup as its own proof, and closing on the
// Holo → Device bridge) hands off to Hardware (id="device", the physical
// product page) → SoftwareHardwareSplit (the hardware isn't the product,
// the intelligence is) → Applications (real app coverage) → Privacy →
// BuildingInPublic (id="about") → CTA.
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
        <AdaptiveIntelligence />
        <ProductDemo />
        <NomaLoop />
        <Difference />
        <Holo />
        <Hardware />
        <SoftwareHardwareSplit />
        <Applications />
        <Privacy />
        <BuildingInPublic />
        <CTA />
      </main>
      <Footer />
    </div>
  )

  if (reduceMotion) return page

  return (
    // `anchors` defaults to false — without it, every in-page `<a href="#...">`
    // (nav links, Hero's "Meet Noma Device", Footer's links) falls straight
    // through to the browser's native instant jump, completely bypassing
    // Lenis, which only smooths wheel/touch/programmatic scrolling on its
    // own. The offset keeps a scrolled-to heading clear of the floating
    // glass nav pill instead of tucking under it.
    <ReactLenis root options={{ lerp: 0.11, duration: 1.1, wheelMultiplier: 1, anchors: { offset: -96 } }}>
      {page}
    </ReactLenis>
  )
}
