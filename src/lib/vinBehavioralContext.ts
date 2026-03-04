/**
 * VIN Behavioral Context Layer (P0)
 * Normalized signals for vehicle usage patterns. Enables downstream systems to
 * sort leads, contextualize alerts, prioritize dealer engagement.
 * Not predictive — describes behavior and operating context only.
 */

// --- P0 Signal Types (spec-aligned) ---

export type VASActivityState = "ACTIVE" | "LOW_USE" | "DORMANT" | "REACTIVATED";
export interface VAS_v1 {
  vin: string;
  activity_state: VASActivityState;
  activity_index: number; // 0–100
  days_since_last_trip: number;
  trips_last_14d: number;
  trips_last_30d: number;
  confidence: number;
  version: "vas_v1";
}

export type ESCExposureState = "LOW" | "MODERATE" | "HIGH";
export interface ESC_v1 {
  vin: string;
  exposure_state: ESCExposureState;
  environmental_stress_index: number; // 0–100
  exposure: { cold_days: number; heat_days: number; high_variance_days: number };
  derived_flags: { cold_exposed: boolean; heat_exposed: boolean; temp_volatile: boolean };
  confidence: number;
  version: "esc_v1";
}

export type TSIStressBand = "LOW" | "MODERATE" | "HIGH";
export type TSIPrimaryDriver = "SHORT_TRIPS" | "HIGH_CYCLES" | "COLD_STARTS" | "MIXED";
export interface TSI_v1 {
  vin: string;
  trip_stress_index: number; // 0–100
  stress_band: TSIStressBand;
  primary_driver: TSIPrimaryDriver;
  cohort: string;
  confidence: number;
  version: "tsi_v1";
}

export type OSCStability = "STABLE" | "DEGRADED" | "INCONCLUSIVE";
export interface OSC_v1 {
  vin: string;
  ota_stability: OSCStability;
  deviation_index: number; // 0–100
  deltas: {
    trip_freq_change: number;
    trip_duration_change: number;
    silence_days_change: number;
  };
  confidence: number;
  version: "osc_v1";
}

/** VIN Behavioral Fingerprint — sortable vector */
export interface VinBehavioralFingerprint {
  vin: string;
  vas: VAS_v1;
  esc: ESC_v1;
  tsi: TSI_v1;
  osc: OSC_v1;
  /** Composite lead prioritization (spec §7): 0.30·activity + 0.35·trip_stress + 0.20·env_stress + 0.15·ota_deviation */
  priority_index: number;
}

// --- Sort keys for UI ---
export type BehavioralSortKey =
  | "priority_index"
  | "activity_index"
  | "environmental_stress_index"
  | "trip_stress_index"
  | "ota_deviation_index";

/** Deterministic mock behavioral context per VIN (demo). In production, replace with API. */
const behavioralByVin: Record<string, Omit<VinBehavioralFingerprint, "vin">> = {};

