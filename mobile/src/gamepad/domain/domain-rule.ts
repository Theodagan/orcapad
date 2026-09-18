/**
 * Invariants the type system cannot hold. Adapter mapping tests assert that a mapped
 * entity produces no violations, so a host payload quirk fails there rather than in a screen.
 */
export type DomainRuleViolation = {
  readonly rule: string
  readonly detail: string
}
