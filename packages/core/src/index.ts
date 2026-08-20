/**
 * @janus/core — the stable core: check contract, entity graph and runner.
 *
 * This is the one interface later phases must not break. Modules grow by adding
 * files under `@janus/checks`, not by editing anything here.
 */

export const CORE_PACKAGE = '@janus/core';

// Contract types
export type {
  Phase,
  Mode,
  Risk,
  CheckRunStatus,
  Target,
  Logger,
  CheckContext,
  CheckConfig,
  CheckResult,
  CheckRun,
  CheckDefinition,
  PassiveCheck,
  ActiveCheck,
} from './types/check.js';
export { PHASES, RISKS, defineCheck } from './types/check.js';

// Entity graph types
export type {
  EntityType,
  KnownEntityType,
  RelationType,
  KnownRelation,
  EntityRef,
  EntityInput,
  EdgeInput,
  Entity,
  Edge,
} from './types/entity.js';
export { KNOWN_ENTITY_TYPES, KNOWN_RELATIONS } from './types/entity.js';

// Findings
export type { Severity, Observation, Finding, FindingReference } from './types/finding.js';
export { SEVERITIES } from './types/finding.js';

// Graph
export { EntityGraph, entityId, edgeId, normalizeValue } from './graph.js';
export type { Clock } from './graph.js';

// Validation
export { validateCheck, assertValidCheck } from './validate.js';
export type { ValidationIssue } from './validate.js';

// Runner
export { runCheck } from './runner.js';
export type { CheckRunReport, NormalizedResult, RunOptions } from './runner.js';

// Registry
export { CheckRegistry } from './registry.js';

// Logger
export { nullLogger, createConsoleLogger } from './logger.js';
