// Environmental Stress Factors for Fleet Service Priority
// Based on location, driving patterns, and conditions
import { dedupeStrings } from "./dedupe";

export interface EnvironmentalFactors {
  // Location-based
  humidity: number;        // 0-100%, affects corrosion
  saltExposure: "none" | "coastal" | "winter" | "both";  // Corrosion risk
  avgTemperature: number;  // Annual average, affects fluids
  
  // Driving pattern-based
  trafficDensity: "rural" | "suburban" | "urban" | "heavy_urban";
  avgTripLength: "short" | "medium" | "long";  // Short trips = more wear
  terrainType: "flat" | "hilly" | "mountain";
  
  // Calculated stress multipliers
  corrosionRisk: number;   // 1.0 - 2.0
  brakeStress: number;     // 1.0 - 2.0
  engineStress: number;    // 1.0 - 2.0
  batteryStress: number;   // 1.0 - 2.0
}

// San Diego environmental profile (demo default)
export const sanDiegoEnvironment: EnvironmentalFactors = {
  humidity: 65,
  saltExposure: "coastal",
  avgTemperature: 72,
  trafficDensity: "urban",
  avgTripLength: "medium",
  terrainType: "hilly",
  corrosionRisk: 1.3,      // Coastal = salt air
  brakeStress: 1.2,        // Hills + traffic
  engineStress: 1.0,       // Mild climate
  batteryStress: 1.1,      // Heat stress
};

// Calculate stress multipliers based on environment
export function calculateEnvironmentalStress(env: Partial<EnvironmentalFactors>): EnvironmentalFactors {
  const base: EnvironmentalFactors = {
    humidity: env.humidity ?? 50,
    saltExposure: env.saltExposure ?? "none",
    avgTemperature: env.avgTemperature ?? 60,
    trafficDensity: env.trafficDensity ?? "suburban",
    avgTripLength: env.avgTripLength ?? "medium",
    terrainType: env.terrainType ?? "flat",
    corrosionRisk: 1.0,
    brakeStress: 1.0,
    engineStress: 1.0,
    batteryStress: 1.0,
  };

  // Corrosion risk calculation
  let corrosion = 1.0;
  if (base.humidity > 70) corrosion += 0.15;
  if (base.humidity > 85) corrosion += 0.15;
  if (base.saltExposure === "coastal") corrosion += 0.25;
  if (base.saltExposure === "winter") corrosion += 0.30;
  if (base.saltExposure === "both") corrosion += 0.45;
  base.corrosionRisk = Math.min(2.0, corrosion);

  // Brake stress calculation
  let brakes = 1.0;
  if (base.trafficDensity === "urban") brakes += 0.20;
  if (base.trafficDensity === "heavy_urban") brakes += 0.35;
  if (base.terrainType === "hilly") brakes += 0.15;
  if (base.terrainType === "mountain") brakes += 0.30;
  if (base.avgTripLength === "short") brakes += 0.10; // More stop/start
  base.brakeStress = Math.min(2.0, brakes);

  // Engine stress calculation
  let engine = 1.0;
  if (base.avgTemperature > 85) engine += 0.20;
  if (base.avgTemperature < 32) engine += 0.15;
  if (base.avgTripLength === "short") engine += 0.20; // Never reaches optimal temp
  if (base.trafficDensity === "heavy_urban") engine += 0.15; // Idling
  base.engineStress = Math.min(2.0, engine);

  // Battery stress calculation  
  let battery = 1.0;
  if (base.avgTemperature > 90) battery += 0.30;
  if (base.avgTemperature < 20) battery += 0.25;
  if (base.avgTripLength === "short") battery += 0.20; // Not enough charging
  if (base.humidity > 80) battery += 0.10;
  base.batteryStress = Math.min(2.0, battery);

  return base;
}

// Regional presets (legacy)
export const regionalProfiles: Record<string, Partial<EnvironmentalFactors>> = {
  "san_diego": {
    humidity: 65,
    saltExposure: "coastal",
    avgTemperature: 72,
    trafficDensity: "urban",
    terrainType: "hilly",
  },
  "phoenix": {
    humidity: 25,
    saltExposure: "none",
    avgTemperature: 95,
    trafficDensity: "suburban",
    terrainType: "flat",
  },
  "chicago": {
    humidity: 70,
    saltExposure: "winter",
    avgTemperature: 50,
    trafficDensity: "heavy_urban",
    terrainType: "flat",
  },
  "seattle": {
    humidity: 80,
    saltExposure: "coastal",
    avgTemperature: 52,
    trafficDensity: "urban",
    terrainType: "hilly",
  },
  "denver": {
    humidity: 45,
    saltExposure: "winter",
    avgTemperature: 55,
    trafficDensity: "suburban",
    terrainType: "mountain",
  },
};

