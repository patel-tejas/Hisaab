/**
 * Hands a spec from the Agent tab's chat to the builder page.
 *
 * sessionStorage, not the URL: a spec is a couple of KB of JSON and would
 * make an unreadable, unshareable link. Client-only.
 */

import type { StrategySpec } from "./schema";

const KEY = "hisaab.eve.spec.handoff.v1";

export function stashSpec(spec: StrategySpec): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(spec));
  } catch {
    // Blocked storage: the builder just opens with its starter spec.
  }
}

export function takeStashedSpec(): unknown | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    sessionStorage.removeItem(KEY);
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
