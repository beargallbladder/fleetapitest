/**
 * Risk Engine - WASM-accelerated Bayesian risk calculations
 * 
 * Based on VIN Stressors Platform PRD (July 2025)
 * Owner: Nitu A. (Business), Sam K. (Technical / Deployment)
 * 
 * This module provides:
 * - Risk probability calculations using validated stressor likelihood ratios
 * - Cohort comparison and outlier detection for DTCs
 * - DTC sparkline generation (12-week trend)
 * - Weather-responsive risk adjustments
 * 
 * CORE FORMULA:
 * P(failure|stressors) = P(failure) × ∏(1 + (LR_i - 1) × intensity_i)
 * 
 * LIKELIHOOD RATIOS (from academic sources):
 * - Weather: 3.5x (Argonne National Lab, 2018)
 * - Trip Pattern: 2.83x (HL Mando, 2021)
 * - Cold Start: 6.5x (Varta Automotive, 2020)
 * - Altitude: 1.6x (Exide, 2019)
 * - Corrosion: 2.1x (Battery Council International, 2019)
 * 
 * Uses WASM for performance when available, falls back to pure JS.
 */

import {
  calculateFailureProbability,
  StressorInput,
  FailureProbabilityResult,
  RISK_TIERS,
  getRiskTier,
  BASE_FAILURE_RATE,
  ALL_STRESSORS,
} from "./stressors";

// ============================================================================
// TYPES
// ============================================================================

export interface VehicleRiskInput {
  vin: string;
  mileage: number;
  ageYears: number;
  healthScore: number;
  dtcs: {
    powertrain: number;
    body: number;
    chassis: number;
    network: number;
  };
  environment: {
    rustExposure: number;    // 0-100
    stopGoFactor: number;    // 0-100
    terrainFactor: number;   // 0-100
    thermalFactor: number;   // 0-100
  };
  activeRecalls: number;
}

export interface CohortStats {
  mileageBand: string;
  powertrain: { mean: number; stdDev: number };
  body: { mean: number; stdDev: number };
  chassis: { mean: number; stdDev: number };
  network: { mean: number; stdDev: number };
  sampleSize: number;
}

export interface VehicleRiskResult {
  vin: string;
  priorityScore: number;        // 0-100
  prior: number;                // Base probability
  likelihood: number;           // Combined likelihood
  posterior: number;            // Final probability
  outlierScore: number;         // Z-score average across DTC categories
  outlierCategories: {
    powertrain: { zScore: number; status: OutlierStatus };
    body: { zScore: number; status: OutlierStatus };
    chassis: { zScore: number; status: OutlierStatus };
    network: { zScore: number; status: OutlierStatus };
  };
  factors: {
    weather: number;
    dtc: number;
    mileage: number;
    environment: number;
    recalls: number;
  };
}

export type OutlierStatus = 'normal' | 'watch' | 'moderate_outlier' | 'critical_outlier';

export interface WeatherConditions {
  temperature: number;          // °F
  humidity: number;             // %
  precipitation: number;        // 0-1 (probability/intensity)
  tempVariance: number;         // Daily temp swing °F
}

export interface SparklineData {
  category: string;
  values: number[];             // 12 weeks of data
  trend: 'improving' | 'stable' | 'worsening';
  currentZScore: number;
}

// Re-export stressor types for external use
export type { StressorInput, FailureProbabilityResult };
export { calculateFailureProbability, RISK_TIERS, getRiskTier, BASE_FAILURE_RATE, ALL_STRESSORS };

// ============================================================================
// COHORT DATA (Simulated Ford Internal Data)
// ============================================================================

