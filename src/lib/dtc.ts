// DTC (Diagnostic Trouble Codes) Outlier Analysis
// Per year/make/model cohort, identify DTCs that are statistical outliers

export interface DTCCategory {
  id: string;
  name: string;
  prefix: string; // P0xxx, P1xxx, B0xxx, C0xxx, U0xxx
}

export const DTC_CATEGORIES: DTCCategory[] = [
  { id: "powertrain", name: "Powertrain", prefix: "P0" },
  { id: "powertrain_mfr", name: "Powertrain (Mfr)", prefix: "P1" },
  { id: "body", name: "Body", prefix: "B0" },
  { id: "chassis", name: "Chassis", prefix: "C0" },
  { id: "network", name: "Network", prefix: "U0" },
];

export interface DTCOutlier {
  code: string;
  description: string;
  category: string;
  frequency: number; // occurrences in cohort
  cohortAvg: number; // average for this year/make/model
  zScore: number; // how many std devs from mean (>2 = outlier)
  severity: "critical" | "high" | "medium" | "low";
  relatedParts: string[]; // SKUs that often resolve this
}

export interface CohortDTCProfile {
  year: number;
  make: string;
  model: string;
  cohortSize: number;
  outlierCount: number;
  dtcsByCategory: Record<string, number[]>; // category -> last 12 weeks counts
  topOutliers: DTCOutlier[];
}

