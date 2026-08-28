import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import Problem from './components/sections/Problem'
import IntroduceNoma from './components/sections/IntroduceNoma'
import FlowIntro from './components/sections/FlowIntro'
import InteractiveDemo from './components/sections/InteractiveDemo'
import Hardware from './components/sections/Hardware'
import Modules from './components/sections/Modules'
import HowItWorks from './components/sections/HowItWorks'
import Vision from './components/sections/Vision'
import Founder from './components/sections/Founder'
import CTA from './components/sections/CTA'

export default function App() {
  return (
    <div className="min-h-screen bg-base-950">
      <Navigation />
      <main>
        <Hero />
        <Problem />
        <IntroduceNoma />
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
}
