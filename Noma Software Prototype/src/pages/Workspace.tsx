import { useEffect } from 'react'
import { AppSwitcher } from '../components/AppSwitcher'
import { HardwareKeyboard } from '../components/HardwareKeyboard'
import { PatternRecognition } from '../components/PatternRecognition'
import { getEffectiveOrder, maybeShowFeedbackNudge, useNomaStore } from '../store/nomaStore'
import type { ControlDef } from '../data/appProfiles'

/**
 * The hero. This is the first thing anyone sees — a working simulation of
 * the physical hardware, not a page describing it. The sell is Noma
 * recognizing a pattern (what you're doing inside the app, or which apps
 * you keep moving between) and visibly changing the interface around it —
 * not a suggestion you have to act on. Copy stays minimal: the keyboard is
 * the pitch.
 */
export function Workspace() {
  const currentAppId = useNomaStore((s) => s.currentAppId)
  const transitionPhase = useNomaStore((s) => s.transitionPhase)
  const customization = useNomaStore((s) => s.customization)
  const detectedActivity = useNomaStore((s) => s.detectedActivity)
  const recognizedWorkflow = useNomaStore((s) => s.recognizedWorkflow)
  const selectApp = useNomaStore((s) => s.selectApp)
  const pressControl = useNomaStore((s) => s.pressControl)

  useEffect(() => {
    maybeShowFeedbackNudge()
  }, [currentAppId])

  const order = getEffectiveOrder(currentAppId, customization)
  const emphasizedControlIds = detectedActivity?.controlIds ?? []

  const handlePress = (control: ControlDef): void => {
    pressControl(currentAppId, control.id, control.label)
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-base-500">Switch what you're doing. Watch the keyboard change.</p>
        <AppSwitcher activeId={currentAppId} onSelect={selectApp} />
      </div>

      <div className="mx-auto mb-6 max-w-2xl">
        <PatternRecognition currentAppId={currentAppId} detectedActivity={detectedActivity} recognizedWorkflow={recognizedWorkflow} />
      </div>

      {/* A soft product-shot glow behind the chassis — the same restrained
          treatment the Website's own hardware illustration uses (a single
          low-opacity accent wash, not a colorful blob). */}
      <div className="relative">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 mx-auto h-2/3 max-w-4xl -translate-y-1/2 rounded-[50%] bg-accent/[0.07] blur-[100px]"
        />
        <HardwareKeyboard
          appId={currentAppId}
          order={order}
          emphasizedControlIds={emphasizedControlIds}
          transitionPhase={transitionPhase}
          onPress={handlePress}
        />
      </div>
    </div>
  )
}
