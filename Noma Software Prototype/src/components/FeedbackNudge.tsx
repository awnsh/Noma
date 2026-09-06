import { AnimatePresence, motion } from 'framer-motion'
import { CloseIcon } from './Icon'

/** A one-time, dismissible nudge toward Feedback — only after real
 *  engagement (3+ apps explored), never on a blind timer. See
 *  store/nomaStore.ts's maybeShowFeedbackNudge. */
export function FeedbackNudge({ visible, onOpen, onDismiss }: { visible: boolean; onOpen: () => void; onDismiss: () => void }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 16 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          className="fixed bottom-5 right-5 z-40 flex max-w-xs items-start gap-3 rounded-2xl border border-base-700 bg-base-900 p-4 shadow-[0_20px_45px_-15px_rgba(0,0,0,0.7)]"
        >
          <div className="flex-1">
            <p className="text-sm text-base-100">Enjoying Noma?</p>
            <p className="mt-0.5 text-xs text-base-500">We'd love two minutes of your feedback.</p>
            <button type="button" onClick={onOpen} className="mt-2 text-xs font-medium text-accent hover:text-accent-bright">
              Share feedback →
            </button>
          </div>
          <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 text-base-600 hover:text-base-400">
            <CloseIcon className="h-4 w-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
