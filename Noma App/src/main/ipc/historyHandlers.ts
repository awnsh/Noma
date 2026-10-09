import { app, ipcMain } from 'electron'
import { join } from 'path'
import { IPC_CHANNELS } from '@shared/constants'
import type { ActionHistory } from '@shared/types'
import { DEFAULT_HISTORY_LIMIT, readActionHistory } from '../history/actionHistory'

/** Read-only run history from logs/actions.jsonl (written by main/index.ts's
 *  logActionResult). Nothing here writes to or trims the log. */
export function registerHistoryHandlers(): void {
  ipcMain.handle(IPC_CHANNELS.GET_ACTION_HISTORY, (_event, limit?: unknown): Promise<ActionHistory> => {
    const file = join(app.getPath('userData'), 'logs', 'actions.jsonl')
    return readActionHistory(file, typeof limit === 'number' ? limit : DEFAULT_HISTORY_LIMIT)
  })
}
