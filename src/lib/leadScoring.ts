// Fleet Lead Scoring Engine
// Calculates Maintenance Severity Score (0-100) for vehicle fleets
// Based on environmental factors that cause vehicle wear

// ============================================================================
// TYPES
// ============================================================================

export interface ZipCodeData {
  zip: string;
  city: string;
  state: string;
  lat: number;
  lon: number;
  populationDensity: number;
}

export interface RiskFactors {
  corrosion: number;
  coastal: number;
  urbanWear: number;
  ruralRoad: number;
  terrain: number;
  heat: number;
  cold: number;
}

export type RiskBucket = 
  | "salt_belt"           // "Metric Ton of Salt" 
  | "transmission_cooker" // "Transmission Cooker"
  | "city_grinder"        // "City Grinder"
  | "thermal_stress"      // Heat/Cold extremes
  | "general";

export type LeadPriority = "hot" | "warm" | "cold";

export interface FleetLeadScore {
  zip: string;
  city: string;
  state: string;
  coordinates: { lat: number; lon: number };
  populationDensity: number;
  totalSeverityScore: number;
  riskFactors: RiskFactors;
  primaryRisk: string;
  secondaryRisks: string[];
  riskBucket: RiskBucket;
  bucketLabel: string;
  bucketPitch: string;
  recommendedUpsell: string[];
  leadPriority: LeadPriority;
}

// ============================================================================
// STATIC DATA: HEURISTIC LOOKUP TABLES
// ============================================================================

// Heuristic 1: Salt Belt States (Road salt corrosion risk)
const SALT_BELT_STATES = new Set([
  "CT", "DC", "DE", "IL", "IN", "IA", "KY", "ME", "MD", "MA", 
  "MI", "MN", "MO", "NH", "NJ", "NY", "OH", "PA", "RI", "VT", 
  "VA", "WV", "WI"
]);

// Coastal states with marine layer corrosion risk
const COASTAL_STATES = new Set([
  "CA", "OR", "WA", "TX", "LA", "MS", "AL", "FL", "GA", "SC", 
  "NC", "VA", "MD", "DE", "NJ", "NY", "CT", "RI", "MA", "NH", "ME"
]);

// Major coastal cities (lat, lon) for distance calculation
const COASTAL_REFERENCE_POINTS: [number, number][] = [
  [34.0522, -118.2437],  // Los Angeles
  [32.7157, -117.1611],  // San Diego
  [37.7749, -122.4194],  // San Francisco
  [47.6062, -122.3321],  // Seattle
  [25.7617, -80.1918],   // Miami
  [29.7604, -95.3698],   // Houston (Gulf)
  [40.7128, -74.0060],   // New York
  [42.3601, -71.0589],   // Boston
];

// Heuristic 3: Mountainous States with elevation variance
const MOUNTAINOUS_STATES = new Set([
  "CO", "WV", "UT", "NV", "ID", "MT", "WA", "OR", "CA", "AZ", "NM", "WY"
]);

// High-elevation cities (zip prefix -> avg elevation in feet)
const HIGH_ELEVATION_PREFIXES: Record<string, number> = {
  "800": 5280, "801": 5500, "802": 6000, "803": 7000, "804": 8000,
  "805": 5500, "840": 4300, "841": 4500, "871": 5300, "872": 6000,
  "891": 4500, "590": 3500, "591": 4000, "820": 6000, "821": 6500,
  "822": 7000, "831": 4500, "832": 5000, "833": 5500,
};

// State-level elevation defaults
const STATE_ELEVATIONS: Record<string, number> = {
  "CO": 5500, "UT": 4500, "WY": 5500, "NM": 5000, "NV": 4000,
  "AZ": 3500, "ID": 4000, "MT": 3500, "WA": 1500, "OR": 1500,
  "CA": 1000, "WV": 1500,
};

// Heuristic 4: Thermal zones based on latitude
const HEAT_RISK_LATITUDE = 35.0;
const COLD_RISK_LATITUDE = 42.0;

