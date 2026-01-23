// Service Priority Calculator
// Bayesian-inspired posterior probability for service need

import { FleetVehicle } from "./fleet";
import { WeatherData, calculateWeatherStressMultiplier } from "./weather";
import { EnvironmentalFactors, sanDiegoEnvironment, calculateEnvironmentalStress } from "./environmentalFactors";

export interface ServicePriority {
  vin: string;
  fleetId: string;
  model: string;
  priorityScore: number; // 0-100, higher = more urgent
  priorityLevel: "critical" | "high" | "medium" | "low";
  factors: PriorityFactor[];
  recommendedParts: string[];
  estimatedServiceDate: string;
  daysUntilRecommended: number;
  hasActiveRecall?: boolean;
}

export interface PriorityFactor {
  name: string;
  weight: number; // 0-1
  value: number;  // 0-1
  contribution: number; // weight * value
  description: string;
}

// Prior probabilities (base rates for service need)
const BASE_SERVICE_INTERVAL_DAYS = 90; // 3 months

// Calculate days until service is due
function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

// Calculate service priority for a single vehicle
export function calculateServicePriority(
  vehicle: FleetVehicle,
  weather: WeatherData | null,
  environment: EnvironmentalFactors = sanDiegoEnvironment,
  hasActiveRecall: boolean = false
): ServicePriority {
  const factors: PriorityFactor[] = [];
  const recommendedParts: string[] = [];
  
  // === FACTOR 1: Ford Health Score (25% weight) ===
  const healthFactor = {
    name: "Ford Health Score",
    weight: 0.25,
    value: 1 - (vehicle.fordHealthScore / 100), // Invert: lower health = higher priority
    contribution: 0,
    description: `Health: ${vehicle.fordHealthScore}%`,
  };
  healthFactor.contribution = healthFactor.weight * healthFactor.value;
  factors.push(healthFactor);
  
  // === FACTOR 2: Days until scheduled service (20% weight) ===
  const daysUntilService = daysUntil(vehicle.nextServiceDue);
  const serviceFactor = {
    name: "Service Schedule",
    weight: 0.20,
    value: Math.max(0, Math.min(1, 1 - (daysUntilService / BASE_SERVICE_INTERVAL_DAYS))),
    contribution: 0,
    description: daysUntilService <= 0 ? "OVERDUE" : `${daysUntilService} days`,
  };
  if (daysUntilService <= 0) serviceFactor.value = 1.0; // Overdue = max priority
  serviceFactor.contribution = serviceFactor.weight * serviceFactor.value;
  factors.push(serviceFactor);
  
  // === FACTOR 3: Mileage stress (15% weight) ===
  const mileageFactor = {
    name: "Mileage Stress",
    weight: 0.15,
    value: Math.min(1, vehicle.avgDailyMiles / 150), // 150 mi/day = max stress
    contribution: 0,
    description: `${vehicle.avgDailyMiles} mi/day avg`,
  };
  mileageFactor.contribution = mileageFactor.weight * mileageFactor.value;
  factors.push(mileageFactor);
  
  // === FACTOR 4: Trip Volume (10% weight) ===
  const tripVolumeValues = { high: 1.0, normal: 0.5, low: 0.2 };
  const tripFactor = {
    name: "Trip Volume",
    weight: 0.10,
    value: tripVolumeValues[vehicle.tripVolume],
    contribution: 0,
    description: `${vehicle.tripVolume.toUpperCase()} volume`,
  };
  tripFactor.contribution = tripFactor.weight * tripFactor.value;
  factors.push(tripFactor);
  
  // === FACTOR 5: Environmental Stress (15% weight) - NEW ===
  const envStress = calculateEnvironmentalStress(environment);
  const envValue = (
    (envStress.corrosionRisk - 1) * 0.3 +
    (envStress.brakeStress - 1) * 0.3 +
    (envStress.engineStress - 1) * 0.2 +
    (envStress.batteryStress - 1) * 0.2
  );
  
  const envDescriptions: string[] = [];
  if (envStress.corrosionRisk > 1.2) envDescriptions.push("Salt/Humidity");
  if (envStress.brakeStress > 1.2) envDescriptions.push("Traffic/Hills");
  if (envStress.batteryStress > 1.2) envDescriptions.push("Temp extremes");
  
  const envFactor = {
    name: "Environmental Stress",
    weight: 0.15,
    value: Math.min(1, envValue),
    contribution: 0,
    description: envDescriptions.length > 0 ? envDescriptions.join(", ") : "Normal conditions",
  };
  envFactor.contribution = envFactor.weight * envFactor.value;
  factors.push(envFactor);
  
  // Add environment-based part recommendations
  if (envStress.corrosionRisk > 1.2) {
    recommendedParts.push("PM-20", "BH-99"); // Brake fluid, hydraulic hose
  }
  if (envStress.brakeStress > 1.3) {
    recommendedParts.push("BRF-1478", "BRF-1934", "BRR-234"); // Brake pads, rotors
  }
  if (envStress.batteryStress > 1.2) {
    recommendedParts.push("BAGM-48H6-800");
  }
  if (envStress.engineStress > 1.2) {
    recommendedParts.push("FL-500S", "XO-5W30-Q1SP", "VC-13DL-G");
  }
  
  // === FACTOR 6: Weather Stress (5% weight) ===
  if (weather) {
    const weatherStress = calculateWeatherStressMultiplier(weather);
    const weatherFactor = {
      name: "Weather Stress",
      weight: 0.05,
      value: Math.min(1, (weatherStress.overall - 1) * 2),
      contribution: 0,
      description: weatherStress.reasons[0] || "Normal conditions",
    };
    weatherFactor.contribution = weatherFactor.weight * weatherFactor.value;
    factors.push(weatherFactor);
    
    // Add weather-based part recommendations
    if (weatherStress.brakes > 1.1) recommendedParts.push("BRF-1478", "PM-20");
    if (weatherStress.wipers > 1.1) recommendedParts.push("WW-2201-PF", "ZC-32-B2");
    if (weatherStress.coolant > 1.1) recommendedParts.push("VC-13DL-G");
    if (weatherStress.battery > 1.1) recommendedParts.push("BAGM-48H6-800");
  }
  
  // === FACTOR 7: Ford Alerts (10% weight) ===
  if (vehicle.fordAlerts.length > 0) {
    const alertFactor = {
      name: "Active Alerts",
      weight: 0.10,
      value: Math.min(1, vehicle.fordAlerts.length * 0.4),
      contribution: 0,
      description: vehicle.fordAlerts.join(", "),
    };
    alertFactor.contribution = alertFactor.weight * alertFactor.value;
    factors.push(alertFactor);
    
    // Add alert-based part recommendations
    for (const alert of vehicle.fordAlerts) {
      if (alert.toLowerCase().includes("oil")) recommendedParts.push("XO-5W30-Q1SP", "FL-500S");
      if (alert.toLowerCase().includes("brake")) recommendedParts.push("BRF-1478", "BRF-1934");
      if (alert.toLowerCase().includes("air filter")) recommendedParts.push("FA-1900");
      if (alert.toLowerCase().includes("battery")) recommendedParts.push("BAGM-48H6-800");
      if (alert.toLowerCase().includes("coolant")) recommendedParts.push("VC-13DL-G");
      if (alert.toLowerCase().includes("dpf")) recommendedParts.push("FA-1900");
      if (alert.toLowerCase().includes("tire")) recommendedParts.push("TPMS-35");
      if (alert.toLowerCase().includes("spark")) recommendedParts.push("SP-589");
    }
  }
  
  // === FACTOR 8: Active NHTSA Recall (Bonus - adds up to 15 points) ===
  let recallBonus = 0;
  if (hasActiveRecall) {
    recallBonus = 15; // Adds 15 to priority score
    factors.push({
      name: "NHTSA Recall",
      weight: 0.15,
      value: 1.0,
      contribution: 0.15,
      description: "Active safety recall",
    });
  }
  
  // Calculate total priority score
  const totalContribution = factors.reduce((sum, f) => sum + f.contribution, 0);
  const priorityScore = Math.min(100, Math.round(totalContribution * 100) + recallBonus);
  
  // Determine priority level
  let priorityLevel: "critical" | "high" | "medium" | "low";
  if (priorityScore >= 70 || daysUntilService <= 0 || hasActiveRecall) priorityLevel = "critical";
  else if (priorityScore >= 50) priorityLevel = "high";
  else if (priorityScore >= 30) priorityLevel = "medium";
  else priorityLevel = "low";
  
  // Estimate recommended service date
  let recommendedDays: number;
  if (priorityLevel === "critical") recommendedDays = 0;
  else if (priorityLevel === "high") recommendedDays = 7;
  else if (priorityLevel === "medium") recommendedDays = 21;
  else recommendedDays = 30;
  
  const recommendedDate = new Date();
  recommendedDate.setDate(recommendedDate.getDate() + recommendedDays);
  
  return {
    vin: vehicle.vin,
    fleetId: vehicle.fleetId,
    model: vehicle.model,
    priorityScore,
    priorityLevel,
    factors,
    recommendedParts: [...new Set(recommendedParts)], // Dedupe
    estimatedServiceDate: recommendedDate.toISOString().split("T")[0],
    daysUntilRecommended: recommendedDays,
    hasActiveRecall,
  };
}

