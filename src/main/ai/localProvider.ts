import type { Suggestion } from '@shared/types'
import type { AIProvider, WorkflowSignal } from './types'

/**
 * LocalRuleBasedProvider — Phase 5 stub.
 *
 * The MVP suggestion engine is deterministic/statistical, not an LLM
 * (brainstorm.md sections 11-13). This satisfies the AIProvider contract
 * now so the rest of the app depends on the interface from day one; the
 * actual pattern-to-suggestion rules land in Phase 5.
 */
export class LocalRuleBasedProvider implements AIProvider {
  readonly name = 'local-rule-based'

  async generateSuggestions(_signals: WorkflowSignal[]): Promise<Suggestion[]> {
    return []
  }
}
