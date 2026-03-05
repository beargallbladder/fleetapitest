/**
 * Patent-aligned governance demo: [P, C, S] → governance action.
 * From "Probabilistic Vehicle Health Governance Architecture" §4.4.3:
 * identical P can produce different actions based on confidence (C) and staleness (S).
 * This is a minimal in-app example of the threshold matrix concept.
 */

export type GovernanceAction =
  | "Suppress"
  | "Hold — request signal"
  | "Hold — stale"
  | "Sustain"
  | "Sustain + escalate"
  | "Monitor";

export interface PosteriorState {
  P: number; // posterior probability 0–1
  C: number; // confidence 0–1 (pillar coverage / corroboration)
  S: number; // staleness (days since most recent evidence)
}

/** Simplified threshold matrix (patent §4.4.3). Returns governance action from [P, C, S]. */
export function getGovernanceAction({ P, C, S }: PosteriorState): GovernanceAction {
  // Stale: evidence too old regardless of P/C
  if (S >= 30) return "Hold — stale";

  // High P, high C, fresh → Suppress
  if (P >= 0.85 && C >= 0.7 && S < 14) return "Suppress";

  // High P but low C → Hold (need more pillars)
  if (P >= 0.85 && C < 0.7) return "Hold — request signal";

  // Low P, low C → Escalate
  if (P < 0.4 && C < 0.5) return "Sustain + escalate";

  // Low P with decent C → Sustain
  if (P < 0.4) return "Sustain";

  // Mid-band → Monitor
  if (P >= 0.4 && P < 0.85) return "Monitor";

  return "Monitor";
}

/** Derive a toy [P, C, S] from existing fleet/priority data for demo. */
export function derivePosteriorFromVehicle(vehicle: {
  vin: string;
  lastServiceDate: string;
  nextServiceDue: string;
  fordHealthScore: number;
  tripVolume: string;
  odometer: number;
  fordAlerts: string[];
}, priorityScore: number, factorCount: number): PosteriorState {
  const P = Math.min(1, Math.max(0, priorityScore / 100));
  const nExpected = 6;
  const C = Math.min(1, (factorCount / nExpected) * 1.2);
  const lastService = new Date(vehicle.lastServiceDate);
  const now = new Date();
  const daysSinceService = Math.max(0, Math.ceil((now.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24)));
  const S = Math.min(60, daysSinceService);
  return { P, C, S };
}

export const GOVERNANCE_ACTION_LABELS: Record<GovernanceAction, string> = {
  "Suppress": "Suppress alert",
  "Hold — request signal": "Hold — request additional signal",
  "Hold — stale": "Hold — flag as stale",
  "Sustain": "Sustain alert",
  "Sustain + escalate": "Sustain + escalate to dealer",
  "Monitor": "Monitor — no action",
};
