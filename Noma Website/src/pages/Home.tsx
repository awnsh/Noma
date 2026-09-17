import Hero from '../components/sections/Hero'
import AppAwareness from '../components/sections/AppAwareness'
import EditorialContrast from '../components/sections/EditorialContrast'
import WorkflowLearning from '../components/sections/WorkflowLearning'
import KeyboardCloseup from '../components/sections/KeyboardCloseup'
import AppCompatibility from '../components/sections/AppCompatibility'
import SoftwareShowcase from '../components/sections/SoftwareShowcase'
import WorkflowBuilder from '../components/sections/WorkflowBuilder'
import UnderTheHood from '../components/sections/UnderTheHood'
import Vision from '../components/sections/Vision'
import Waitlist from '../components/sections/Waitlist'
import FinalShot from '../components/sections/FinalShot'

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
// Moved out of `App.tsx` into its own page when routing was added for
// /contact, /privacy, and /terms — `App.tsx` is now the router/layout
// shell (Navigation + Routes + Footer), and this file is just the "/"
// route's content, unchanged from what App.tsx used to render directly.
export default function Home() {
  return (
    <>
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
    </>
  )
}