// Bucket metadata for marketing
const BUCKET_INFO: Record<RiskBucket, { label: string; pitch: string; icon: string }> = {
  salt_belt: {
    label: "Metric Ton of Salt",
    pitch: "Your trucks are dissolving. We predict a 40% higher rate of brake line and caliper failure than the national average.",
    icon: "rust",
  },
  transmission_cooker: {
    label: "Transmission Cooker",
    pitch: "Your grade-climbing is overheating your fluids. We predict early transmission failure.",
    icon: "thermometer",
  },
  city_grinder: {
    label: "City Grinder",
    pitch: "Your door hinges and starters are cycling 50x a day. Expect electrical fatigue.",
    icon: "stoplight",
  },
  thermal_stress: {
    label: "Thermal Stress Zone",
    pitch: "Extreme temperatures are degrading batteries and rubber components at accelerated rates.",
    icon: "temperature",
  },
  general: {
    label: "Standard Maintenance",
    pitch: "Your fleet operates in moderate conditions. Focus on scheduled maintenance.",
    icon: "wrench",
  },
};

// ============================================================================
// ZIP CODE DATABASE (Embedded for demo - real app would use API)
// ============================================================================

export const ZIP_DATABASE: Record<string, ZipCodeData> = {
  // Salt Belt Cities
  "60601": { zip: "60601", city: "Chicago", state: "IL", lat: 41.8819, lon: -87.6278, populationDensity: 12000 },
  "60602": { zip: "60602", city: "Chicago", state: "IL", lat: 41.8832, lon: -87.6287, populationDensity: 11500 },
  "10001": { zip: "10001", city: "New York", state: "NY", lat: 40.7484, lon: -73.9967, populationDensity: 27000 },
  "10002": { zip: "10002", city: "New York", state: "NY", lat: 40.7157, lon: -73.9863, populationDensity: 32000 },
  "48201": { zip: "48201", city: "Detroit", state: "MI", lat: 42.3314, lon: -83.0458, populationDensity: 5000 },
  "48202": { zip: "48202", city: "Detroit", state: "MI", lat: 42.3727, lon: -83.0824, populationDensity: 4500 },
  "02101": { zip: "02101", city: "Boston", state: "MA", lat: 42.3601, lon: -71.0589, populationDensity: 13000 },
  "44101": { zip: "44101", city: "Cleveland", state: "OH", lat: 41.4993, lon: -81.6944, populationDensity: 4800 },
  "15201": { zip: "15201", city: "Pittsburgh", state: "PA", lat: 40.4406, lon: -79.9959, populationDensity: 5500 },
  "14201": { zip: "14201", city: "Buffalo", state: "NY", lat: 42.8864, lon: -78.8784, populationDensity: 6500 },
  "55401": { zip: "55401", city: "Minneapolis", state: "MN", lat: 44.9778, lon: -93.2650, populationDensity: 7000 },
  "53201": { zip: "53201", city: "Milwaukee", state: "WI", lat: 43.0389, lon: -87.9065, populationDensity: 6000 },
  
  // Mountain/High Elevation
  "80202": { zip: "80202", city: "Denver", state: "CO", lat: 39.7541, lon: -104.9927, populationDensity: 4500 },
  "80203": { zip: "80203", city: "Denver", state: "CO", lat: 39.7312, lon: -104.9745, populationDensity: 5200 },
  "84101": { zip: "84101", city: "Salt Lake City", state: "UT", lat: 40.7608, lon: -111.8910, populationDensity: 3200 },
  "87101": { zip: "87101", city: "Albuquerque", state: "NM", lat: 35.0844, lon: -106.6504, populationDensity: 2800 },
  
  // Heat Risk (South)
  "33101": { zip: "33101", city: "Miami", state: "FL", lat: 25.7617, lon: -80.1918, populationDensity: 11000 },
  "33102": { zip: "33102", city: "Miami", state: "FL", lat: 25.7743, lon: -80.1937, populationDensity: 10500 },
  "85001": { zip: "85001", city: "Phoenix", state: "AZ", lat: 33.4484, lon: -112.0740, populationDensity: 3000 },
  "85002": { zip: "85002", city: "Phoenix", state: "AZ", lat: 33.4350, lon: -112.0766, populationDensity: 2800 },
  "75201": { zip: "75201", city: "Dallas", state: "TX", lat: 32.7767, lon: -96.7970, populationDensity: 3500 },
  "77001": { zip: "77001", city: "Houston", state: "TX", lat: 29.7604, lon: -95.3698, populationDensity: 3800 },
  "70112": { zip: "70112", city: "New Orleans", state: "LA", lat: 29.9511, lon: -90.0715, populationDensity: 4200 },
  
  // Coastal
  "90210": { zip: "90210", city: "Beverly Hills", state: "CA", lat: 34.0901, lon: -118.4065, populationDensity: 5200 },
  "92101": { zip: "92101", city: "San Diego", state: "CA", lat: 32.7157, lon: -117.1611, populationDensity: 8500 },
  "94102": { zip: "94102", city: "San Francisco", state: "CA", lat: 37.7749, lon: -122.4194, populationDensity: 17000 },
  "98101": { zip: "98101", city: "Seattle", state: "WA", lat: 47.6097, lon: -122.3331, populationDensity: 8500 },
  "97201": { zip: "97201", city: "Portland", state: "OR", lat: 45.5152, lon: -122.6784, populationDensity: 5400 },
  
  // Rural/Low Density
  "82001": { zip: "82001", city: "Cheyenne", state: "WY", lat: 41.1400, lon: -104.8202, populationDensity: 350 },
  "59601": { zip: "59601", city: "Helena", state: "MT", lat: 46.5884, lon: -112.0245, populationDensity: 280 },
  "58501": { zip: "58501", city: "Bismarck", state: "ND", lat: 46.8083, lon: -100.7837, populationDensity: 220 },
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const toRad = (deg: number) => deg * Math.PI / 180;
  
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  
  return R * c;
}

