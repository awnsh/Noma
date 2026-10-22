import { parentPort } from 'worker_threads'
import type { WorkflowEvent } from '@shared/types'
import { detectPatterns } from './patternDetection'

/**
 * Pattern detection, off the main thread. A pass over a busy day's events
 * takes long enough (tenths of a second) that running it on the main
 * process would hold up Glide, which times each touch frame as it arrives.
 * Pure in, pure out: events go in, patterns come back (detectInWorker.ts).
 */
parentPort?.on('message', (message: { id: number; events: WorkflowEvent[] }) => {
  try {
    parentPort?.postMessage({ id: message.id, patterns: detectPatterns(message.events) })
  } catch (error) {
    parentPort?.postMessage({ id: message.id, error: error instanceof Error ? error.message : String(error) })
  }
})
