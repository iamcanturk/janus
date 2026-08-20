/**
 * Profiles (presets).
 *
 * A profile is what the user picks alongside a target. It decides which phases
 * run and — critically — whether active checks are allowed. `allowActive` is the
 * single switch the runner's safety gate reads; a passive profile leaves it
 * `false` so no packet is ever sent to the target.
 */

import type { Phase } from './types/check.js';

export interface Profile {
  /** Stable id used in URLs and job records. */
  readonly id: string;
  /** Turkish title shown in the UI. */
  readonly title: string;
  /** Turkish description shown in the UI. */
  readonly description: string;
  /** Phases included in this profile. */
  readonly phases: readonly Phase[];
  /**
   * Whether active checks may run. `false` = never sends a packet to the target.
   * Enabling this is an explicit, opt-in choice behind a confirmation in the UI.
   */
  readonly allowActive: boolean;
  /** If set, only these check ids are eligible (still subject to phase/mode). */
  readonly includeChecks?: readonly string[];
  /** Check ids explicitly excluded from this profile. */
  readonly excludeChecks?: readonly string[];
  /** Whether this profile is meant to run periodically (monitoring). */
  readonly periodic?: boolean;
}

const ALL_PASSIVE_PHASES: readonly Phase[] = ['scope', 'recon', 'intel', 'evidence'];

/** Built-in profiles shipped with Janus. */
export const BUILTIN_PROFILES: readonly Profile[] = [
  {
    id: 'pasif-recon',
    title: 'Pasif Keşif',
    description: 'Yalnızca pasif fazlar. Hedefe tek paket bile gönderilmez.',
    phases: ALL_PASSIVE_PHASES,
    allowActive: false,
  },
  {
    id: 'bug-bounty-surface',
    title: 'Bug Bounty Yüzeyi',
    description:
      'Pasif keşif + aktif enumeration/surface. İzinli olduğun varsayılır — canlı paket gönderir.',
    phases: ['scope', 'recon', 'enumeration', 'surface', 'exposure', 'intel', 'evidence'],
    allowActive: true,
  },
  {
    id: 'kendi-varligim-monitor',
    title: 'Kendi Varlığım (İzleme)',
    description: 'Periyodik koşan, değişiklik (diff) çıkaran pasif izleme profili.',
    phases: ALL_PASSIVE_PHASES,
    allowActive: false,
    periodic: true,
  },
];

const BY_ID = new Map(BUILTIN_PROFILES.map((p) => [p.id, p]));

/** Look up a built-in profile by id. */
export function getProfile(id: string): Profile | undefined {
  return BY_ID.get(id);
}

/** Resolve a profile from an id or a full object; throws on unknown id. */
export function resolveProfile(profile: string | Profile): Profile {
  if (typeof profile !== 'string') return profile;
  const found = BY_ID.get(profile);
  if (!found) throw new Error(`Unknown profile: "${profile}"`);
  return found;
}
