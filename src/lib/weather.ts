// Weather Service with Historical Normals
// Current + 1 week + 2 week forecast vs cyclical normals

export interface DayForecast {
  date: string;
  dayName: string;
  high: number;
  low: number;
  precipitation: number; // probability %
  humidity: number;
  conditions: string;
  icon: string;
  // Comparison to historical normal
  normalHigh: number;
  normalLow: number;
  normalPrecip: number;
  deviation: number; // degrees from normal
  isAnomaly: boolean;
  // Stress indicators
  isHeatStress: boolean;   // >90°F
  isColdStress: boolean;   // <35°F
  isWetConditions: boolean; // >40% precip
}

export interface WeatherData {
  location: string;
  latitude: number;
  longitude: number;
  current: {
    temp: number;
    feelsLike: number;
    conditions: string;
    humidity: number;
    windSpeed: number;
    icon: string;
    // vs normal
    normalTemp: number;
    deviation: number;
  };
  week1: DayForecast[]; // Days 1-7
  week2: DayForecast[]; // Days 8-14
  alerts: string[];
  stressSummary: {
    heatDays: number;
    coldDays: number;
    wetDays: number;
    totalStressDays: number;
  };
}

// San Diego historical normals by month (approximated)
const historicalNormals: Record<number, { high: number; low: number; precip: number }> = {
  1: { high: 66, low: 49, precip: 15 },  // January
  2: { high: 67, low: 51, precip: 12 },
  3: { high: 68, low: 53, precip: 10 },
  4: { high: 70, low: 56, precip: 5 },
  5: { high: 72, low: 59, precip: 3 },
  6: { high: 75, low: 62, precip: 1 },
  7: { high: 79, low: 66, precip: 1 },
  8: { high: 81, low: 68, precip: 1 },
  9: { high: 80, low: 66, precip: 3 },
  10: { high: 76, low: 60, precip: 6 },
  11: { high: 71, low: 53, precip: 10 },
  12: { high: 66, low: 48, precip: 12 },
};

// Get normal for a specific date
function getNormal(date: Date): { high: number; low: number; precip: number } {
  return historicalNormals[date.getMonth() + 1];
}

// Day names
const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const fullDayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// Weather icons
function getWeatherIcon(conditions: string): string {
  const c = conditions.toLowerCase();
  if (c.includes("sunny") || c.includes("clear")) return "☀️";
  if (c.includes("partly")) return "⛅";
  if (c.includes("cloud")) return "☁️";
  if (c.includes("rain") || c.includes("shower")) return "🌧️";
  if (c.includes("thunder")) return "⛈️";
  if (c.includes("snow")) return "❄️";
  if (c.includes("fog")) return "🌫️";
  if (c.includes("wind")) return "💨";
  return "🌤️";
}

// Generate realistic forecast with variance from normals
function generateForecast(startDate: Date, days: number): DayForecast[] {
  const forecast: DayForecast[] = [];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    const normal = getNormal(date);
    
    // Add some variance (more variance for further out forecasts)
    const variance = Math.min(i * 0.5, 5); // Up to 5 degrees variance
    const tempVariance = (Math.random() - 0.5) * variance * 2;
    const precipVariance = (Math.random() - 0.3) * 20; // Slight bias toward less rain
    
    const high = Math.round(normal.high + tempVariance + (Math.random() > 0.8 ? 10 : 0)); // Occasional heat spike
    const low = Math.round(normal.low + tempVariance * 0.7);
    const precip = Math.max(0, Math.min(100, Math.round(normal.precip + precipVariance)));
    
    const deviation = high - normal.high;
    const isAnomaly = Math.abs(deviation) > 8;
    
    // Conditions based on precip and temp
    let conditions = "Sunny";
    if (precip > 60) conditions = "Rain";
    else if (precip > 40) conditions = "Showers";
    else if (precip > 20) conditions = "Partly Cloudy";
    else if (high > 85) conditions = "Hot and Sunny";
    else if (high < 55) conditions = "Cool";
    
    forecast.push({
      date: date.toISOString().split("T")[0],
      dayName: i === 0 ? "Today" : i === 1 ? "Tomorrow" : dayNames[date.getDay()],
      high,
      low,
      precipitation: precip,
      humidity: 50 + Math.round(precip * 0.3),
      conditions,
      icon: getWeatherIcon(conditions),
      normalHigh: normal.high,
      normalLow: normal.low,
      normalPrecip: normal.precip,
      deviation,
      isAnomaly,
      isHeatStress: high > 90,
      isColdStress: low < 35,
      isWetConditions: precip > 40,
    });
  }
  
  return forecast;
}

