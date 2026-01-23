// AssemblyScript source for WASM Risk Engine
// Compile with: npx asc wasm/assembly/index.ts -o public/risk-engine.wasm --optimize

// ============================================================================
// SHARED MEMORY LAYOUT
// ============================================================================
// vehicles: Float64Array[MAX_VEHICLES * VEHICLE_STRIDE]
// Each vehicle: [
//   0: mileage,
//   1: age (years),
//   2: health_score,
//   3: dtc_powertrain,
//   4: dtc_body,
//   5: dtc_chassis,
//   6: dtc_network,
//   7: rust_exposure,
//   8: stop_go_factor,
//   9: terrain_factor,
//   10: thermal_factor,
//   11: active_recalls,
//   12: result: priority_score,
//   13: result: outlier_score,
//   14: result: likelihood,
//   15: result: posterior
// ]

const VEHICLE_STRIDE: i32 = 16;
const MAX_VEHICLES: i32 = 10000;

// Cohort statistics (per mileage band)
// cohort: Float64Array[6 * COHORT_STRIDE]
const COHORT_STRIDE: i32 = 8;
// Each cohort: [mean_p, std_p, mean_b, std_b, mean_c, std_c, mean_n, std_n]

// Weather data
let weatherTemp: f64 = 70.0;
let weatherHumidity: f64 = 50.0;
let weatherPrecipitation: f64 = 0.0;
let weatherTempVariance: f64 = 10.0;

// ============================================================================
// CORE BAYESIAN FUNCTIONS
// ============================================================================

