import { dirname } from 'path'
import { appendFile, mkdir, readFile, stat, writeFile } from 'fs/promises'

/**
 * The append-only writer behind main/index.ts's logActionResult (the local
 * actions.jsonl record of what each control press did).
 *
 * Asynchronous and append-only on the hot path: it used to read and
 * rewrite the whole file synchronously on every press, blocking the main
 * process (and with it Glide and the next press) for the length of a disk
 * round-trip. Now each press is one async append; the trim back to the last
 * `keepLines` only runs once the file has grown past `trimBytes`, so it
 * happens every few hundred presses, not every one. Writes are chained so a
 * trim never races an append and loses it. Never throws and never rejects:
 * this is diagnostics, and logging must never break a press.
 */
export class ActionLog {
  private queue: Promise<void> = Promise.resolve()

  constructor(
    private readonly file: () => string,
    private readonly keepLines = 500,
    /** ~1000 typical lines: trimming back to 500 leaves ~500 presses of slack. */
    private readonly trimBytes = 256 * 1024
  ) {}

  /** Queues one JSON line. Returns the write's promise (always resolves),
   *  which callers on the hot path simply ignore. */
  append(entry: Record<string, unknown>): Promise<void> {
    const line = JSON.stringify(entry)
    this.queue = this.queue.then(async () => {
      try {
        const file = this.file()
        await mkdir(dirname(file), { recursive: true })
        await appendFile(file, `${line}\n`)
        if ((await stat(file)).size > this.trimBytes) {
          const kept = (await readFile(file, 'utf8')).split(/\r?\n/).filter(Boolean).slice(-this.keepLines)
          await writeFile(file, [...kept, ''].join('\n'))
        }
      } catch {
        // Diagnostics only: never let logging break a press.
      }
    })
    return this.queue
  }
}
