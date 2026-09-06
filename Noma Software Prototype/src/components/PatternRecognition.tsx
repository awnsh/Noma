import { AnimatePresence, motion } from 'framer-motion'
import { appProfiles, type AppId } from '../data/appProfiles'
import type { DetectedActivity } from '../lib/detectActivity'
import type { RecognizedWorkflow } from '../store/nomaStore'

interface PatternRecognitionProps {
  currentAppId: AppId
  detectedActivity: DetectedActivity | null
  recognizedWorkflow: RecognizedWorkflow | null
}

/**
 * The actual selling point, said in plain language: Noma noticing what
 * you're doing inside an app (detectedActivity) and noticing a pattern
 * across apps (recognizedWorkflow) — always visible, no accept/reject
 * loop attached to it. This is the headline; the keyboard emphasizing the
 * relevant keys underneath is the proof.
 */
export function PatternRecognition({ currentAppId, detectedActivity, recognizedWorkflow }: PatternRecognitionProps) {
  const app = appProfiles[currentAppId]

  const state = detectedActivity
    ? { key: `activity:${detectedActivity.id}`, active: true, text: `Pattern recognized — ${detectedActivity.label} in ${app.shortName}` }
    : recognizedWorkflow
      ? {
          key: `workflow:${recognizedWorkflow.a}:${recognizedWorkflow.b}`,
          active: true,
          text: `Workflow recognized — you move between ${appProfiles[recognizedWorkflow.a].shortName} and ${appProfiles[recognizedWorkflow.b].shortName}`,
        }
      : { key: 'idle', active: false, text: 'Noma is watching for patterns in how you work.' }

  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-base-900/40 px-4 py-3">
      <span
        aria-hidden
        className={`h-1.5 w-1.5 shrink-0 rounded-full transition-colors duration-300 ${state.active ? 'bg-flow' : 'bg-base-700'}`}
      />
      <AnimatePresence mode="wait">
        <motion.p
          key={state.key}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className={`text-sm ${state.active ? 'text-flow-bright' : 'text-base-500'}`}
        >
          {state.text}
        </motion.p>
      </AnimatePresence>
    </div>
  )
}
