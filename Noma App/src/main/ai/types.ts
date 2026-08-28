import type { DetectedPattern, Suggestion } from '@shared/types'

/**
 * AIProvider abstraction (brainstorm.md section 13).
 *
 * The MVP ships LocalRuleBasedProvider and must function with zero API
 * keys. An LLM-backed provider can be added later entirely behind this
 * interface — nothing else in the app should know or care which
 * implementation is active, and no raw keystrokes/content ever cross this
 * boundary, only already-sanitized DetectedPattern metadata (counts and
 * combo/sequence/control identifiers — see docs/privacy-and-legal.md).
 */
export interface AIProvider {
  readonly name: string
  generateSuggestions(patterns: DetectedPattern[]): Promise<Suggestion[]>
}
