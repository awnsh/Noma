import type { Worker } from 'worker_threads'
import type { DetectedPattern, WorkflowEvent } from '@shared/types'
import createDetectionWorker from './detectionWorker?nodeWorker'
import { detectPatterns } from './patternDetection'

type Pending = { resolve: (patterns: DetectedPattern[]) => void; events: WorkflowEvent[] }

/**
 * Runs detectPatterns in a worker thread (detectionWorker.ts) so a long pass
 * never blocks the main process. Same result as calling it directly: if the
 * worker can't start or fails, the pass runs in place instead, so Flow keeps
 * working, only on the main thread.
 */
export class WorkerDetector {
  private worker: Worker | null = null
  private broken = false
  private nextId = 1
  private readonly pending = new Map<number, Pending>()

  detect = (events: WorkflowEvent[]): Promise<DetectedPattern[]> => {
    const worker = this.ensureWorker()
    if (!worker) return Promise.resolve(detectPatterns(events))
    const id = this.nextId++
    return new Promise((resolve) => {
      this.pending.set(id, { resolve, events })
      worker.postMessage({ id, events })
    })
  }

  stop(): void {
    void this.worker?.terminate()
    this.worker = null
  }

  private ensureWorker(): Worker | null {
    if (this.worker || this.broken) return this.worker
    try {
      const worker = createDetectionWorker({})
      worker.on('message', (message: { id: number; patterns?: DetectedPattern[]; error?: string }) => {
        const entry = this.pending.get(message.id)
        if (!entry) return
        this.pending.delete(message.id)
        entry.resolve(message.patterns ?? detectPatterns(entry.events))
      })
      worker.on('error', () => this.fail())
      worker.on('exit', () => this.fail())
      this.worker = worker
    } catch {
      this.broken = true
    }
    return this.worker
  }

  /** The worker is gone: finish what it was doing here, and stop using it. */
  private fail(): void {
    if (!this.worker) return
    this.worker = null
    this.broken = true
    for (const [id, entry] of this.pending) {
      this.pending.delete(id)
      entry.resolve(detectPatterns(entry.events))
    }
  }
}
