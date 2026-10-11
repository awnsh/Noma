import Hero from '../components/sections/Hero'
import DemoGlide from '../components/sections/DemoGlide'
import Problem from '../components/sections/Problem'
import Flow from '../components/sections/Flow'
import HowItWorks from '../components/sections/HowItWorks'
import Adaptive from '../components/sections/Adaptive'
import Privacy from '../components/sections/Privacy'
import Beta from '../components/sections/Beta'

/**
 * 2026-10-06 redesign: what is Noma, how does it work, why is it useful, in
 * that order, with the product shown working right under the hero.
 *
 *   Hero        the claim, with the adaptive controls under it
 *   DemoGlide   Noma noticing a workflow on a rendered MacBook's screen, then
 *               (scrolling on) the camera swings down to the trackpad for
 *               Glide (ids "demo" and "glide"); 2026-10-11
 *   Problem     you shouldn't have to work around your computer
 *   Flow        stop repeating yourself: the real suggestion, clickable
 *   HowItWorks  four steps, short
 *   Adaptive    it gets better as you use it; the larger idea
 *   Privacy     what Noma records and never records (hardware lives on /device)
 *   Beta        the invitation
 *
 * Built from the existing visuals (AdaptiveSurface, the desktop notice scene,
 * ProductNotice, HoloDemo) rather than rebuilt. Cut: NotStatic, Notice and
 * Product, whose jobs moved into Problem, Demo and Flow. Recoverable from git.
 */
export default function Home() {
  return (
    <>
      <Hero />
      <div className="relative">
        <DemoGlide />
        <Problem />
        <Flow />
        <HowItWorks />
        <Adaptive />
        <Privacy />
        <Beta />
      </div>
    </>
  )
}
