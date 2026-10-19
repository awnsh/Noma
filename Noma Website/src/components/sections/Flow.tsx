import { useState } from 'react'
import Section from '../layout/Section'
import SectionIntro from '../ui/SectionIntro'
import Reveal from '../ui/Reveal'
import AdaptiveSurface from '../visuals/AdaptiveSurface'
import FlowSuggestion from '../visuals/FlowSuggestion'
import { SAVED_LABEL, ZONES } from '../../data/flowDemo'
import { appProfiles } from '../../data/appProfiles'

/**
 * Flow, the main feature: the suggestion as Noma shows it (clickable), and
 * Chrome's controls beside it, which change when the visitor saves the
 * workflow to a zone. That one change is the whole idea: many steps, one
 * press.
 */
export default function Flow() {
  const [slot, setSlot] = useState<number | null>(null)
  const controls = appProfiles.chrome.controls.map((control, index) => (index === slot ? SAVED_LABEL : control))

  return (
    <Section id="flow">
      <SectionIntro
        title="Turn a repeated workflow into one press."
        line="When Noma sees the same steps across your apps a few times, it asks whether you want them on a single control. It never saves one without asking. Try it below."
      />

      <div className="mt-14 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
        <Reveal>
          <FlowSuggestion onSaved={setSlot} />
        </Reveal>

        <Reveal delay={0.08}>
          <p className="mb-3 text-sm text-base-400">Your controls in Chrome</p>
          <AdaptiveSurface appId="chrome" size="md" controls={controls} highlight={slot} />
          <p className="mt-4 text-sm leading-relaxed text-base-400">
            {slot === null
              ? 'Save the workflow to a zone and it lands here.'
              : `${ZONES[slot]} is now five steps in one swipe.`}
          </p>
        </Reveal>
      </div>
    </Section>
  )
}
