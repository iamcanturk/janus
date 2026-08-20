/**
 * Check registry.
 *
 * Holds the loaded check definitions and validates each on registration.
 * Provides lookups the runner and profiles (Phase 2) build on.
 */

import type { CheckDefinition, Phase, Mode } from './types/check.js';
import type { EntityType } from './types/entity.js';
import { assertValidCheck } from './validate.js';

export class CheckRegistry {
  private readonly checks = new Map<string, CheckDefinition>();

  /** Register a check. Throws on an invalid definition or a duplicate id. */
  register(def: CheckDefinition): void {
    assertValidCheck(def);
    if (this.checks.has(def.id)) {
      throw new Error(`Duplicate check id: "${def.id}"`);
    }
    this.checks.set(def.id, def);
  }

  /** Register many checks at once. */
  registerAll(defs: Iterable<CheckDefinition>): void {
    for (const def of defs) this.register(def);
  }

  get(id: string): CheckDefinition | undefined {
    return this.checks.get(id);
  }

  has(id: string): boolean {
    return this.checks.has(id);
  }

  all(): CheckDefinition[] {
    return [...this.checks.values()];
  }

  byPhase(phase: Phase): CheckDefinition[] {
    return this.all().filter((c) => c.phase === phase);
  }

  byMode(mode: Mode): CheckDefinition[] {
    return this.all().filter((c) => c.mode === mode);
  }

  /** Checks that accept the given target entity type. */
  accepting(type: EntityType): CheckDefinition[] {
    return this.all().filter((c) => c.inputs.includes(type));
  }

  get size(): number {
    return this.checks.size;
  }
}