@inline
function clamp(value: f64, min: f64, max: f64): f64 {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

@inline
function calculateWeatherLikelihood(): f64 {
  let likelihood: f64 = 1.0;
  
  // Extreme temperature
  if (weatherTemp < 20.0 || weatherTemp > 100.0) {
    likelihood *= 1.5;
  } else if (weatherTemp < 32.0 || weatherTemp > 90.0) {
    likelihood *= 1.2;
  }
  
  // Precipitation
  if (weatherPrecipitation > 0.5) {
    likelihood *= 1.3;
  } else if (weatherPrecipitation > 0.1) {
    likelihood *= 1.1;
  }
  
  // Humidity (corrosion risk)
  if (weatherHumidity > 80.0) {
    likelihood *= 1.2;
  }
  
  // Thermal cycling
  if (weatherTempVariance > 30.0) {
    likelihood *= 1.4;
  } else if (weatherTempVariance > 20.0) {
    likelihood *= 1.2;
  }
  
  return likelihood;
}

@inline
function calculateDTCLikelihood(
  vehicleDTC: f64,
  cohortMean: f64,
  cohortStd: f64
): f64 {
  if (cohortStd < 0.1) cohortStd = 0.1; // Avoid division by zero
  
  // Symmetric evidence: above-cohort DTCs increase risk; below-cohort DTCs decrease risk.
  // Map z-score to a likelihood ratio in log-space:
  // LR(z) = exp(k * z), where k = ln(maxLR)/3 so z=3 -> maxLR and z=-3 -> 1/maxLR.
  const zScore = (vehicleDTC - cohortMean) / cohortStd;
  const clampedZ = clamp(zScore, -3.0, 3.0);
  const maxLR: f64 = 3.0;
  const k: f64 = Math.log(maxLR) / 3.0;
  const lr = Math.exp(k * clampedZ);
  return lr;
}

@inline
function calculateMileageLikelihood(mileage: f64, ageYears: f64): f64 {
  // Guardrails: avoid ageYears=0 causing infinite ratios.
  const expectedMileage = 12000.0 * ageYears;
  const safeExpected = expectedMileage > 1.0 ? expectedMileage : 1.0;
  const ratio = mileage / safeExpected;
  
  if (ratio > 1.5) {
    return 1.5; // High stress
  } else if (ratio > 1.2) {
    return 1.25; // Moderate stress
  }
  return 1.0;
}

@inline
function calculateEnvironmentLikelihood(
  rust: f64,
  stopGo: f64,
  terrain: f64,
  thermal: f64
): f64 {
  const envScore = (rust * 0.3) + (stopGo * 0.25) + (terrain * 0.25) + (thermal * 0.2);
  return 1.0 + (envScore / 100.0);
}

@inline
function calculatePrior(ageYears: f64, healthScore: f64): f64 {
  // Conservative base prior. Keep this intentionally low; other evidence comes via LR multipliers.
  // (2.3% is the battery failure base in `src/lib/wasm/stressors.ts`.)
  const baseRate: f64 = 0.023;
  let ageFactor = 1.0 + (ageYears / 10.0);
  if (ageFactor > 2.0) ageFactor = 2.0;
  
  // Health score inverts: low health = high prior
  const healthFactor = 1.0 + ((100.0 - healthScore) / 100.0);
  
  return clamp(baseRate * ageFactor * healthFactor, 0.0, 0.9);
}

@inline
function posteriorFromLikelihoodRatio(prior: f64, lr: f64): f64 {
  // Proper LR→posterior update (odds form):
  // posterior = (prior * LR) / ((1 - prior) + prior * LR)
  const safeLR = lr > 0.000001 ? lr : 0.000001;
  const numerator = prior * safeLR;
  const denominator = (1.0 - prior) + numerator;
  return clamp(numerator / denominator, 0.0, 1.0);
}

// ============================================================================
// EXPORTED FUNCTIONS
// ============================================================================

export function setWeather(temp: f64, humidity: f64, precip: f64, variance: f64): void {
  weatherTemp = temp;
  weatherHumidity = humidity;
  weatherPrecipitation = precip;
  weatherTempVariance = variance;
}

export function calculateVehicleRisk(
  mileage: f64,
  ageYears: f64,
  healthScore: f64,
  dtcPowertrain: f64,
  dtcBody: f64,
  dtcChassis: f64,
  dtcNetwork: f64,
  rustExposure: f64,
  stopGoFactor: f64,
  terrainFactor: f64,
  thermalFactor: f64,
  activeRecalls: f64,
  cohortMeanP: f64,
  cohortStdP: f64,
  cohortMeanB: f64,
  cohortStdB: f64,
  cohortMeanC: f64,
  cohortStdC: f64,
  cohortMeanN: f64,
  cohortStdN: f64
): f64 {
  // Calculate prior
  const prior = calculatePrior(ageYears, healthScore);
  
  // Calculate likelihoods
  let lWeather = calculateWeatherLikelihood();
  // Cap stacked weather effects so step-functions can't spike too hard.
  lWeather = clamp(lWeather, 0.5, 2.0);
  const lDtcP = calculateDTCLikelihood(dtcPowertrain, cohortMeanP, cohortStdP);
  const lDtcB = calculateDTCLikelihood(dtcBody, cohortMeanB, cohortStdB);
  const lDtcC = calculateDTCLikelihood(dtcChassis, cohortMeanC, cohortStdC);
  const lDtcN = calculateDTCLikelihood(dtcNetwork, cohortMeanN, cohortStdN);
  // Geometric mean is more appropriate for LRs than arithmetic mean.
  const lDtc = Math.exp(
    (Math.log(lDtcP) + Math.log(lDtcB) + Math.log(lDtcC) + Math.log(lDtcN)) / 4.0
  );
  
  const lMileage = calculateMileageLikelihood(mileage, ageYears);
  const lEnv = calculateEnvironmentLikelihood(rustExposure, stopGoFactor, terrainFactor, thermalFactor);
  // Recalls are a signal, but should not dominate. Cap the boost.
  const recallCount = clamp(activeRecalls, 0.0, 5.0);
  const lRecalls = 1.0 + (recallCount * 0.10); // max 1.5x
  
  // Combined likelihood
  // Independence is not guaranteed; dampen correlated evidence by weighting in log-space.
  const wWeather: f64 = 0.6;
  const wDtc: f64 = 0.8;
  const wMileage: f64 = 0.7;
  const wEnv: f64 = 0.6;
  const wRecalls: f64 = 0.5;
  const likelihood = Math.exp(
    (wWeather * Math.log(lWeather)) +
    (wDtc * Math.log(lDtc)) +
    (wMileage * Math.log(lMileage)) +
    (wEnv * Math.log(lEnv)) +
    (wRecalls * Math.log(lRecalls))
  );
  
  // Posterior
  const posterior = posteriorFromLikelihoodRatio(prior, likelihood);
  
  // Priority score (0-100)
  return posterior * 100.0;
}

export function calculateOutlierScore(
  vehicleDTC: f64,
  cohortMean: f64,
  cohortStd: f64
): f64 {
  if (cohortStd < 0.1) cohortStd = 0.1;
  const zScore = (vehicleDTC - cohortMean) / cohortStd;
  return clamp(zScore, -3.0, 3.0);
}

// Batch calculation for all vehicles
export function calculateAllVehicles(
  vehicleData: Float64Array,
  cohortData: Float64Array,
  vehicleCount: i32
): void {
  for (let i: i32 = 0; i < vehicleCount; i++) {
    const offset = i * VEHICLE_STRIDE;
    
    // Read vehicle data
    const mileage = unchecked(vehicleData[offset + 0]);
    const ageYears = unchecked(vehicleData[offset + 1]);
    const healthScore = unchecked(vehicleData[offset + 2]);
    const dtcP = unchecked(vehicleData[offset + 3]);
    const dtcB = unchecked(vehicleData[offset + 4]);
    const dtcC = unchecked(vehicleData[offset + 5]);
    const dtcN = unchecked(vehicleData[offset + 6]);
    const rust = unchecked(vehicleData[offset + 7]);
    const stopGo = unchecked(vehicleData[offset + 8]);
    const terrain = unchecked(vehicleData[offset + 9]);
    const thermal = unchecked(vehicleData[offset + 10]);
    const recalls = unchecked(vehicleData[offset + 11]);
    
    // Determine mileage band (0-5)
    let band: i32 = 0;
    if (mileage >= 150000) band = 5;
    else if (mileage >= 100000) band = 4;
    else if (mileage >= 75000) band = 3;
    else if (mileage >= 50000) band = 2;
    else if (mileage >= 25000) band = 1;
    
    // Read cohort stats
    const cohortOffset = band * COHORT_STRIDE;
    const meanP = unchecked(cohortData[cohortOffset + 0]);
    const stdP = unchecked(cohortData[cohortOffset + 1]);
    const meanB = unchecked(cohortData[cohortOffset + 2]);
    const stdB = unchecked(cohortData[cohortOffset + 3]);
    const meanC = unchecked(cohortData[cohortOffset + 4]);
    const stdC = unchecked(cohortData[cohortOffset + 5]);
    const meanN = unchecked(cohortData[cohortOffset + 6]);
    const stdN = unchecked(cohortData[cohortOffset + 7]);
    
    // Calculate risk
    const priority = calculateVehicleRisk(
      mileage, ageYears, healthScore,
      dtcP, dtcB, dtcC, dtcN,
      rust, stopGo, terrain, thermal, recalls,
      meanP, stdP, meanB, stdB, meanC, stdC, meanN, stdN
    );
    
    // Calculate outlier scores
    const outlierP = calculateOutlierScore(dtcP, meanP, stdP);
    const outlierAvg = (
      outlierP +
      calculateOutlierScore(dtcB, meanB, stdB) +
      calculateOutlierScore(dtcC, meanC, stdC) +
      calculateOutlierScore(dtcN, meanN, stdN)
    ) / 4.0;
    
    // Write results
    unchecked(vehicleData[offset + 12] = priority);
    unchecked(vehicleData[offset + 13] = outlierAvg);
  }
}

// ============================================================================
// PARTICLE SYSTEM FOR VISUALIZATION
// ============================================================================

const MAX_PARTICLES: i32 = 5000;
const PARTICLE_STRIDE: i32 = 6; // x, y, vx, vy, life, type

let particleTime: f64 = 0.0;

export function updateParticles(
  particles: Float64Array,
  count: i32,
  deltaTime: f64,
  weatherType: i32 // 0=clear, 1=rain, 2=snow, 3=heat
): i32 {
  particleTime += deltaTime;
  
  let activeCount: i32 = 0;
  
  for (let i: i32 = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    let x = unchecked(particles[offset + 0]);
    let y = unchecked(particles[offset + 1]);
    let vx = unchecked(particles[offset + 2]);
    let vy = unchecked(particles[offset + 3]);
    let life = unchecked(particles[offset + 4]);
    
    if (life <= 0.0) continue;
    
    // Update position
    x += vx * deltaTime;
    y += vy * deltaTime;
    
    // Apply physics based on weather type
    if (weatherType == 1) { // Rain
      vy += 9.8 * deltaTime; // Gravity
      vx *= 0.99; // Air resistance
    } else if (weatherType == 2) { // Snow
      vy += 1.5 * deltaTime; // Gentle fall
      vx += Math.sin(particleTime * 2.0 + <f64>i) * 0.5 * deltaTime; // Drift
    } else if (weatherType == 3) { // Heat
      vy -= 2.0 * deltaTime; // Rise
      vx += Math.sin(particleTime * 3.0 + <f64>i) * 2.0 * deltaTime; // Shimmer
    }
    
    // Decrease life
    life -= deltaTime;
    
    // Wrap around for continuous effect
    if (y > 1.0) {
      y = 0.0;
      life = 5.0; // Reset life
    }
    if (y < 0.0) {
      y = 1.0;
      life = 5.0;
    }
    if (x > 1.0) x = 0.0;
    if (x < 0.0) x = 1.0;
    
    // Write back
    unchecked(particles[offset + 0] = x);
    unchecked(particles[offset + 1] = y);
    unchecked(particles[offset + 2] = vx);
    unchecked(particles[offset + 3] = vy);
    unchecked(particles[offset + 4] = life);
    
    if (life > 0.0) activeCount++;
  }
  
  return activeCount;
}

// ============================================================================
// RISK LIQUID SIMULATION
// ============================================================================

const FLUID_GRID_SIZE: i32 = 32;

export function simulateRiskFluid(
  fluid: Float64Array, // FLUID_GRID_SIZE * FLUID_GRID_SIZE
  targetLevel: f64, // 0-1 risk level
  deltaTime: f64
): void {
  // Simple wave simulation for liquid effect
  const gridSize = FLUID_GRID_SIZE;
  const dampening: f64 = 0.98;
  const speed: f64 = 5.0;
  
  for (let y: i32 = 0; y < gridSize; y++) {
    for (let x: i32 = 0; x < gridSize; x++) {
      const idx = y * gridSize + x;
      let height = unchecked(fluid[idx]);
      
      // Wave equation (simplified)
      const targetHeight = targetLevel + Math.sin(<f64>x * 0.3 + particleTime * speed) * 0.05;
      height = height + (targetHeight - height) * deltaTime * 3.0;
      height *= dampening;
      
      // Clamp
      if (height < 0.0) height = 0.0;
      if (height > 1.0) height = 1.0;
      
      unchecked(fluid[idx] = height);
    }
  }
}
