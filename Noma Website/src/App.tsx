import { ReactLenis } from 'lenis/react'
import { useReducedMotion } from 'framer-motion'
import Navigation from './components/layout/Navigation'
import Footer from './components/layout/Footer'
import Hero from './components/sections/Hero'
import AppAwareness from './components/sections/AppAwareness'
import EditorialContrast from './components/sections/EditorialContrast'
import WorkflowLearning from './components/sections/WorkflowLearning'
import KeyboardCloseup from './components/sections/KeyboardCloseup'
import AppCompatibility from './components/sections/AppCompatibility'
import SoftwareShowcase from './components/sections/SoftwareShowcase'
import WorkflowBuilder from './components/sections/WorkflowBuilder'
import UnderTheHood from './components/sections/UnderTheHood'
import Vision from './components/sections/Vision'
import Waitlist from './components/sections/Waitlist'
import FinalShot from './components/sections/FinalShot'

// 2026 ground-up redesign — the entire page rebuilt around one narrative
// arc (see the session's own brief: "what is this?" -> "it's a keyboard"
// -> "wait, it knows what I'm doing?" -> ... -> "I want to try this"),
// not a section-by-section restyle of the previous page. Every section
// below is new or substantially rebuilt for this pass; nothing here is the
// old IA with a fresh coat of paint. Old sections this replaces
// (Problem/AdaptiveIntelligence/ProductDemo/Holo/Hardware/Applications/
// Privacy/BuildingInPublic/CTA) are deleted, not layered underneath —
// recoverable from git history if any single piece is ever wanted back,
// same convention every prior trim on this site has used.
//
// Order: Hero (the claim) -> AppAwareness (context awareness, demonstrated)
// -> EditorialContrast (the one early light break, a believable desktop)
// -> WorkflowLearning (the flagship "it learns" moment) -> KeyboardCloseup
// (the one place a visitor can click something themselves) ->
// AppCompatibility (the one consolidated "which apps" answer, a marquee of
// real logos) -> SoftwareShowcase (the real app, reused wholesale) ->
// WorkflowBuilder (the visitor builds one) -> UnderTheHood (how, briefly)
// -> Vision (the one slow, wordless beat) -> Waitlist (the second and last
// light section) -> FinalShot (closing recap + final CTA) -> Footer.
//
// Two sections have been trimmed as redundant, both recoverable from git
// history if either is ever wanted back:
// - AdaptsContinuous (a pinned-scroll "same board, three contexts" demo)
//   was a near-duplicate of WorkflowBuilder (both cycle Coding/Design/
//   video-editing categories through the same keyboard).
// - ContextNotCommands (a two-column "traditional vs. Noma" word diagram)
//   sat right after AppAwareness/EditorialContrast/WorkflowLearning had
//   already demonstrated "context, not commands" three times in a row with
//   real product visuals; its own doc comment called itself "a breath, not
//   a third demonstration" — restating the point in words a visitor had
//   just watched happen wasn't earning its place on an already-long page.
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
        <AppAwareness />
        <EditorialContrast />
        <WorkflowLearning />
        <KeyboardCloseup />
        <AppCompatibility />
        <SoftwareShowcase />
        <WorkflowBuilder />
        <UnderTheHood />
        <Vision />
        <Waitlist />
        <FinalShot />
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
