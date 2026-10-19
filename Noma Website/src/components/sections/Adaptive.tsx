import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import Section from '../layout/Section'
import SectionIntro from '../ui/SectionIntro'
import Reveal from '../ui/Reveal'
import AdaptiveSurface from '../visuals/AdaptiveSurface'
import AppIcon from '../visuals/AppIcon'
import { appProfiles } from '../../data/appProfiles'

/**
 * The larger idea: not a toolbar set up once, but an interface that keeps
 * changing with the person. The app picker (from the earlier Context
 * section) shows the most visible part; the list under it names what Noma
 * actually adapts to, all of it real: the app in front, the shortcuts used
 * there, the workflows repeated, and which suggestions get kept or
 * dismissed (Flow's learned filter trains on exactly that).
 *
 * The picker advances on its own until the first click, then stops for good.
 */

const APPS = ['chrome', 'spotify', 'discord', 'notion', 'premiere', 'vscode']
const DWELL_MS = 3200

const SIGNALS = [
  { title: 'The app in front', body: 'Every app gets its own four controls.' },
  { title: 'What you do there', body: 'The shortcuts you actually reach for.' },
  { title: 'What you repeat', body: 'Workflows you do again and again.' },
  { title: 'What you keep', body: 'Suggestions you keep or dismiss shape the next ones.' },
]

export default function Adaptive() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState('chrome')
  const [taken, setTaken] = useState(false)

  useEffect(() => {
    if (taken || reduceMotion) return
    const timer = setInterval(
      () => setActive((current) => APPS[(APPS.indexOf(current) + 1) % APPS.length]),
      DWELL_MS
    )
    return () => clearInterval(timer)
  }, [taken, reduceMotion])

  const choose = (id: string) => {
    setTaken(true)
    setActive(id)
  }

  return (
    <Section id="adaptive" bare>
      <SectionIntro
        title="Noma gets better as you use it."
        line="Each app gets its own controls, and they shift as Noma learns how you use it. Pick an app to see its set."
      />

      {/* grid-cols-1 is minmax(0,1fr): without it the implicit mobile column
          sizes to the scrolling app rail's full width and pushes the surface
          off-screen. */}
      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12">
        <Reveal>
          <ul
            className="-mx-6 flex gap-2 overflow-x-auto px-6 pb-2 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0"
            role="tablist"
            aria-label="Application"
          >
            {APPS.map((id) => {
              const app = appProfiles[id]
              const isActive = id === active
              return (
                <li key={id} className="shrink-0 lg:shrink">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => choose(id)}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors duration-200 ${
                      isActive
                        ? 'border-white/12 bg-white/[0.05] text-base-50'
                        : 'border-transparent text-base-400 hover:bg-white/[0.025] hover:text-base-200'
                    }`}
                  >
                    <AppIcon id={id} color={isActive ? app.color : undefined} className="h-5 w-5 shrink-0" />
                    <span className="whitespace-nowrap text-sm font-medium tracking-tight">{app.shortName}</span>
                  </button>
                </li>
              )
            })}
          </ul>
        </Reveal>

        <Reveal delay={0.06}>
          <AdaptiveSurface appId={active} size="lg" />
        </Reveal>
      </div>

      <div className="mt-16 grid gap-8 border-t border-base-800 pt-10 sm:grid-cols-2 lg:grid-cols-4">
        {SIGNALS.map((signal, index) => (
          <Reveal key={signal.title} delay={index * 0.06}>
            <h3 className="font-display text-base font-semibold tracking-tight text-base-50">{signal.title}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-base-400">{signal.body}</p>
          </Reveal>
        ))}
      </div>
    </Section>
  )
}