// ============================================================================
// ENVIRONMENT PRESETS (for Bayesian Risk Engine)
// ============================================================================

export interface EnvironmentPreset {
  id: string;
  name: string;
  lat: number;
  lon: number;
  severity: "low" | "medium" | "high";
  factors: {
    rustExposure: number;     // 0-100
    stopGoFactor: number;     // 0-100
    terrainFactor: number;    // 0-100
    thermalFactor: number;    // 0-100
  };
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: "san-diego",
    name: "San Diego, CA",
    lat: 32.7157,
    lon: -117.1611,
    severity: "low",
    factors: {
      rustExposure: 25,      // Coastal but dry
      stopGoFactor: 45,      // Moderate traffic
      terrainFactor: 30,     // Some hills
      thermalFactor: 20,     // Mild temps
    },
  },
  {
    id: "phoenix",
    name: "Phoenix, AZ",
    lat: 33.4484,
    lon: -112.0740,
    severity: "medium",
    factors: {
      rustExposure: 5,       // Desert, no rust
      stopGoFactor: 40,      // Spread out city
      terrainFactor: 15,     // Mostly flat
      thermalFactor: 85,     // Extreme heat
    },
  },
  {
    id: "chicago",
    name: "Chicago, IL",
    lat: 41.8781,
    lon: -87.6298,
    severity: "high",
    factors: {
      rustExposure: 85,      // Heavy road salt
      stopGoFactor: 75,      // Dense urban
      terrainFactor: 10,     // Flat
      thermalFactor: 60,     // Cold winters
    },
  },
  {
    id: "seattle",
    name: "Seattle, WA",
    lat: 47.6062,
    lon: -122.3321,
    severity: "medium",
    factors: {
      rustExposure: 55,      // Rain + coastal
      stopGoFactor: 50,      // Moderate traffic
      terrainFactor: 45,     // Hilly
      thermalFactor: 25,     // Mild but damp
    },
  },
  {
    id: "denver",
    name: "Denver, CO",
    lat: 39.7392,
    lon: -104.9903,
    severity: "medium",
    factors: {
      rustExposure: 40,      // Some winter salt
      stopGoFactor: 35,      // Less dense
      terrainFactor: 70,     // Mountains!
      thermalFactor: 45,     // Cold but sunny
    },
  },
  {
    id: "detroit",
    name: "Detroit, MI",
    lat: 42.3314,
    lon: -83.0458,
    severity: "high",
    factors: {
      rustExposure: 90,      // Rust Belt central
      stopGoFactor: 55,      // Industrial
      terrainFactor: 10,     // Flat
      thermalFactor: 55,     // Cold winters
    },
  },
  {
    id: "miami",
    name: "Miami, FL",
    lat: 25.7617,
    lon: -80.1918,
    severity: "medium",
    factors: {
      rustExposure: 70,      // Salt air + humidity
      stopGoFactor: 60,      // Tourist traffic
      terrainFactor: 5,      // Completely flat
      thermalFactor: 40,     // Hot but stable
    },
  },
  {
    id: "dallas",
    name: "Dallas, TX",
    lat: 32.7767,
    lon: -96.7970,
    severity: "low",
    factors: {
      rustExposure: 15,      // Low humidity
      stopGoFactor: 55,      // Urban sprawl
      terrainFactor: 10,     // Flat
      thermalFactor: 50,     // Hot summers
    },
  },
];

export function getEnvironmentalPreset(id: string): EnvironmentPreset {
  return ENVIRONMENT_PRESETS.find(p => p.id === id) || ENVIRONMENT_PRESETS[0];
}

// Get parts most affected by environmental factors
export function getEnvironmentalPartRecommendations(env: EnvironmentalFactors): string[] {
  const parts: string[] = [];
  
  if (env.corrosionRisk > 1.2) {
    parts.push("undercoating", "rust inhibitor", "brake hardware");
  }
  if (env.brakeStress > 1.2) {
    parts.push("BRF-1478", "BRF-1934", "BRR-234", "PM-20");
  }
  if (env.engineStress > 1.2) {
    parts.push("FL-500S", "XO-5W30-Q1SP", "VC-13DL-G");
  }
  if (env.batteryStress > 1.2) {
    parts.push("BAGM-48H6-800", "BXT-96R-590");
  }
  
  return dedupeStrings(parts);
}