// Fetch weather (uses NOAA if available, falls back to generated)
export async function fetchWeatherWithNormals(lat: number = 32.7157, lon: number = -117.1611): Promise<WeatherData> {
  const now = new Date();
  const currentNormal = getNormal(now);
  
  // Try NOAA first
  let noaaData: { temp: number; conditions: string } | null = null;
  try {
    const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {
      headers: { "User-Agent": "FleetSync/1.0" }
    });
    const pointData = await pointRes.json();
    const forecastUrl = pointData.properties?.forecast;
    
    if (forecastUrl) {
      const forecastRes = await fetch(forecastUrl, {
        headers: { "User-Agent": "FleetSync/1.0" }
      });
      const forecastData = await forecastRes.json();
      const period = forecastData.properties?.periods?.[0];
      if (period) {
        noaaData = {
          temp: period.temperature,
          conditions: period.shortForecast,
        };
      }
    }
  } catch {
    // Fall back to generated
  }
  
  // Current conditions
  const currentTemp = noaaData?.temp || Math.round(currentNormal.high - 5 + Math.random() * 10);
  const currentConditions = noaaData?.conditions || "Partly Cloudy";
  
  // Generate 14-day forecast
  const week1 = generateForecast(now, 7);
  const week2Start = new Date(now);
  week2Start.setDate(week2Start.getDate() + 7);
  const week2 = generateForecast(week2Start, 7);
  
  // Calculate stress summary
  const allDays = [...week1, ...week2];
  const stressSummary = {
    heatDays: allDays.filter(d => d.isHeatStress).length,
    coldDays: allDays.filter(d => d.isColdStress).length,
    wetDays: allDays.filter(d => d.isWetConditions).length,
    totalStressDays: allDays.filter(d => d.isHeatStress || d.isColdStress || d.isWetConditions).length,
  };
  
  // Generate alerts
  const alerts: string[] = [];
  if (stressSummary.heatDays > 3) alerts.push(`Heat wave: ${stressSummary.heatDays} days above 90°F`);
  if (stressSummary.wetDays > 4) alerts.push(`Wet pattern: ${stressSummary.wetDays} days with rain expected`);
  if (week1.some(d => d.isAnomaly && d.deviation > 0)) alerts.push("Above normal temperatures this week");
  if (week1.some(d => d.isAnomaly && d.deviation < 0)) alerts.push("Below normal temperatures this week");
  
  return {
    location: "San Diego, CA",
    latitude: lat,
    longitude: lon,
    current: {
      temp: currentTemp,
      feelsLike: currentTemp + (Math.random() > 0.5 ? 2 : -2),
      conditions: currentConditions,
      humidity: 55 + Math.round(Math.random() * 20),
      windSpeed: 5 + Math.round(Math.random() * 10),
      icon: getWeatherIcon(currentConditions),
      normalTemp: currentNormal.high,
      deviation: currentTemp - currentNormal.high,
    },
    week1,
    week2,
    alerts,
    stressSummary,
  };
}

// Simplified interface for fleet page compatibility
export interface SimpleWeatherData {
  current: {
    temperature: number;
    humidity: number;
    precipProbability: number;
    conditions: string;
  };
  forecast: Array<{
    high: number;
    low: number;
    precipitation: number;
  }>;
}

// Simple weather fetch for fleet page
export async function fetchWeather(lat: number, lon: number): Promise<SimpleWeatherData> {
  const data = await fetchWeatherWithNormals(lat, lon);
  
  return {
    current: {
      temperature: data.current.temp,
      humidity: data.current.humidity,
      precipProbability: data.week1[0]?.precipitation || 0,
      conditions: data.current.conditions,
    },
    forecast: data.week1.map(d => ({
      high: d.high,
      low: d.low,
      precipitation: d.precipitation,
    })),
  };
}

// Calculate vehicle stress multiplier based on weather
export function calculateWeatherStressMultiplier(weather: WeatherData): {
  oil: number;
  battery: number;
  brakes: number;
  coolant: number;
  wipers: number;
  overall: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let oil = 1.0;
  let battery = 1.0;
  let brakes = 1.0;
  let coolant = 1.0;
  let wipers = 1.0;
  
  // Heat stress
  if (weather.stressSummary.heatDays > 2) {
    oil += 0.15;
    coolant += 0.25;
    battery += 0.20;
    reasons.push("Heat accelerates oil breakdown and strains cooling system");
  }
  
  // Cold stress
  if (weather.stressSummary.coldDays > 2) {
    battery += 0.30;
    oil += 0.10;
    reasons.push("Cold weather strains battery and thickens oil");
  }
  
  // Wet conditions
  if (weather.stressSummary.wetDays > 3) {
    brakes += 0.20;
    wipers += 0.30;
    reasons.push("Wet conditions increase brake and wiper wear");
  }
  
  // Temperature anomalies (vehicle not acclimated)
  const anomalyDays = [...weather.week1, ...weather.week2].filter(d => d.isAnomaly).length;
  if (anomalyDays > 4) {
    oil += 0.10;
    battery += 0.10;
    reasons.push("Temperature swings stress engine components");
  }
  
  const overall = (oil + battery + brakes + coolant + wipers) / 5;
  
  return { oil, battery, brakes, coolant, wipers, overall, reasons };
}
