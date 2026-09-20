import { execFile } from 'child_process'
import { platform } from 'os'
import type { LaptopInfo } from '@shared/types'

let cached: Promise<LaptopInfo> | null = null

function run(command: string, args: string[]): Promise<string> {
  return new Promise((resolve) => {
    execFile(command, args, { timeout: 6000, windowsHide: true }, (error, stdout) => {
      resolve(error ? '' : stdout.trim())
    })
  })
}

/**
 * Identifies the computer's maker/model so Holo can pick how many zones the
 * hardware can realistically tell apart (see recommendHoloZoneCount). Any
 * failure degrades to "unknown", which the recommender treats
 * conservatively — never a reason for Holo to stop working. Read once and
 * cached; nothing here leaves the machine.
 */
export function getLaptopInfo(): Promise<LaptopInfo> {
  cached ??= detect()
  return cached
}

async function detect(): Promise<LaptopInfo> {
  const os = platform()
  if (os === 'win32') {
    const out = await run('powershell.exe', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      '$c = Get-CimInstance Win32_ComputerSystem; "$($c.Manufacturer)|$($c.Model)"'
    ])
    const [manufacturer = '', model = ''] = out.split('|')
    return { platform: os, manufacturer: manufacturer.trim(), model: model.trim() }
  }
  if (os === 'darwin') {
    const model = await run('sysctl', ['-n', 'hw.model'])
    return { platform: os, manufacturer: 'Apple', model }
  }
  const [manufacturer, model] = await Promise.all([
    run('cat', ['/sys/devices/virtual/dmi/id/sys_vendor']),
    run('cat', ['/sys/devices/virtual/dmi/id/product_name'])
  ])
  return { platform: os, manufacturer, model }
}