// Calculate priorities for entire fleet
export function calculateFleetPriorities(
  vehicles: FleetVehicle[],
  weather: WeatherData | null,
  environment: EnvironmentalFactors = sanDiegoEnvironment,
  recallMap: Map<string, number> = new Map()
): ServicePriority[] {
  return vehicles
    .map(v => calculateServicePriority(v, weather, environment, (recallMap.get(v.vin) || 0) > 0))
    .sort((a, b) => b.priorityScore - a.priorityScore);
}

// Filter vehicles by priority level
export function filterByPriority(
  priorities: ServicePriority[],
  level: "critical" | "high" | "medium" | "low" | "all"
): ServicePriority[] {
  if (level === "all") return priorities;
  return priorities.filter(p => p.priorityLevel === level);
}

// Filter vehicles by trip volume
export function filterByTripVolume(
  vehicles: FleetVehicle[],
  volume: "high" | "normal" | "low" | "all"
): FleetVehicle[] {
  if (volume === "all") return vehicles;
  return vehicles.filter(v => v.tripVolume === volume);
}

// Summary stats for fleet priorities
export function getPrioritySummary(priorities: ServicePriority[]) {
  return {
    total: priorities.length,
    critical: priorities.filter(p => p.priorityLevel === "critical").length,
    high: priorities.filter(p => p.priorityLevel === "high").length,
    medium: priorities.filter(p => p.priorityLevel === "medium").length,
    low: priorities.filter(p => p.priorityLevel === "low").length,
    avgScore: Math.round(priorities.reduce((sum, p) => sum + p.priorityScore, 0) / priorities.length),
    needingServiceNow: priorities.filter(p => p.daysUntilRecommended === 0).length,
    needingServiceThisWeek: priorities.filter(p => p.daysUntilRecommended <= 7).length,
    withRecalls: priorities.filter(p => p.hasActiveRecall).length,
  };
}
