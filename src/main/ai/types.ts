import type { Suggestion } from '@shared/types'

/** A detected pattern handed from the workflow engine to an AIProvider. */
export interface WorkflowSignal {
  applicationId: string
  kind: 'shortcut' | 'sequence' | 'controlUsage'
  data: Record<string, unknown>
  count: number
}

/**
 * AIProvider abstraction (brainstorm.md section 13).
 *
 * The MVP ships LocalRuleBasedProvider and must function with zero API
 * keys. An LLM-backed provider can be added later entirely behind this
 * interface — nothing else in the app should know or care which
 * implementation is active, and no raw keystrokes/content ever cross this
 * boundary, only sanitized WorkflowSignal metadata.
 */
export interface AIProvider {
  readonly name: string
  generateSuggestions(signals: WorkflowSignal[]): Promise<Suggestion[]>
}
