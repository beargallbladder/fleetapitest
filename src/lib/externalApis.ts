// External API integrations - NHTSA + NOAA

// ============ NHTSA API ============
// Free, no API key required
// Docs: https://vpic.nhtsa.dot.gov/api/

export interface NHTSARecall {
  NHTSACampaignNumber: string;
  Manufacturer: string;
  Subject: string;
  Summary: string;
  Consequence: string;
  Remedy: string;
  ReportReceivedDate: string;
  Component: string;
  ModelYear: string;
  Make: string;
  Model: string;
}

export interface NHTSAComplaint {
  odiNumber: string;
  manufacturer: string;
  crash: boolean;
  fire: boolean;
  numberOfInjuries: number;
  numberOfDeaths: number;
  dateOfIncident: string;
  dateComplaintFiled: string;
  components: string;
  summary: string;
}

// Fetch recalls for Ford vehicles - REAL NHTSA API
export async function fetchFordRecalls(modelYear?: number, model?: string): Promise<NHTSARecall[]> {
  try {
    const year = modelYear || 2021;
    const modelName = model || "F-150";
    const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=Ford&model=${encodeURIComponent(modelName)}&modelYear=${year}`;
    
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("NHTSA API error:", error);
    return [];
  }
}

// Fetch recalls for multiple vehicles (fleet)
export async function fetchFleetRecalls(vehicles: { year: number; model: string }[]): Promise<NHTSARecall[]> {
  const allRecalls: NHTSARecall[] = [];
  const seen = new Set<string>();
  
  // Dedupe by year/model
  const unique = vehicles.filter(v => {
    const key = `${v.year}-${v.model}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  
  // Fetch in parallel (max 5 concurrent)
  const chunks = [];
  for (let i = 0; i < unique.length; i += 5) {
    chunks.push(unique.slice(i, i + 5));
  }
  
  for (const chunk of chunks) {
    const results = await Promise.all(
      chunk.map(v => fetchFordRecalls(v.year, v.model))
    );
    for (const recalls of results) {
      for (const recall of recalls) {
        // Dedupe by campaign number
        if (!allRecalls.some(r => r.NHTSACampaignNumber === recall.NHTSACampaignNumber)) {
          allRecalls.push(recall);
        }
      }
    }
  }
  
  return allRecalls;
}

// Fetch complaints for Ford vehicles
export async function fetchFordComplaints(modelYear?: number, model?: string): Promise<NHTSAComplaint[]> {
  try {
    const year = modelYear || 2024;
    const url = `https://api.nhtsa.gov/complaints/complaintsByVehicle?make=Ford&model=${model || "F-150"}&modelYear=${year}`;
    
    const res = await fetch(url);
    const data = await res.json();
    return data.results || [];
  } catch (error) {
    console.error("NHTSA API error:", error);
    return [];
  }
}

// ============ NOAA Weather API ============
// Free, no API key required
// Docs: https://www.weather.gov/documentation/services-web-api

export interface WeatherForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  precipitation: number; // probability %
  humidity: number;
  conditions: string;
  icon: string;
  isHeatStress: boolean;
  isColdStress: boolean;
  isWetConditions: boolean;
}

export interface WeatherData {
  location: string;
  current: {
    temp: number;
    conditions: string;
    humidity: number;
  };
  forecast: WeatherForecast[];
  alerts: string[];
}

// Weather.gov requires a 2-step process: get gridpoint, then get forecast
export async function fetchWeather(lat: number = 32.7157, lon: number = -117.1611): Promise<WeatherData | null> {
  try {
    // Step 1: Get gridpoint
    const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { "User-Agent": "FleetSync/1.0" }
    });
    const pointData = await pointRes.json();
    
    // Step 2: Get forecast
    const forecastUrl = pointData.properties?.forecast;
    if (!forecastUrl) throw new Error("No forecast URL");
    
    const forecastRes = await fetch(forecastUrl, {
      headers: { "User-Agent": "FleetSync/1.0" }
    });
    const forecastData = await forecastRes.json();
    
    const periods = forecastData.properties?.periods || [];
    
    // Parse into our format
    const forecast: WeatherForecast[] = [];
    const dayPeriods = periods.filter((p: { isDaytime: boolean }) => p.isDaytime).slice(0, 7);
    
    for (const period of dayPeriods) {
      const temp = period.temperature;
      const precip = period.probabilityOfPrecipitation?.value || 0;
      
      forecast.push({
        date: period.startTime.split("T")[0],
        dayName: period.name,
        high: temp,
        low: temp - 15, // Estimate
        precipitation: precip,
        humidity: 50, // Estimate
        conditions: period.shortForecast,
        icon: getWeatherIcon(period.shortForecast),
        isHeatStress: temp > 90,
        isColdStress: temp < 35,
        isWetConditions: precip > 40 || period.shortForecast.toLowerCase().includes("rain"),
      });
    }

    return {
      location: pointData.properties?.relativeLocation?.properties?.city || "San Diego",
      current: {
        temp: periods[0]?.temperature || 72,
        conditions: periods[0]?.shortForecast || "Sunny",
        humidity: 50,
      },
      forecast,
      alerts: [],
    };
  } catch (error) {
    console.error("NOAA API error:", error);
    return null;
  }
}

