/**
 * Runtime validation for check definitions.
 *
 * The type system already forbids an active check without a `risk`, but checks
 * can be loaded dynamically (plugin files), so we re-check the invariants at
 * registration time and fail loudly.
 */

import type { CheckDefinition } from './types/check.js';
import { PHASES, RISKS } from './types/check.js';

export interface ValidationIssue {
  readonly field: string;
  readonly message: string;
}

/** Returns a list of problems; empty means the definition is valid. */
export function validateCheck(def: CheckDefinition): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!def.id || !def.id.includes('.')) {
    issues.push({ field: 'id', message: 'id must be a non-empty dot-namespaced string' });
  }
  if (!PHASES.includes(def.phase)) {
    issues.push({ field: 'phase', message: `phase must be one of: ${PHASES.join(', ')}` });
  }
  if (def.mode !== 'passive' && def.mode !== 'active') {
    issues.push({ field: 'mode', message: "mode must be 'passive' or 'active'" });
  }
  if (!Array.isArray(def.inputs) || def.inputs.length === 0) {
    issues.push({ field: 'inputs', message: 'inputs must list at least one entity type' });
  }
  if (!Array.isArray(def.produces)) {
    issues.push({ field: 'produces', message: 'produces must be an array' });
  }
  if (typeof def.run !== 'function') {
    issues.push({ field: 'run', message: 'run must be a function' });
  }

  if (def.mode === 'active') {
    if (!def.risk) {
      issues.push({ field: 'risk', message: 'active checks must declare a risk' });
    } else if (!RISKS.includes(def.risk)) {
      issues.push({ field: 'risk', message: `risk must be one of: ${RISKS.join(', ')}` });
    }
  }

  return issues;
}

/** Throws if the definition is invalid; used by the registry. */
export function assertValidCheck(def: CheckDefinition): void {
  const issues = validateCheck(def);
  if (issues.length > 0) {
    const detail = issues.map((i) => `${i.field}: ${i.message}`).join('; ');
    throw new Error(`Invalid check "${def.id}": ${detail}`);
  }
}
