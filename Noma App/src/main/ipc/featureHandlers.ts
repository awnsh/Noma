import { app, dialog, ipcMain, type BrowserWindow } from 'electron'
import { randomUUID } from 'crypto'
import { readFile, stat, writeFile } from 'fs/promises'
import { basename, join } from 'path'
import { IPC_CHANNELS } from '@shared/constants'
import type {
  ConfigExportResult,
  ConfigImportApplyResult,
  ConfigImportMode,
  ConfigImportPickResult
} from '@shared/types'
import { getDatabase } from '../database/db'
import type { ApplicationContextService } from '../applications/contextService'
import {
  MAX_CONFIG_FILE_BYTES,
  applyConfigImport,
  buildConfigExport,
  countConfig,
  parseConfigFile,
  previewConfigImport,
  type ConfigFile
} from '../backup/configBackup'

export interface FeatureHandlerDeps {
  /** The main window, to parent the save/open dialogs to. */
  getWindow: () => BrowserWindow | null
  /** Refreshed after an import so the focused app's zones update live. */
  contextService: ApplicationContextService
}

/** The file last picked for import, held here (not round-tripped through
 *  the renderer) so what gets applied is exactly what was validated and
 *  previewed. One at a time: picking again replaces it. */
let pendingImport: { token: string; config: ConfigFile } | null = null

function todayStamp(): string {
  const now = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

export function registerFeatureHandlers(deps: FeatureHandlerDeps): void {
  ipcMain.handle(IPC_CHANNELS.CONFIG_EXPORT, async (): Promise<ConfigExportResult> => {
    const options = {
      title: 'Export settings',
      defaultPath: join(app.getPath('documents'), `noma-settings-${todayStamp()}.json`),
      filters: [{ name: 'Noma settings', extensions: ['json'] }]
    }
    const window = deps.getWindow()
    const choice = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options)
    if (choice.canceled || !choice.filePath) return { status: 'cancelled' }

    try {
      const config = buildConfigExport(getDatabase(), app.getVersion())
      await writeFile(choice.filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
      return { status: 'saved', filePath: choice.filePath, counts: countConfig(config) }
    } catch (error) {
      return { status: 'failed', reason: errorMessage(error) }
    }
  })

  ipcMain.handle(IPC_CHANNELS.CONFIG_IMPORT_PICK, async (): Promise<ConfigImportPickResult> => {
    const options = {
      title: 'Import settings',
      properties: ['openFile' as const],
      filters: [{ name: 'Noma settings', extensions: ['json'] }]
    }
    const window = deps.getWindow()
    const choice = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options)
    const filePath = choice.filePaths[0]
    if (choice.canceled || !filePath) return { status: 'cancelled' }

    pendingImport = null
    let text: string
    try {
      if ((await stat(filePath)).size > MAX_CONFIG_FILE_BYTES) {
        return { status: 'invalid', reason: 'The file is too large to be a Noma settings file.' }
      }
      text = await readFile(filePath, 'utf8')
    } catch (error) {
      return { status: 'invalid', reason: `The file couldn't be read: ${errorMessage(error)}` }
    }

    const parsed = parseConfigFile(text)
    if (!parsed.ok) return { status: 'invalid', reason: parsed.reason }

    const db = getDatabase()
    const token = randomUUID()
    pendingImport = { token, config: parsed.config }
    return {
      status: 'ready',
      token,
      fileName: basename(filePath),
      exportedAt: parsed.config.exportedAt || null,
      counts: countConfig(parsed.config),
      previews: {
        merge: previewConfigImport(db, parsed.config, 'merge'),
        replace: previewConfigImport(db, parsed.config, 'replace')
      }
    }
  })

  ipcMain.handle(
    IPC_CHANNELS.CONFIG_IMPORT_APPLY,
    async (_event, token: unknown, mode: unknown): Promise<ConfigImportApplyResult> => {
      if (!pendingImport || typeof token !== 'string' || token !== pendingImport.token) {
        return { ok: false, reason: 'Choose the file again; this import is no longer pending.' }
      }
      if (mode !== 'merge' && mode !== 'replace') return { ok: false, reason: 'Unknown import mode.' }

      const { config } = pendingImport
      pendingImport = null
      try {
        applyConfigImport(getDatabase(), config, mode as ConfigImportMode)
      } catch (error) {
        return { ok: false, reason: `Nothing was changed: ${errorMessage(error)}` }
      }

      const currentApplicationId = deps.contextService.getContext().application?.id
      if (currentApplicationId) deps.contextService.refreshIfCurrentApplication(currentApplicationId)
      return { ok: true, counts: countConfig(config) }
    }
  )
}
