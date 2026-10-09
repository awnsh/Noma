import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { ActionLog } from './actionLog'

let folder: string
beforeEach(() => {
  folder = mkdtempSync(join(tmpdir(), 'noma-action-log-'))
})
afterEach(() => rmSync(folder, { recursive: true, force: true }))

function lines(file: string): string[] {
  return readFileSync(file, 'utf8').split('\n').filter(Boolean)
}

describe('ActionLog', () => {
  it('appends one JSON line per entry, creating the folder, in order', async () => {
    const file = join(folder, 'logs', 'actions.jsonl')
    const log = new ActionLog(() => file)
    void log.append({ n: 1 })
    void log.append({ n: 2 })
    await log.append({ n: 3 })
    expect(lines(file).map((line) => JSON.parse(line).n)).toEqual([1, 2, 3])
  })

  it('trims to the last keepLines only once the file passes the size threshold', async () => {
    const file = join(folder, 'actions.jsonl')
    const log = new ActionLog(() => file, 5, 200)
    for (let n = 1; n <= 4; n++) await log.append({ n })
    // Under 200 bytes: nothing trimmed yet.
    expect(lines(file)).toHaveLength(4)
    for (let n = 5; n <= 30; n++) void log.append({ n })
    await log.append({ n: 31 })
    const kept = lines(file).map((line) => JSON.parse(line).n)
    // Bounded, and the newest entry always survives the trim.
    expect(kept.length).toBeLessThanOrEqual(5 + 200 / 8)
    expect(kept[kept.length - 1]).toBe(31)
  })

  it('keeps an existing file and appends to it', async () => {
    const file = join(folder, 'actions.jsonl')
    writeFileSync(file, '{"n":0}\n')
    await new ActionLog(() => file).append({ n: 1 })
    expect(lines(file)).toEqual(['{"n":0}', '{"n":1}'])
  })

  it('never rejects, even when the file cannot be written', async () => {
    // A path *under* a regular file can't be created.
    const blocker = join(folder, 'not-a-folder')
    writeFileSync(blocker, '')
    const log = new ActionLog(() => join(blocker, 'actions.jsonl'))
    await expect(log.append({ n: 1 })).resolves.toBeUndefined()
    // And a failure doesn't wedge the queue for the next write.
    const good = new ActionLog(() => join(folder, 'ok.jsonl'))
    await expect(good.append({ n: 2 })).resolves.toBeUndefined()
  })
})