function getNearestCoastDistance(lat: number, lon: number): number {
  return Math.min(...COASTAL_REFERENCE_POINTS.map(([cLat, cLon]) => 
    haversineDistance(lat, lon, cLat, cLon)
  ));
}

function getElevationEstimate(zip: string, state: string): number {
  const prefix = zip.slice(0, 3);
  if (HIGH_ELEVATION_PREFIXES[prefix]) {
    return HIGH_ELEVATION_PREFIXES[prefix];
  }
  return STATE_ELEVATIONS[state] || 500;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

function calculateCorrosionScore(state: string, lat: number, lon: number): [number, number] {
  const saltScore = SALT_BELT_STATES.has(state) ? 30 : 0;
  
  let coastalScore = 0;
  if (COASTAL_STATES.has(state)) {
    const distanceToCoast = getNearestCoastDistance(lat, lon);
    if (distanceToCoast < 20) {
      coastalScore = 15;
    } else if (distanceToCoast < 50) {
      coastalScore = 8;
    }
  }
  
  return [saltScore, coastalScore];
}

function calculateDensityScore(popDensity: number): [number, number] {
  let urbanScore = 0;
  let ruralScore = 0;
  
  if (popDensity > 10000) {
    urbanScore = 30; // Dense urban
  } else if (popDensity > 5000) {
    urbanScore = 25; // Urban
  } else if (popDensity > 2000) {
    urbanScore = 15; // Suburban
  } else if (popDensity < 500) {
    ruralScore = 10; // Rural
  } else if (popDensity < 100) {
    ruralScore = 15; // Very rural
  }
  
  return [urbanScore, ruralScore];
}

function calculateTerrainScore(zip: string, state: string): number {
  if (!MOUNTAINOUS_STATES.has(state)) return 0;
  
  const elevation = getElevationEstimate(zip, state);
  
  if (elevation > 7000) return 25;
  if (elevation > 5000) return 20;
  if (elevation > 3000) return 12;
  if (elevation > 2000) return 8;
  
  return 0;
}

function calculateThermalScore(lat: number): [number, number] {
  let heatScore = 0;
  let coldScore = 0;
  
  if (lat < 30) {
    heatScore = 20;
  } else if (lat < HEAT_RISK_LATITUDE) {
    heatScore = 12;
  }
  
  if (lat > 45) {
    coldScore = 20;
  } else if (lat > COLD_RISK_LATITUDE) {
    coldScore = 12;
  }
  
  return [heatScore, coldScore];
}

function determineRiskBucket(factors: RiskFactors): RiskBucket {
  const corrosionTotal = factors.corrosion + factors.coastal;
  const urbanTotal = factors.urbanWear;
  const terrainTotal = factors.terrain;
  const thermalTotal = factors.heat + factors.cold;
  
  const maxScore = Math.max(corrosionTotal, urbanTotal, terrainTotal, thermalTotal);
  
  if (maxScore === corrosionTotal && corrosionTotal >= 25) return "salt_belt";
  if (maxScore === terrainTotal && terrainTotal >= 15) return "transmission_cooker";
  if (maxScore === urbanTotal && urbanTotal >= 20) return "city_grinder";
  if (maxScore === thermalTotal && thermalTotal >= 15) return "thermal_stress";
  
  return "general";
}

function getRecommendedUpsells(factors: RiskFactors): string[] {
  const upsells: string[] = [];
  
  if (factors.corrosion >= 25) {
    upsells.push("Undercoating", "Brake Line Inspection", "Caliper Check");
  }
  if (factors.coastal >= 10) {
    upsells.push("Rust Proofing", "Marine Grade Lubricants");
  }
  if (factors.urbanWear >= 20) {
    upsells.push("Brake Rotors", "Starter System Check", "Door Hinge Lube");
  }
  if (factors.ruralRoad >= 10) {
    upsells.push("Suspension Inspection", "Alignment Check");
  }
  if (factors.terrain >= 15) {
    upsells.push("Transmission Flush", "Coolant Check", "Brake Fluid Flush");
  }
  if (factors.heat >= 12) {
    upsells.push("Battery Load Test", "AC System Check");
  }
  if (factors.cold >= 12) {
    upsells.push("Block Heater", "Battery Replacement", "Alternator Test");
  }
  
  // Dedupe
  return [...new Set(upsells)].slice(0, 6);
}

function getPrimaryRisk(factors: RiskFactors): [string, string[]] {
  const risks: [number, string][] = [
    [factors.corrosion + factors.coastal, "Corrosion"],
    [factors.urbanWear, "Stop-and-Go Wear"],
    [factors.terrain, "Terrain Stress"],
    [factors.heat, "Heat Stress"],
    [factors.cold, "Cold Start Risk"],
    [factors.ruralRoad, "Rural Road Wear"],
  ];
  
  risks.sort((a, b) => b[0] - a[0]);
  
  const primary = risks[0][0] > 0 ? risks[0][1] : "Low Risk";
  const secondary = risks.slice(1, 3).filter(r => r[0] >= 5).map(r => r[1]);
  
  return [primary, secondary];
}

// ============================================================================
// MAIN SCORING FUNCTION
// ============================================================================

export function scoreZipCode(zip: string): FleetLeadScore | null {
  const zipData = ZIP_DATABASE[zip];
  if (!zipData) return null;
  
  const { city, state, lat, lon, populationDensity } = zipData;
  
  // Calculate heuristics
  const [corrosion, coastal] = calculateCorrosionScore(state, lat, lon);
  const [urban, rural] = calculateDensityScore(populationDensity);
  const terrain = calculateTerrainScore(zip, state);
  const [heat, cold] = calculateThermalScore(lat);
  
  const factors: RiskFactors = {
    corrosion,
    coastal,
    urbanWear: urban,
    ruralRoad: rural,
    terrain,
    heat,
    cold,
  };
  
  const total = Math.min(100, corrosion + coastal + urban + rural + terrain + heat + cold);
  const bucket = determineRiskBucket(factors);
  const [primary, secondary] = getPrimaryRisk(factors);
  const upsells = getRecommendedUpsells(factors);
  
  let priority: LeadPriority;
  if (total >= 60) priority = "hot";
  else if (total >= 35) priority = "warm";
  else priority = "cold";
  
  return {
    zip,
    city,
    state,
    coordinates: { lat, lon },
    populationDensity,
    totalSeverityScore: total,
    riskFactors: factors,
    primaryRisk: primary,
    secondaryRisks: secondary,
    riskBucket: bucket,
    bucketLabel: BUCKET_INFO[bucket].label,
    bucketPitch: BUCKET_INFO[bucket].pitch,
    recommendedUpsell: upsells,
    leadPriority: priority,
  };
}

export function scoreMultipleZips(zips: string[]): FleetLeadScore[] {
  return zips
    .map(z => scoreZipCode(z.trim()))
    .filter((s): s is FleetLeadScore => s !== null)
    .sort((a, b) => b.totalSeverityScore - a.totalSeverityScore);
}

export function getLeadsByBucket(leads: FleetLeadScore[]): Record<RiskBucket, FleetLeadScore[]> {
  const buckets: Record<RiskBucket, FleetLeadScore[]> = {
    salt_belt: [],
    transmission_cooker: [],
    city_grinder: [],
    thermal_stress: [],
    general: [],
  };
  
  for (const lead of leads) {
    buckets[lead.riskBucket].push(lead);
  }
  
  return buckets;
}

export function getLeadsByPriority(leads: FleetLeadScore[]): Record<LeadPriority, FleetLeadScore[]> {
  return {
    hot: leads.filter(l => l.leadPriority === "hot"),
    warm: leads.filter(l => l.leadPriority === "warm"),
    cold: leads.filter(l => l.leadPriority === "cold"),
  };
}

// Export bucket info for UI
export { BUCKET_INFO };