function getWeatherIcon(conditions: string): string {
  const c = conditions.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "☀️";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("rain") || c.includes("shower")) return "🌧️";
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("fog")) return "🌫️";
  if (c.includes("wind")) return "💨";
  return "🌤️";
}

// ============ FLEET STRESS CALCULATIONS ============
// Based on weather, mileage, trip patterns

export interface StressFactors {
  oil: number;        // 0-100
  battery: number;    // 0-100
  brakes: number;     // 0-100
  sparkPlugs: number; // 0-100
  airFilter: number;  // 0-100
  overall: number;    // 0-100
  level: "high" | "medium" | "low";
  recommendations: string[];
}

export interface VehicleStress {
  vin: string;
  fleetId: string;
  tripVolume: "high" | "medium" | "low";
  stress: StressFactors;
}

// Calculate stress based on vehicle data + weather
export function calculateVehicleStress(
  vehicle: { vin: string; fleetId: string; mileage: number; model: string },
  weather: WeatherData | null,
  tripVolume: "high" | "medium" | "low" = "medium"
): VehicleStress {
  const recommendations: string[] = [];
  
  // Base stress from mileage
  const mileageStress = Math.min(100, (vehicle.mileage / 100000) * 50);
  
  // Trip volume multiplier
  const tripMultiplier = tripVolume === "high" ? 1.5 : tripVolume === "low" ? 0.7 : 1;
  
  // Weather modifiers
  let heatMod = 0;
  let coldMod = 0;
  let wetMod = 0;
  
  if (weather) {
    const hasHeat = weather.forecast.some(f => f.isHeatStress);
    const hasCold = weather.forecast.some(f => f.isColdStress);
    const hasWet = weather.forecast.some(f => f.isWetConditions);
    
    if (hasHeat) {
      heatMod = 20;
      recommendations.push("Heat stress expected - check coolant and battery");
    }
    if (hasCold) {
      coldMod = 15;
      recommendations.push("Cold weather - monitor battery and tire pressure");
    }
    if (hasWet) {
      wetMod = 10;
      recommendations.push("Wet conditions forecast - inspect brakes and wipers");
    }
  }
  
  // Calculate individual stress scores
  const oil = Math.min(100, (mileageStress * 1.2 + heatMod) * tripMultiplier);
  const battery = Math.min(100, (mileageStress * 0.8 + heatMod + coldMod) * tripMultiplier);
  const brakes = Math.min(100, (mileageStress + wetMod) * tripMultiplier);
  const sparkPlugs = Math.min(100, mileageStress * tripMultiplier);
  const airFilter = Math.min(100, (mileageStress * 0.9 + (heatMod * 0.5)) * tripMultiplier);
  
  const overall = (oil + battery + brakes + sparkPlugs + airFilter) / 5;
  
  // Add specific recommendations based on scores
  if (oil > 70) recommendations.push("Oil change recommended soon");
  if (battery > 70) recommendations.push("Battery test recommended");
  if (brakes > 70) recommendations.push("Brake inspection due");
  
  const level = overall > 60 ? "high" : overall > 35 ? "medium" : "low";
  
  return {
    vin: vehicle.vin,
    fleetId: vehicle.fleetId,
    tripVolume,
    stress: {
      oil,
      battery,
      brakes,
      sparkPlugs,
      airFilter,
      overall,
      level,
      recommendations,
    },
  };
}

// Mock trip volume data (would come from telematics in reality)
export function getMockTripVolume(fleetId: string): "high" | "medium" | "low" {
  const volumes: Record<string, "high" | "medium" | "low"> = {
    "F150-047": "high",
    "TRANSIT-012": "medium",
    "F250-089": "low",
    "E350-023": "high",
  };
  return volumes[fleetId] || "medium";
}
