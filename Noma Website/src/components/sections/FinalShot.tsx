import { useEffect, useState } from 'react'
import { useInView } from 'framer-motion'
import { useRef } from 'react'
import KeyboardVisual from '../visuals/KeyboardVisual'
import Reveal from '../ui/Reveal'
import nomaMark from '../../assets/noma-mark.png'
import nomaWordmark from '../../assets/noma-wordmark.png'

interface Beat {
  appName: string
  controls?: string[]
  readout?: { label: string; sub: string } | null
}

// Cycles through the four contexts the page already demonstrated, then
// settles on the wordmark itself and stops — a closing recap, not a
// perpetual loop (the product brief explicitly asks to avoid "constant
// movement").
const BEATS: Beat[] = [
  { appName: 'VS Code', controls: ['Run', 'Terminal', 'Commit', 'Screenshot'] },
  { appName: 'Claude', controls: ['Screenshot', 'Prompt', 'Paste', 'Run'] },
  { appName: 'Chrome', controls: ['Back', 'New Tab', 'Search', 'Save'] },
  { appName: 'GitHub', controls: ['Commit', 'Pull', 'Issues', 'Open'] },
  { appName: 'Figma', controls: ['Frame', 'Component', 'Zoom', 'Comment'] },
  { appName: 'Premiere', controls: ['Cut', 'Ripple', 'Zoom', 'Export'] },
  { appName: 'Noma', readout: { label: 'NOMA', sub: 'YOUR KEYBOARD' } },
]

const BEAT_MS = 900

export default function FinalShot() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-20% 0px -20% 0px' })
  const [beatIndex, setBeatIndex] = useState(0)

  useEffect(() => {
    if (!inView || beatIndex >= BEATS.length - 1) return
    const timer = setTimeout(() => setBeatIndex((i) => Math.min(i + 1, BEATS.length - 1)), BEAT_MS)
    return () => clearTimeout(timer)
  }, [inView, beatIndex])

  const beat = BEATS[beatIndex]

  return (
    <div ref={ref}>
      <section className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[50vh] hero-glow" />
        <div className="relative mx-auto max-w-3xl px-6 text-center sm:px-8">
          <div className="relative mx-auto w-full max-w-xl" aria-hidden="true">
            <KeyboardVisual appName={beat.appName} controls={beat.controls} readout={beat.readout} glow float={false} showPinConnectors={false} />
          </div>

          <Reveal delay={0.1} className="mt-16">
            <p className="text-balance font-display text-[clamp(1.75rem,4.5vw,2.75rem)] font-semibold leading-[1.15] tracking-tight text-base-50">
              Your workflow.
              <br />
              At your fingertips.
            </p>
          </Reveal>

          <Reveal delay={0.18} className="mt-10 flex items-center justify-center gap-3">
            <img src={nomaMark} alt="" className="h-7 w-auto" />
            <img src={nomaWordmark} alt="Noma" className="h-3.5 w-auto" />
          </Reveal>

          <Reveal delay={0.24} className="mt-10">
            <a
              href="#waitlist"
              className="inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-medium text-base-950 transition-colors hover:bg-accent-bright"
            >
              Join the Waitlist <span aria-hidden>&rarr;</span>
            </a>
          </Reveal>
        </div>
      </section>
    </div>
  )
}
