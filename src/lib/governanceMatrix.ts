/**
 * VIN Governance — PRD-aligned state machine (VIN_Governance_PRD v1.2).
 * P, C, S → Band (ESCALATED | MONITOR | SUPPRESSED). Bands drive workflow and parts ordering.
 * Works with WASM risk engine: P from posterior, C from pillar coverage, S from evidence age.
 */

export type GovernanceBand = "ESCALATED" | "MONITOR" | "SUPPRESSED";

export interface PosteriorState {
  P: number; // posterior probability [0, 1] — from risk engine when available
  C: number; // confidence [0, 1] — pillar coverage × corroboration
  S: number; // staleness (days since most recent evidence)
}

/** PRD §5: Decision bands. ESCALATED = workflow trigger; MONITOR = track; SUPPRESSED = no action. */
export function getGovernanceBand({ P, C, S }: PosteriorState): GovernanceBand {
  // PRD §5 SUPPRESSED: C < 0.50 forces SUPPRESSED regardless of P
  if (C < 0.50) return "SUPPRESSED";
  // PRD §4.3 / §9.4: S > 60 forces SUPPRESSED unconditionally
  if (S > 60) return "SUPPRESSED";
  // P < 0.45 → SUPPRESSED
  if (P < 0.45) return "SUPPRESSED";

  // PRD §5 ESCALATED: P ≥ 0.85 AND C ≥ 0.70 AND S ≤ 14
  if (P >= 0.85 && C >= 0.70 && S <= 14) return "ESCALATED";

  // PRD §5 MONITOR: 0.60 ≤ P < 0.85 AND C ≥ 0.60
  if (P >= 0.60 && P < 0.85 && C >= 0.60) return "MONITOR";

  // Gap zone PRD §5 / §9.7: P ∈ [0.45, 0.60), C ∈ [0.50, 0.60) → SUPPRESSED by exhaustion
  return "SUPPRESSED";
}

/** Copy for UI: what this band means for risk → wear parts → order. */
export const BAND_ACTIONS: Record<GovernanceBand, { label: string; action: string; cta: string }> = {
  ESCALATED: {
    label: "Escalated",
    action: "Trigger workflow · Order wear parts",
    cta: "Order wear parts",
  },
  MONITOR: {
    label: "Monitor",
    action: "Track · Order parts when due",
    cta: "View parts",
  },
  SUPPRESSED: {
    label: "Suppressed",
    action: "No action",
    cta: "View parts",
  },
};

/** One-line reason for band (for "Why this band?" in UI). */
export function getBandReason(band: GovernanceBand, { P, C, S }: PosteriorState): string {
  if (band === "ESCALATED") return "P≥0.85, C≥0.70, S≤14 — evidence strong and fresh";
  if (band === "MONITOR") {
    if (P < 0.60) return "P below 0.60 — track until risk rises";
    if (C < 0.70) return "C below 0.70 — need more pillars before escalating";
    if (S > 14) return "S > 14 days — evidence stale, hold workflow";
    return "In monitor band — continue tracking";
  }
  if (C < 0.50) return "C < 0.50 — insufficient evidence (no single-pillar escalation)";
  if (S > 60) return "S > 60 days — evidence too old, suppress";
  if (P < 0.45) return "P < 0.45 — risk below threshold";
  return "Below escalation threshold";
}

/** Value prop for governance (header / summary). */
export const GOVERNANCE_VALUE_PROP =
  "Governance uses P, C, and S so we only escalate when evidence is strong and fresh — fewer false alarms, parts orders focused on real risk.";

/**
 * Derive [P, C, S] for demo. On Fleet, pass WASM risk posterior so P comes from risk engine.
 */
export function derivePosteriorFromVehicle(
  vehicle: {
    vin: string;
    lastServiceDate: string;
    nextServiceDue: string;
    fordHealthScore: number;
    tripVolume: string;
    odometer: number;
    fordAlerts: string[];
  },
  /** When from WASM risk engine, pass posterior (0–1). Otherwise priorityScore 0–100. */
  priorityOrPosterior: number,
  /** Number of pillars that contributed (n_present). 12V n_expected = 5. */
  factorCount: number,
  /** If true, priorityOrPosterior is already posterior [0,1]; else 0–100 score */
  isPosterior = false
): PosteriorState {
  const P = isPosterior
    ? Math.min(1, Math.max(0, priorityOrPosterior))
    : Math.min(1, Math.max(0, priorityOrPosterior / 100));
  const nExpected = 5; // 12V canonical
  const C = Math.min(1, (factorCount / nExpected) * 1.2);
  const lastService = new Date(vehicle.lastServiceDate);
  const now = new Date();
  const daysSinceService = Math.max(
    0,
    Math.ceil((now.getTime() - lastService.getTime()) / (1000 * 60 * 60 * 24))
  );
  const S = Math.min(61, daysSinceService);
  return { P, C, S };
}
