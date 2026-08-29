import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Problem from './components/sections/Problem'
import IntroduceNoma from './components/sections/IntroduceNoma'
import AppPreview from './components/sections/AppPreview'
import FlowIntro from './components/sections/FlowIntro'
import InteractiveDemo from './components/sections/InteractiveDemo'
import Hardware from './components/sections/Hardware'
import Modules from './components/sections/Modules'
import HowItWorks from './components/sections/HowItWorks'
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
        <IntroduceNoma />
        <AppPreview />
        <FlowIntro />
        <InteractiveDemo />
        <Hardware />
        <Modules />
        <HowItWorks />
        <Vision />
        <Founder />
        <CTA />
      </main>
      <Footer />
    </div>
  )

  if (reduceMotion) return page

  return (
    <ReactLenis root options={{ lerp: 0.11, duration: 1.1, wheelMultiplier: 1 }}>
      {page}
    </ReactLenis>
  )
}
