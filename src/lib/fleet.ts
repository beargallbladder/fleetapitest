// Fleet Management - Vehicles, Weather, Service Priority
// Expanded fleet with diverse Ford models

export interface FleetVehicle {
  vin: string;
  year: number;
  make: "Ford";
  model: string;
  trim: string;
  engine: string;
  fleetId: string;
  licensePlate: string;
  odometer: number;
  lastServiceDate: string;
  lastServiceType: string;
  nextServiceDue: string;
  nextServiceType: string;
  tripVolume: "low" | "normal" | "high";
  avgDailyMiles: number;
  assignedDriver?: string;
  department?: string;
  // Service health from Ford
  fordHealthScore: number; // 0-100
  fordAlerts: string[];
}

// Expanded fleet with diverse models
export const fleetVehicles: FleetVehicle[] = [
  // F-150s (Work trucks)
  { vin: "1FTFW1E50MFA12345", year: 2021, make: "Ford", model: "F-150", trim: "XLT", engine: "3.5L EcoBoost V6", fleetId: "F150-001", licensePlate: "7ABC123", odometer: 74892, lastServiceDate: "2025-11-15", lastServiceType: "Oil Change", nextServiceDue: "2026-02-15", nextServiceType: "Oil Change", tripVolume: "high", avgDailyMiles: 85, assignedDriver: "Mike R.", department: "Field Service", fordHealthScore: 72, fordAlerts: ["Oil life 15%"] },
  { vin: "1FTFW1E52MFA23456", year: 2022, make: "Ford", model: "F-150", trim: "Lariat", engine: "5.0L V8", fleetId: "F150-002", licensePlate: "7DEF456", odometer: 45230, lastServiceDate: "2025-12-01", lastServiceType: "Tire Rotation", nextServiceDue: "2026-03-01", nextServiceType: "Oil Change", tripVolume: "normal", avgDailyMiles: 45, assignedDriver: "Sarah K.", department: "Sales", fordHealthScore: 88, fordAlerts: [] },
  { vin: "1FTFW1E54MFA34567", year: 2020, make: "Ford", model: "F-150", trim: "XL", engine: "2.7L EcoBoost V6", fleetId: "F150-003", licensePlate: "7GHI789", odometer: 98450, lastServiceDate: "2025-10-20", lastServiceType: "Brake Service", nextServiceDue: "2026-01-20", nextServiceType: "Oil Change", tripVolume: "high", avgDailyMiles: 110, assignedDriver: "Tom B.", department: "Delivery", fordHealthScore: 65, fordAlerts: ["Brake pad wear", "Air filter due"] },
  
  // F-250s (Heavy duty)
  { vin: "1FT7W2BT3MED11111", year: 2021, make: "Ford", model: "F-250", trim: "Lariat", engine: "6.7L Power Stroke V8", fleetId: "F250-001", licensePlate: "8JKL012", odometer: 62340, lastServiceDate: "2025-11-01", lastServiceType: "DEF Refill", nextServiceDue: "2026-02-01", nextServiceType: "Oil Change", tripVolume: "high", avgDailyMiles: 95, assignedDriver: "Carlos M.", department: "Construction", fordHealthScore: 78, fordAlerts: ["DPF regeneration needed"] },
  { vin: "1FT7W2BT5MED22222", year: 2022, make: "Ford", model: "F-250", trim: "XLT", engine: "7.3L V8", fleetId: "F250-002", licensePlate: "8MNO345", odometer: 38900, lastServiceDate: "2025-12-10", lastServiceType: "Oil Change", nextServiceDue: "2026-03-10", nextServiceType: "Transmission Service", tripVolume: "normal", avgDailyMiles: 55, department: "Maintenance", fordHealthScore: 91, fordAlerts: [] },
  
  // Transits (Cargo/Passenger)
  { vin: "1FTBW2CM5MKA67890", year: 2021, make: "Ford", model: "Transit", trim: "250 Cargo", engine: "3.5L EcoBoost V6", fleetId: "TRANSIT-001", licensePlate: "9PQR678", odometer: 89100, lastServiceDate: "2025-10-15", lastServiceType: "Oil Change", nextServiceDue: "2026-01-15", nextServiceType: "Brake Service", tripVolume: "high", avgDailyMiles: 120, assignedDriver: "Linda P.", department: "Delivery", fordHealthScore: 58, fordAlerts: ["Brake pad wear critical", "Tire pressure low"] },
  { vin: "1FTBW2CM7MKA78901", year: 2022, make: "Ford", model: "Transit", trim: "350 Passenger", engine: "3.5L V6", fleetId: "TRANSIT-002", licensePlate: "9STU901", odometer: 52300, lastServiceDate: "2025-11-20", lastServiceType: "Tire Rotation", nextServiceDue: "2026-02-20", nextServiceType: "Oil Change", tripVolume: "normal", avgDailyMiles: 65, department: "Shuttle", fordHealthScore: 82, fordAlerts: [] },
  { vin: "1FTBW2CM9MKA89012", year: 2020, make: "Ford", model: "Transit", trim: "150 Cargo", engine: "3.5L V6", fleetId: "TRANSIT-003", licensePlate: "9VWX234", odometer: 112450, lastServiceDate: "2025-09-01", lastServiceType: "Major Service", nextServiceDue: "2026-01-01", nextServiceType: "Oil Change", tripVolume: "high", avgDailyMiles: 135, assignedDriver: "Ray S.", department: "Express", fordHealthScore: 45, fordAlerts: ["Oil life 5%", "Coolant level low", "Battery weak"] },
  
  // E-Series (Box trucks)
  { vin: "1FTBW3XG9MDA22222", year: 2021, make: "Ford", model: "E-350", trim: "Cutaway", engine: "7.3L V8", fleetId: "E350-001", licensePlate: "2YZA567", odometer: 67800, lastServiceDate: "2025-11-05", lastServiceType: "Oil Change", nextServiceDue: "2026-02-05", nextServiceType: "Transmission Service", tripVolume: "normal", avgDailyMiles: 75, department: "Moving", fordHealthScore: 76, fordAlerts: ["Spark plugs due"] },
  
  // Rangers (Compact trucks)
  { vin: "1FTER4FH2MLA33333", year: 2022, make: "Ford", model: "Ranger", trim: "Lariat", engine: "2.3L EcoBoost I4", fleetId: "RANGER-001", licensePlate: "3BCD890", odometer: 28900, lastServiceDate: "2025-12-15", lastServiceType: "Oil Change", nextServiceDue: "2026-03-15", nextServiceType: "Oil Change", tripVolume: "low", avgDailyMiles: 25, assignedDriver: "Amy L.", department: "Admin", fordHealthScore: 95, fordAlerts: [] },
  { vin: "1FTER4FH4MLA44444", year: 2023, make: "Ford", model: "Ranger", trim: "XLT", engine: "2.3L EcoBoost I4", fleetId: "RANGER-002", licensePlate: "3EFG123", odometer: 15200, lastServiceDate: "2025-12-20", lastServiceType: "First Service", nextServiceDue: "2026-06-20", nextServiceType: "Oil Change", tripVolume: "low", avgDailyMiles: 20, department: "Executive", fordHealthScore: 98, fordAlerts: [] },
  
  // Explorers (SUVs)
  { vin: "1FM5K8GC5MGA55555", year: 2021, make: "Ford", model: "Explorer", trim: "XLT", engine: "2.3L EcoBoost I4", fleetId: "EXPLORER-001", licensePlate: "4HIJ456", odometer: 52100, lastServiceDate: "2025-11-25", lastServiceType: "Brake Service", nextServiceDue: "2026-02-25", nextServiceType: "Oil Change", tripVolume: "normal", avgDailyMiles: 55, assignedDriver: "David W.", department: "Management", fordHealthScore: 84, fordAlerts: [] },
  { vin: "1FM5K8GC7MGA66666", year: 2022, make: "Ford", model: "Explorer", trim: "Limited", engine: "3.0L EcoBoost V6", fleetId: "EXPLORER-002", licensePlate: "4KLM789", odometer: 38700, lastServiceDate: "2025-12-05", lastServiceType: "Oil Change", nextServiceDue: "2026-03-05", nextServiceType: "Tire Rotation", tripVolume: "normal", avgDailyMiles: 45, assignedDriver: "Jennifer H.", department: "Executive", fordHealthScore: 90, fordAlerts: [] },
  
  // Expeditions (Full-size SUVs)
  { vin: "1FMJU1JT3MEA77777", year: 2021, make: "Ford", model: "Expedition", trim: "XLT", engine: "3.5L EcoBoost V6", fleetId: "EXPEDITION-001", licensePlate: "5NOP012", odometer: 71200, lastServiceDate: "2025-10-30", lastServiceType: "Oil Change", nextServiceDue: "2026-01-30", nextServiceType: "Brake Service", tripVolume: "high", avgDailyMiles: 90, department: "VIP Transport", fordHealthScore: 70, fordAlerts: ["Brake pad wear"] },
  
  // Mavericks (Compact hybrid)
  { vin: "3FTTW8E31NRA88888", year: 2023, make: "Ford", model: "Maverick", trim: "XLT", engine: "2.5L Hybrid", fleetId: "MAVERICK-001", licensePlate: "6QRS345", odometer: 18500, lastServiceDate: "2025-12-01", lastServiceType: "Oil Change", nextServiceDue: "2026-06-01", nextServiceType: "Oil Change", tripVolume: "normal", avgDailyMiles: 35, assignedDriver: "Chris T.", department: "Sales", fordHealthScore: 96, fordAlerts: [] },
  { vin: "3FTTW8E33NRA99999", year: 2024, make: "Ford", model: "Maverick", trim: "Lariat", engine: "2.0L EcoBoost I4", fleetId: "MAVERICK-002", licensePlate: "6TUV678", odometer: 8200, lastServiceDate: "2026-01-10", lastServiceType: "First Service", nextServiceDue: "2026-07-10", nextServiceType: "Oil Change", tripVolume: "low", avgDailyMiles: 22, department: "Admin", fordHealthScore: 99, fordAlerts: [] },
];

