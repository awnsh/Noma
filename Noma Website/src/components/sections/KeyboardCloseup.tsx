import { useState } from 'react'
import KeyboardVisual from '../visuals/KeyboardVisual'
import Reveal from '../ui/Reveal'
import { appProfiles } from '../../data/appProfiles'
import { GLASS_TOGGLE, GLASS_TOGGLE_ACTIVE } from '../../lib/glass'

const PRESETS = ['vscode', 'claude', 'spotify'] as const

/**
 * "Your workflow. Right where you need it." — a close-up on the one part
 * of the physical product that actually changes: the OLED strip.
 * `oledOnly` crops the illustration down to just the screen (chassis and
 * keys omitted, not shrunk offscreen), enlarged, so it reads as a real
 * product close-up rather than a small detail on a full keyboard shot
 * already shown twice above. The three preset buttons are the "you can
 * actually interact with it" the product brief asks for — a real state
 * change, not a passive animation loop, using the same scan-line screen
 * transition every other section's board already reacts with.
 */
export default function KeyboardCloseup() {
  const [active, setActive] = useState<(typeof PRESETS)[number]>('vscode')
  const profile = appProfiles[active]

  return (
    <section id="closeup" className="relative border-t border-base-800 bg-base-950 py-24 sm:py-32">
      <div className="mx-auto max-w-3xl px-6 text-center sm:px-8">
        <Reveal>
          <h2 className="text-balance font-display text-[clamp(1.9rem,4.5vw,3.25rem)] font-semibold leading-[1.1] tracking-tight text-base-50">
            Your workflow.
            <br />
            <span className="text-base-400">Right where you need it.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="relative mx-auto mt-14 max-w-[220px]">
            <KeyboardVisual appName={profile.name} controls={profile.controls} oledOnly glow float={false} />
          </div>
        </Reveal>

        <Reveal delay={0.15}>
          <p className="mt-8 font-mono text-[11px] uppercase tracking-[0.2em] text-base-500">Try it</p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            {PRESETS.map((id) => {
              const p = appProfiles[id]
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setActive(id)}
                  className={`rounded-full px-4 py-2 text-sm font-medium ${active === id ? GLASS_TOGGLE_ACTIVE : GLASS_TOGGLE}`}
                >
                  {p.shortName}
                </button>
              )
            })}
          </div>
        </Reveal>
      </div>
    </section>
  )
}