// Mock DTC outlier data per cohort
// In production, this comes from your PM's analysis
export const cohortDTCProfiles: CohortDTCProfile[] = [
  {
    year: 2021,
    make: "Ford",
    model: "F-150",
    cohortSize: 14500,
    outlierCount: 3,
    dtcsByCategory: {
      powertrain: [12, 15, 18, 22, 19, 24, 28, 31, 27, 25, 29, 32],
      body: [3, 2, 4, 3, 5, 4, 3, 2, 4, 3, 2, 3],
      chassis: [8, 7, 9, 11, 10, 12, 14, 13, 11, 10, 12, 11],
      network: [2, 1, 2, 3, 2, 2, 1, 2, 3, 2, 1, 2],
    },
    topOutliers: [
      { code: "P0420", description: "Catalyst System Efficiency Below Threshold", category: "powertrain", frequency: 847, cohortAvg: 320, zScore: 2.8, severity: "high", relatedParts: ["DY-1200"] },
      { code: "P0300", description: "Random/Multiple Cylinder Misfire Detected", category: "powertrain", frequency: 612, cohortAvg: 280, zScore: 2.4, severity: "critical", relatedParts: ["SP-589", "DG-511"] },
      { code: "P0442", description: "EVAP System Leak Detected (Small)", category: "powertrain", frequency: 445, cohortAvg: 210, zScore: 2.1, severity: "medium", relatedParts: [] },
    ],
  },
  {
    year: 2022,
    make: "Ford",
    model: "F-150",
    cohortSize: 18200,
    outlierCount: 2,
    dtcsByCategory: {
      powertrain: [8, 10, 12, 11, 14, 16, 18, 17, 15, 14, 16, 18],
      body: [2, 3, 2, 4, 3, 2, 3, 4, 3, 2, 3, 2],
      chassis: [5, 6, 7, 8, 7, 9, 8, 7, 6, 7, 8, 7],
      network: [1, 1, 2, 1, 2, 1, 2, 1, 1, 2, 1, 2],
    },
    topOutliers: [
      { code: "P0456", description: "EVAP System Leak Detected (Very Small)", category: "powertrain", frequency: 523, cohortAvg: 245, zScore: 2.2, severity: "low", relatedParts: [] },
      { code: "B1342", description: "ECU Malfunction", category: "body", frequency: 189, cohortAvg: 78, zScore: 2.5, severity: "high", relatedParts: [] },
    ],
  },
  {
    year: 2020,
    make: "Ford",
    model: "F-150",
    cohortSize: 12800,
    outlierCount: 4,
    dtcsByCategory: {
      powertrain: [18, 22, 25, 28, 32, 35, 38, 42, 39, 36, 40, 44],
      body: [4, 5, 4, 6, 5, 7, 6, 5, 6, 5, 6, 5],
      chassis: [12, 14, 15, 18, 17, 19, 22, 21, 18, 17, 19, 20],
      network: [3, 2, 4, 3, 5, 4, 3, 4, 3, 4, 3, 4],
    },
    topOutliers: [
      { code: "P0171", description: "System Too Lean (Bank 1)", category: "powertrain", frequency: 892, cohortAvg: 340, zScore: 3.1, severity: "critical", relatedParts: ["FA-1900", "FL-500S"] },
      { code: "P0174", description: "System Too Lean (Bank 2)", category: "powertrain", frequency: 756, cohortAvg: 310, zScore: 2.7, severity: "high", relatedParts: ["FA-1900"] },
      { code: "C0035", description: "Left Front Wheel Speed Sensor", category: "chassis", frequency: 445, cohortAvg: 180, zScore: 2.4, severity: "high", relatedParts: [] },
      { code: "P0430", description: "Catalyst System Efficiency Below Threshold (Bank 2)", category: "powertrain", frequency: 398, cohortAvg: 175, zScore: 2.2, severity: "medium", relatedParts: ["DY-1200"] },
    ],
  },
  {
    year: 2021,
    make: "Ford",
    model: "Transit",
    cohortSize: 8900,
    outlierCount: 5,
    dtcsByCategory: {
      powertrain: [25, 28, 32, 38, 42, 48, 52, 55, 51, 48, 52, 58],
      body: [8, 9, 10, 12, 11, 14, 13, 15, 14, 12, 14, 16],
      chassis: [15, 18, 20, 24, 22, 26, 28, 30, 27, 25, 28, 30],
      network: [5, 6, 7, 8, 9, 10, 11, 10, 9, 10, 11, 12],
    },
    topOutliers: [
      { code: "P0087", description: "Fuel Rail Pressure Too Low", category: "powertrain", frequency: 678, cohortAvg: 210, zScore: 3.4, severity: "critical", relatedParts: [] },
      { code: "P2002", description: "DPF Efficiency Below Threshold", category: "powertrain", frequency: 589, cohortAvg: 195, zScore: 3.0, severity: "critical", relatedParts: ["FA-1900"] },
      { code: "P0299", description: "Turbo/Supercharger Underboost", category: "powertrain", frequency: 445, cohortAvg: 180, zScore: 2.4, severity: "high", relatedParts: [] },
      { code: "B1201", description: "Fuel Sender Circuit Open", category: "body", frequency: 234, cohortAvg: 95, zScore: 2.3, severity: "medium", relatedParts: [] },
      { code: "C0561", description: "ABS System Disabled", category: "chassis", frequency: 189, cohortAvg: 72, zScore: 2.5, severity: "high", relatedParts: ["PM-20"] },
    ],
  },
  {
    year: 2022,
    make: "Ford",
    model: "Transit",
    cohortSize: 7200,
    outlierCount: 3,
    dtcsByCategory: {
      powertrain: [15, 18, 20, 22, 25, 28, 30, 32, 29, 27, 30, 33],
      body: [5, 6, 5, 7, 6, 8, 7, 8, 7, 6, 7, 8],
      chassis: [10, 12, 11, 14, 13, 15, 16, 18, 16, 14, 16, 17],
      network: [3, 4, 3, 5, 4, 5, 6, 5, 4, 5, 6, 5],
    },
    topOutliers: [
      { code: "P0401", description: "EGR Flow Insufficient", category: "powertrain", frequency: 412, cohortAvg: 165, zScore: 2.6, severity: "high", relatedParts: [] },
      { code: "P0128", description: "Coolant Thermostat Below Temp", category: "powertrain", frequency: 356, cohortAvg: 145, zScore: 2.3, severity: "medium", relatedParts: ["RH-180", "VC-13DL-G"] },
      { code: "U0100", description: "Lost Communication With ECM/PCM", category: "network", frequency: 178, cohortAvg: 68, zScore: 2.4, severity: "critical", relatedParts: [] },
    ],
  },
  {
    year: 2021,
    make: "Ford",
    model: "F-250",
    cohortSize: 6500,
    outlierCount: 3,
    dtcsByCategory: {
      powertrain: [20, 24, 28, 32, 35, 40, 45, 48, 44, 40, 45, 50],
      body: [4, 5, 4, 6, 5, 6, 7, 6, 5, 6, 7, 6],
      chassis: [10, 12, 14, 16, 18, 20, 22, 24, 21, 19, 22, 24],
      network: [2, 3, 2, 4, 3, 4, 5, 4, 3, 4, 5, 4],
    },
    topOutliers: [
      { code: "P0263", description: "Cylinder 1 Contribution/Balance", category: "powertrain", frequency: 534, cohortAvg: 180, zScore: 3.0, severity: "critical", relatedParts: [] },
      { code: "P2463", description: "DPF Soot Accumulation", category: "powertrain", frequency: 467, cohortAvg: 175, zScore: 2.6, severity: "high", relatedParts: ["FA-1900"] },
      { code: "P0676", description: "Glow Plug Circuit Cylinder 6", category: "powertrain", frequency: 312, cohortAvg: 120, zScore: 2.4, severity: "medium", relatedParts: [] },
    ],
  },
  {
    year: 2021,
    make: "Ford",
    model: "Explorer",
    cohortSize: 9800,
    outlierCount: 2,
    dtcsByCategory: {
      powertrain: [10, 12, 14, 16, 15, 18, 20, 19, 17, 16, 18, 20],
      body: [6, 7, 8, 9, 8, 10, 11, 10, 9, 8, 10, 11],
      chassis: [5, 6, 7, 8, 7, 9, 10, 9, 8, 7, 9, 10],
      network: [2, 2, 3, 2, 3, 3, 4, 3, 2, 3, 4, 3],
    },
    topOutliers: [
      { code: "P0520", description: "Engine Oil Pressure Sensor Circuit", category: "powertrain", frequency: 345, cohortAvg: 140, zScore: 2.3, severity: "high", relatedParts: ["FL-500S", "XO-5W30-Q1SP"] },
      { code: "B1318", description: "Battery Voltage Low", category: "body", frequency: 289, cohortAvg: 115, zScore: 2.2, severity: "medium", relatedParts: ["BAGM-48H6-800"] },
    ],
  },
];

// Get DTC profile for a vehicle
export function getCohortDTCProfile(year: number, model: string): CohortDTCProfile | null {
  return cohortDTCProfiles.find(p => p.year === year && p.model === model) || null;
}

// Get all profiles
export function getAllCohortProfiles(): CohortDTCProfile[] {
  return cohortDTCProfiles;
}

// Generate sparkline data (normalized 0-1 for display)
export function getSparklineData(data: number[]): number[] {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  return data.map(v => (v - min) / range);
}

// Get severity color
export function getSeverityColor(severity: DTCOutlier["severity"]): string {
  switch (severity) {
    case "critical": return "text-red-500";
    case "high": return "text-orange-500";
    case "medium": return "text-yellow-600";
    case "low": return "text-neutral-400";
  }
}