// Model categories for inventory mapping
export type FordModel = "F-150" | "F-250" | "F-350" | "Transit" | "E-350" | "Ranger" | "Explorer" | "Expedition" | "Maverick";

export const modelCategories: Record<FordModel, {
  type: "truck" | "van" | "suv" | "compact";
  engineTypes: string[];
  commonParts: string[]; // SKU prefixes that apply
}> = {
  "F-150": { type: "truck", engineTypes: ["3.5L EcoBoost V6", "5.0L V8", "2.7L EcoBoost V6"], commonParts: ["FL-500S", "FA-1900", "BRF", "SP-589", "WW"] },
  "F-250": { type: "truck", engineTypes: ["6.7L Power Stroke V8", "7.3L V8"], commonParts: ["FL-2087", "FA-1900", "BRF", "FT-180", "WW"] },
  "F-350": { type: "truck", engineTypes: ["6.7L Power Stroke V8", "7.3L V8"], commonParts: ["FL-2087", "FA-1900", "BRF", "FT-180", "WW"] },
  "Transit": { type: "van", engineTypes: ["3.5L EcoBoost V6", "3.5L V6"], commonParts: ["FL-500S", "FA-1900", "BRF", "FP-88", "WW"] },
  "E-350": { type: "van", engineTypes: ["7.3L V8", "6.8L V10"], commonParts: ["FL-2087", "FA-1900", "BRF", "SP-589", "WW"] },
  "Ranger": { type: "compact", engineTypes: ["2.3L EcoBoost I4"], commonParts: ["FL-500S", "FA-1900", "BRF-1478", "SP-589", "WW"] },
  "Explorer": { type: "suv", engineTypes: ["2.3L EcoBoost I4", "3.0L EcoBoost V6"], commonParts: ["FL-500S", "FA-1900", "BRF", "FP-88", "WW"] },
  "Expedition": { type: "suv", engineTypes: ["3.5L EcoBoost V6"], commonParts: ["FL-500S", "FA-1900", "BRF", "FP-88", "WW", "ASH"] },
  "Maverick": { type: "compact", engineTypes: ["2.5L Hybrid", "2.0L EcoBoost I4"], commonParts: ["FL-500S", "FA-1900", "BRF-1478", "FP-88", "WW"] },
};

// Get fleet by model
export function getFleetByModel(model: string): FleetVehicle[] {
  return fleetVehicles.filter(v => v.model === model);
}

// Get fleet statistics
export function getFleetStats() {
  const models = [...new Set(fleetVehicles.map(v => v.model))];
  const totalMiles = fleetVehicles.reduce((sum, v) => sum + v.odometer, 0);
  const avgHealth = fleetVehicles.reduce((sum, v) => sum + v.fordHealthScore, 0) / fleetVehicles.length;
  const alertCount = fleetVehicles.reduce((sum, v) => sum + v.fordAlerts.length, 0);
  
  return {
    totalVehicles: fleetVehicles.length,
    models,
    totalMiles,
    avgHealth: Math.round(avgHealth),
    vehiclesWithAlerts: fleetVehicles.filter(v => v.fordAlerts.length > 0).length,
    totalAlerts: alertCount,
    byTripVolume: {
      high: fleetVehicles.filter(v => v.tripVolume === "high").length,
      normal: fleetVehicles.filter(v => v.tripVolume === "normal").length,
      low: fleetVehicles.filter(v => v.tripVolume === "low").length,
    },
  };
}
