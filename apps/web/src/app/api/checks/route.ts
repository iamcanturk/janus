/** Module catalog: every check's metadata + the built-in profiles. */

import { BUILTIN_PROFILES, selectChecks } from '@janus/core';
import { createRegistry } from '@janus/checks';
import type { CatalogResponse, CheckMeta, ProfileMeta } from '@/lib/types';

export const runtime = 'nodejs';

const registry = createRegistry();

export function GET(): Response {
  const checks: CheckMeta[] = registry.all().map((c) => ({
    id: c.id,
    phase: c.phase,
    mode: c.mode,
    risk: c.risk,
    needsKey: c.needsKey,
    inputs: c.inputs,
    title: c.title ?? c.id,
    description: c.description ?? '',
  }));

  const profiles: ProfileMeta[] = BUILTIN_PROFILES.map((p) => ({
    id: p.id,
    title: p.title,
    description: p.description,
    allowActive: p.allowActive,
    checkIds: selectChecks(registry, p).map((c) => c.id),
  }));

  const body: CatalogResponse = { checks, profiles };
  return Response.json(body);
}