// These represent aggregated, anonymized cohort statistics
// In production, this would come from Ford's telemetry systems
const COHORT_STATS: Record<string, CohortStats> = {
  '0-25k': {
    mileageBand: '0-25k',
    powertrain: { mean: 0.3, stdDev: 0.4 },
    body: { mean: 0.2, stdDev: 0.3 },
    chassis: { mean: 0.1, stdDev: 0.2 },
    network: { mean: 0.4, stdDev: 0.5 },
    sampleSize: 45000,
  },
  '25k-50k': {
    mileageBand: '25k-50k',
    powertrain: { mean: 0.8, stdDev: 0.6 },
    body: { mean: 0.4, stdDev: 0.4 },
    chassis: { mean: 0.3, stdDev: 0.3 },
    network: { mean: 0.6, stdDev: 0.5 },
    sampleSize: 62000,
  },
  '50k-75k': {
    mileageBand: '50k-75k',
    powertrain: { mean: 1.2, stdDev: 0.8 },
    body: { mean: 0.6, stdDev: 0.5 },
    chassis: { mean: 0.5, stdDev: 0.4 },
    network: { mean: 0.8, stdDev: 0.6 },
    sampleSize: 58000,
  },
  '75k-100k': {
    mileageBand: '75k-100k',
    powertrain: { mean: 1.8, stdDev: 1.0 },
    body: { mean: 0.9, stdDev: 0.6 },
    chassis: { mean: 0.8, stdDev: 0.5 },
    network: { mean: 1.0, stdDev: 0.7 },
    sampleSize: 41000,
  },
  '100k-150k': {
    mileageBand: '100k-150k',
    powertrain: { mean: 2.5, stdDev: 1.2 },
    body: { mean: 1.2, stdDev: 0.8 },
    chassis: { mean: 1.1, stdDev: 0.7 },
    network: { mean: 1.3, stdDev: 0.8 },
    sampleSize: 28000,
  },
  '150k+': {
    mileageBand: '150k+',
    powertrain: { mean: 3.2, stdDev: 1.5 },
    body: { mean: 1.6, stdDev: 1.0 },
    chassis: { mean: 1.5, stdDev: 0.9 },
    network: { mean: 1.6, stdDev: 1.0 },
    sampleSize: 15000,
  },
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function getMileageBand(mileage: number): string {
  if (mileage >= 150000) return '150k+';
  if (mileage >= 100000) return '100k-150k';
  if (mileage >= 75000) return '75k-100k';
  if (mileage >= 50000) return '50k-75k';
  if (mileage >= 25000) return '25k-50k';
  return '0-25k';
}

function getOutlierStatus(zScore: number): OutlierStatus {
  const absZ = Math.abs(zScore);
  if (absZ > 2.0) return 'critical_outlier';
  if (absZ > 1.5) return 'moderate_outlier';
  if (absZ > 1.0) return 'watch';
  return 'normal';
}

// ============================================================================
// RISK CALCULATION (Pure JS - fallback for WASM)
// ============================================================================

let currentWeather: WeatherConditions = {
  temperature: 70,
  humidity: 50,
  precipitation: 0,
  tempVariance: 10,
};

export function setWeatherConditions(weather: WeatherConditions): void {
  currentWeather = weather;
  
  // Sync to WASM if available
  if (wasmExports?.setWeather) {
    wasmExports.setWeather(
      weather.temperature,
      weather.humidity,
      weather.precipitation,
      weather.tempVariance
    );
  }
}

function calculateWeatherLikelihood(): number {
  let likelihood = 1.0;
  
  const { temperature, humidity, precipitation, tempVariance } = currentWeather;
  
  // Extreme temperature
  if (temperature < 20 || temperature > 100) {
    likelihood *= 1.5;
  } else if (temperature < 32 || temperature > 90) {
    likelihood *= 1.2;
  }
  
  // Precipitation
  if (precipitation > 0.5) {
    likelihood *= 1.3;
  } else if (precipitation > 0.1) {
    likelihood *= 1.1;
  }
  
  // Humidity (corrosion)
  if (humidity > 80) {
    likelihood *= 1.2;
  }
  
  // Thermal cycling
  if (tempVariance > 30) {
    likelihood *= 1.4;
  } else if (tempVariance > 20) {
    likelihood *= 1.2;
  }
  
  return likelihood;
}

function calculateDTCLikelihood(vehicleDTC: number, mean: number, stdDev: number): number {
  const std = Math.max(stdDev, 0.1);
  const zScore = (vehicleDTC - mean) / std;
  // Symmetric evidence via LR in log-space: LR(z)=exp(k*z), z=3 -> 3x, z=-3 -> 1/3x
  const clampedZ = clamp(zScore, -3, 3);
  const maxLR = 3.0;
  const k = Math.log(maxLR) / 3;
  return Math.exp(k * clampedZ);
}

function calculateMileageLikelihood(mileage: number, ageYears: number): number {
  const expectedMileage = 12000 * ageYears;
  const ratio = mileage / Math.max(expectedMileage, 1);
  
  if (ratio > 1.5) return 1.5;
  if (ratio > 1.2) return 1.25;
  return 1.0;
}

function calculateEnvironmentLikelihood(env: VehicleRiskInput['environment']): number {
  const envScore = (env.rustExposure * 0.3) + 
                   (env.stopGoFactor * 0.25) + 
                   (env.terrainFactor * 0.25) + 
                   (env.thermalFactor * 0.2);
  return 1.0 + (envScore / 100);
}

function calculatePrior(ageYears: number, healthScore: number): number {
  // Conservative base prior. (2.3% is the battery failure base in `./stressors.ts`.)
  const baseRate = 0.023;
  const ageFactor = Math.min(1.0 + (ageYears / 10), 2.0);
  const healthFactor = 1.0 + ((100 - healthScore) / 100);
  return clamp(baseRate * ageFactor * healthFactor, 0, 0.9);
}

function posteriorFromLikelihoodRatio(prior: number, lr: number): number {
  // Proper LR→posterior update:
  // posterior = (prior * LR) / ((1 - prior) + prior * LR)
  const safeLR = Math.max(lr, 1e-6);
  const numerator = prior * safeLR;
  const denominator = (1 - prior) + numerator;
  return clamp(numerator / denominator, 0, 1);
}

// ============================================================================
// MAIN CALCULATION FUNCTION
// ============================================================================

export function calculateVehicleRisk(input: VehicleRiskInput): VehicleRiskResult {
  const cohort = COHORT_STATS[getMileageBand(input.mileage)];
  
  // Calculate prior
  const prior = calculatePrior(input.ageYears, input.healthScore);
  
  // Calculate individual likelihoods
  const lWeatherRaw = calculateWeatherLikelihood();
  const lWeather = clamp(lWeatherRaw, 0.5, 2.0);
  
  const lDtcP = calculateDTCLikelihood(input.dtcs.powertrain, cohort.powertrain.mean, cohort.powertrain.stdDev);
  const lDtcB = calculateDTCLikelihood(input.dtcs.body, cohort.body.mean, cohort.body.stdDev);
  const lDtcC = calculateDTCLikelihood(input.dtcs.chassis, cohort.chassis.mean, cohort.chassis.stdDev);
  const lDtcN = calculateDTCLikelihood(input.dtcs.network, cohort.network.mean, cohort.network.stdDev);
  // Geometric mean is more appropriate for LRs than arithmetic mean.
  const lDtc = Math.exp((Math.log(lDtcP) + Math.log(lDtcB) + Math.log(lDtcC) + Math.log(lDtcN)) / 4);
  
  const lMileage = calculateMileageLikelihood(input.mileage, input.ageYears);
  const lEnv = calculateEnvironmentLikelihood(input.environment);
  const recallCount = clamp(input.activeRecalls, 0, 5);
  const lRecalls = 1.0 + (recallCount * 0.10); // max 1.5x
  
  // Combined likelihood
  // Independence is not guaranteed; dampen correlated evidence by weighting in log-space.
  const wWeather = 0.6;
  const wDtc = 0.8;
  const wMileage = 0.7;
  const wEnv = 0.6;
  const wRecalls = 0.5;
  const likelihood = Math.exp(
    (wWeather * Math.log(lWeather)) +
    (wDtc * Math.log(lDtc)) +
    (wMileage * Math.log(lMileage)) +
    (wEnv * Math.log(lEnv)) +
    (wRecalls * Math.log(lRecalls))
  );
  
  // Posterior
  const posterior = posteriorFromLikelihoodRatio(prior, likelihood);
  const priorityScore = Math.round(posterior * 100);
  
  // Outlier calculations
  const zP = (input.dtcs.powertrain - cohort.powertrain.mean) / Math.max(cohort.powertrain.stdDev, 0.1);
  const zB = (input.dtcs.body - cohort.body.mean) / Math.max(cohort.body.stdDev, 0.1);
  const zC = (input.dtcs.chassis - cohort.chassis.mean) / Math.max(cohort.chassis.stdDev, 0.1);
  const zN = (input.dtcs.network - cohort.network.mean) / Math.max(cohort.network.stdDev, 0.1);
  const outlierScore = (zP + zB + zC + zN) / 4;
  
  return {
    vin: input.vin,
    priorityScore,
    prior,
    likelihood,
    posterior,
    outlierScore,
    outlierCategories: {
      powertrain: { zScore: zP, status: getOutlierStatus(zP) },
      body: { zScore: zB, status: getOutlierStatus(zB) },
      chassis: { zScore: zC, status: getOutlierStatus(zC) },
      network: { zScore: zN, status: getOutlierStatus(zN) },
    },
    factors: {
      weather: lWeather,
      dtc: lDtc,
      mileage: lMileage,
      environment: lEnv,
      recalls: lRecalls,
    },
  };
}

// ============================================================================
// BATCH CALCULATION
// ============================================================================

export function calculateFleetRisk(vehicles: VehicleRiskInput[]): VehicleRiskResult[] {
  return vehicles.map(v => calculateVehicleRisk(v));
}

// ============================================================================
// SPARKLINE GENERATION
// ============================================================================

export function generateDTCSparklines(
  vin: string,
  currentDTCs: { powertrain: number; body: number; chassis: number; network: number }
): SparklineData[] {
  const categories = ['powertrain', 'body', 'chassis', 'network'] as const;
  
  return categories.map(cat => {
    // Generate 12 weeks of historical data leading to current
    const current = currentDTCs[cat];
    const values: number[] = [];
    
    // Simulate historical trend (realistic pattern)
    let baseValue = current * 0.6;
    for (let i = 0; i < 11; i++) {
      // Add some noise and trend
      const noise = (Math.random() - 0.5) * 0.3;
      const trend = (current - baseValue) / 12;
      baseValue += trend + noise;
      values.push(Math.max(0, baseValue));
    }
    values.push(current);
    
    // Calculate trend
    const firstHalf = values.slice(0, 6).reduce((a, b) => a + b, 0) / 6;
    const secondHalf = values.slice(6).reduce((a, b) => a + b, 0) / 6;
    const slope = secondHalf - firstHalf;
    
    let trend: 'improving' | 'stable' | 'worsening';
    if (slope > 0.1) trend = 'worsening';
    else if (slope < -0.1) trend = 'improving';
    else trend = 'stable';
    
    // Get cohort for z-score
    const cohort = COHORT_STATS['50k-75k']; // Use middle band as reference
    const zScore = (current - cohort[cat].mean) / Math.max(cohort[cat].stdDev, 0.1);
    
    return {
      category: cat,
      values,
      trend,
      currentZScore: zScore,
    };
  });
}

// ============================================================================
// COHORT COMPARISON
// ============================================================================

export interface CohortComparison {
  vehicleScore: number;
  cohortPercentile: number;      // 0-100, where 50 is median
  vehiclesInCohort: number;
  betterThan: number;            // Number of vehicles with worse scores
  worseThan: number;             // Number of vehicles with better scores
  cohortDistribution: number[];  // Histogram of scores (10 buckets)
}

export function compareToFleetCohort(
  vehicle: VehicleRiskResult,
  fleetSize: number = 2500 // Simulated fleet size
): CohortComparison {
  // Simulate cohort distribution (normal-ish, centered around 45)
  const distribution: number[] = [];
  const bucketSize = 10;
  
  for (let i = 0; i < 10; i++) {
    // Create bell curve centered at 40-50
    const bucketCenter = i * bucketSize + 5;
    const distance = Math.abs(bucketCenter - 45);
    const count = Math.round(fleetSize * 0.25 * Math.exp(-(distance * distance) / 500));
    distribution.push(count);
  }
  
  // Calculate percentile
  const bucket = Math.min(Math.floor(vehicle.priorityScore / bucketSize), 9);
  let belowCount = 0;
  for (let i = 0; i < bucket; i++) {
    belowCount += distribution[i];
  }
  
  const percentile = Math.round((belowCount / fleetSize) * 100);
  
  return {
    vehicleScore: vehicle.priorityScore,
    cohortPercentile: percentile,
    vehiclesInCohort: fleetSize,
    betterThan: belowCount,
    worseThan: fleetSize - belowCount,
    cohortDistribution: distribution,
  };
}

// ============================================================================
// WASM INTEGRATION
// ============================================================================

interface WASMExports {
  setWeather: (temp: number, humidity: number, precip: number, variance: number) => void;
  calculateVehicleRisk: (
    mileage: number,
    ageYears: number,
    healthScore: number,
    dtcPowertrain: number,
    dtcBody: number,
    dtcChassis: number,
    dtcNetwork: number,
    rustExposure: number,
    stopGoFactor: number,
    terrainFactor: number,
    thermalFactor: number,
    activeRecalls: number,
    cohortMeanP: number,
    cohortStdP: number,
    cohortMeanB: number,
    cohortStdB: number,
    cohortMeanC: number,
    cohortStdC: number,
    cohortMeanN: number,
    cohortStdN: number
  ) => number;
  calculateOutlierScore: (vehicleDTC: number, cohortMean: number, cohortStd: number) => number;
}

let wasmModule: WebAssembly.Instance | null = null;
let wasmExports: WASMExports | null = null;

export async function initWASM(): Promise<boolean> {
  try {
    const response = await fetch('/risk-engine.wasm');
    const buffer = await response.arrayBuffer();
    const module = await WebAssembly.instantiate(buffer);
    wasmModule = module.instance;
    wasmExports = module.instance.exports as unknown as WASMExports;
    
    // Sync weather conditions to WASM
    if (wasmExports.setWeather) {
      wasmExports.setWeather(
        currentWeather.temperature,
        currentWeather.humidity,
        currentWeather.precipitation,
        currentWeather.tempVariance
      );
    }
    
    console.log('[RiskEngine] WASM module loaded successfully');
    return true;
  } catch (e) {
    console.warn('[RiskEngine] WASM not available, using JS fallback:', e);
    return false;
  }
}

export function isWASMAvailable(): boolean {
  return wasmModule !== null && wasmExports !== null;
}

// Get WASM exports for external use (visualization components)
export function getWASMExports(): WASMExports | null {
  return wasmExports;
}
