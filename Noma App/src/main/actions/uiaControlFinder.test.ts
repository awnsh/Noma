import { EventEmitter } from 'events'
import { PassThrough } from 'stream'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { spawn } from 'child_process'
import { findNamedControls } from './macos'

// The PowerShell helper is replaced by a fake child process whose stdin
// records the requests and whose stdout the test writes answers to, so these
// cases cover the request bookkeeping (answers, timeouts, Stop) without
// Windows. `platform` is a mutable object so one case can take the macOS path.
const platform = vi.hoisted(() => ({ isMac: false, isWindows: true }))
vi.mock('../platform', () => platform)
vi.mock('child_process', () => ({ spawn: vi.fn() }))
vi.mock('./macos', () => ({ findNamedControls: vi.fn() }))

interface FakeChild extends EventEmitter {
  stdin: PassThrough
  stdout: PassThrough
  kill: ReturnType<typeof vi.fn>
  requests: string[]
}

function fakeChild(): FakeChild {
  const child = new EventEmitter() as FakeChild
  child.stdin = new PassThrough()
  child.stdout = new PassThrough()
  child.requests = []
  child.stdin.on('data', (chunk: Buffer) => child.requests.push(...chunk.toString().trim().split('\n')))
  child.kill = vi.fn(() => child.emit('exit'))
  return child
}

/** Answers request `id` the way the helper script does. */
function answer(child: FakeChild, id: string, found: number, x: number | null = null, y: number | null = null): void {
  child.stdout.write(JSON.stringify({ id, found, x, y }) + '\n')
}

let children: FakeChild[]
let uiaControlFinder: typeof import('./uiaControlFinder').uiaControlFinder

beforeEach(async () => {
  vi.resetModules()
  platform.isMac = false
  children = []
  vi.mocked(spawn).mockReset()
  vi.mocked(spawn).mockImplementation(() => {
    const child = fakeChild()
    children.push(child)
    return child as unknown as ReturnType<typeof spawn>
  })
  ;({ uiaControlFinder } = await import('./uiaControlFinder'))
})

afterEach(() => {
  uiaControlFinder.dispose()
  vi.useRealTimers()
})

/** Lets the stream and readline events run. */
const flush = (): Promise<void> => new Promise((resolve) => setImmediate(resolve))

describe('uiaControlFinder.find', () => {
  it("reports the helper's answer", async () => {
    const pending = uiaControlFinder.find(42, 'Blade', () => false)
    await flush()
    const [id] = children[0].requests[0].split(' ')
    answer(children[0], id, 1, 812, 44)
    expect(await pending).toEqual({ status: 'found', x: 812, y: 44 })
  })

  it('answers cancelled at once, sending nothing, when Stop was already pressed', async () => {
    expect(await uiaControlFinder.find(42, 'Blade', () => true)).toEqual({ status: 'cancelled' })
    expect(spawn).not.toHaveBeenCalled()
  })

  it('answers cancelled within ~50 ms of Stop and stops the busy helper', async () => {
    vi.useFakeTimers()
    let stopped = false
    let settled = false
    const pending = uiaControlFinder.find(42, 'Blade', () => stopped).then((result) => {
      settled = true
      return result
    })
    await vi.advanceTimersByTimeAsync(500) // the helper is still searching
    expect(settled).toBe(false)
    stopped = true
    await vi.advanceTimersByTimeAsync(50)
    expect(settled).toBe(true)
    expect(await pending).toEqual({ status: 'cancelled' })
    expect(children[0].kill).toHaveBeenCalledTimes(1)
  })

  it('ignores a late answer to the abandoned search, and the next search gets a fresh helper', async () => {
    let stopped = false
    const first = uiaControlFinder.find(42, 'Blade', () => stopped)
    await flush()
    const [abandonedId] = children[0].requests[0].split(' ')
    stopped = true
    expect(await first).toEqual({ status: 'cancelled' })
    answer(children[0], abandonedId, 1, 1, 1) // arrives after the fact: dropped

    const second = uiaControlFinder.find(42, 'Blade', () => false)
    await flush()
    expect(children).toHaveLength(2)
    const [id] = children[1].requests[0].split(' ')
    answer(children[1], id, 0)
    expect(await second).toEqual({ status: 'none' })
  })

  it('stops polling for Stop once the helper has answered', async () => {
    const isCancelled = vi.fn(() => false)
    const pending = uiaControlFinder.find(42, 'Blade', isCancelled)
    await flush()
    const [id] = children[0].requests[0].split(' ')
    answer(children[0], id, 0)
    await pending
    const calls = isCancelled.mock.calls.length
    await new Promise((resolve) => setTimeout(resolve, 120))
    expect(isCancelled.mock.calls.length).toBe(calls)
  })

  it('on macOS, answers cancelled without waiting for the accessibility walk', async () => {
    platform.isMac = true
    vi.mocked(findNamedControls).mockReturnValue(new Promise(() => {})) // a walk that never ends
    vi.useFakeTimers()
    let stopped = false
    const pending = uiaControlFinder.find(42, 'Blade', () => stopped)
    await vi.advanceTimersByTimeAsync(200)
    stopped = true
    await vi.advanceTimersByTimeAsync(50)
    expect(await pending).toEqual({ status: 'cancelled' })
  })

  it('on macOS, still reports the walk when nobody stops it', async () => {
    platform.isMac = true
    vi.mocked(findNamedControls).mockResolvedValue({ status: 'several', count: 2 })
    expect(await uiaControlFinder.find(42, 'Blade', () => false)).toEqual({ status: 'several', count: 2 })
  })
})