function seedBehavioral(vin: string, fleetId: string, tripVolume: string): Omit<VinBehavioralFingerprint, "vin"> {
  const hash = (s: string) => s.split("").reduce((a, c) => ((a << 5) - a + c.charCodeAt(0)) | 0, 0);
  const h = Math.abs(hash(vin));
  const h2 = Math.abs(hash(fleetId));

  const activity_index = 20 + (h % 75);
  const trips_last_14d = tripVolume === "high" ? 8 + (h % 6) : tripVolume === "normal" ? 3 + (h % 5) : (h % 3);
  const trips_last_30d = trips_last_14d * 2 + (h2 % 5);
  const days_since_last_trip = tripVolume === "low" ? 3 + (h % 5) : (h % 3);
  const activity_state: VASActivityState =
    trips_last_14d >= 5 ? "ACTIVE" : trips_last_30d >= 3 ? "LOW_USE" : days_since_last_trip <= 2 ? "REACTIVATED" : "DORMANT";

  const environmental_stress_index = 15 + (h2 % 70);
  const exposure_state: ESCExposureState =
    environmental_stress_index >= 60 ? "HIGH" : environmental_stress_index >= 35 ? "MODERATE" : "LOW";

  const trip_stress_index = 25 + (h % 55);
  const stress_band: TSIStressBand = trip_stress_index >= 65 ? "HIGH" : trip_stress_index >= 40 ? "MODERATE" : "LOW";
  const primary_driver: TSIPrimaryDriver = (["SHORT_TRIPS", "HIGH_CYCLES", "COLD_STARTS", "MIXED"] as const)[h % 4];

  const deviation_index = (h + h2) % 85;
  const ota_stability: OSCStability = deviation_index >= 60 ? "DEGRADED" : deviation_index >= 25 ? "INCONCLUSIVE" : "STABLE";

  const vas: VAS_v1 = {
    vin,
    activity_state,
    activity_index,
    days_since_last_trip,
    trips_last_14d,
    trips_last_30d,
    confidence: 0.95,
    version: "vas_v1",
  };
  const esc: ESC_v1 = {
    vin,
    exposure_state,
    environmental_stress_index,
    exposure: {
      cold_days: (h % 15),
      heat_days: (h2 % 20),
      high_variance_days: (h % 10),
    },
    derived_flags: {
      cold_exposed: environmental_stress_index > 50,
      heat_exposed: (h2 % 2) === 0,
      temp_volatile: (h % 3) === 0,
    },
    confidence: 0.95,
    version: "esc_v1",
  };
  const tsi: TSI_v1 = {
    vin,
    trip_stress_index,
    stress_band,
    primary_driver,
    cohort: "fleet",
    confidence: 0.92,
    version: "tsi_v1",
  };
  const osc: OSC_v1 = {
    vin,
    ota_stability,
    deviation_index,
    deltas: {
      trip_freq_change: (h % 20) - 5,
      trip_duration_change: (h2 % 15) - 5,
      silence_days_change: (h % 7) - 2,
    },
    confidence: 0.88,
    version: "osc_v1",
  };

  const priority_index =
    activity_index * 0.3 +
    trip_stress_index * 0.35 +
    environmental_stress_index * 0.2 +
    deviation_index * 0.15;

  return { vas, esc, tsi, osc, priority_index };
}

/** Get full behavioral fingerprint for a VIN. Uses fleet data when available for deterministic demo. */
export function getBehavioralContext(
  vin: string,
  fleetSource?: { fleetId: string; tripVolume: string }
): VinBehavioralFingerprint {
  const key = vin;
  if (!behavioralByVin[key]) {
    const { fleetId = `VIN-${vin.slice(-4)}`, tripVolume = "normal" } = fleetSource || {};
    behavioralByVin[key] = seedBehavioral(vin, fleetId, tripVolume);
  }
  return { vin, ...behavioralByVin[key] };
}

/** Get priority index only (for sorting). */
export function getPriorityIndex(vin: string, fleetSource?: { fleetId: string; tripVolume: string }): number {
  return getBehavioralContext(vin, fleetSource).priority_index;
}

/** Sort key to numeric value for a VIN (for table sort). */
export function getSortValue(
  vin: string,
  key: BehavioralSortKey,
  fleetSource?: { fleetId: string; tripVolume: string }
): number {
  const b = getBehavioralContext(vin, fleetSource);
  switch (key) {
    case "priority_index":
      return b.priority_index;
    case "activity_index":
      return b.vas.activity_index;
    case "environmental_stress_index":
      return b.esc.environmental_stress_index;
    case "trip_stress_index":
      return b.tsi.trip_stress_index;
    case "ota_deviation_index":
      return b.osc.deviation_index;
    default:
      return b.priority_index;
  }
}

export const BEHAVIORAL_SORT_OPTIONS: { value: BehavioralSortKey; label: string }[] = [
  { value: "priority_index", label: "Priority (composite)" },
  { value: "activity_index", label: "Activity (VAS)" },
  { value: "environmental_stress_index", label: "Env stress (ESC)" },
  { value: "trip_stress_index", label: "Trip stress (TSI)" },
  { value: "ota_deviation_index", label: "OTA deviation (OSC)" },
];
