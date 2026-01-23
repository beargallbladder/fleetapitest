// Complete mock data for full API demo
// Every feature from the spec is represented

export interface Vehicle {
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string;
  engine: string;
  fleetId: string;
  mileage: number;
  nextService: string;
  preferredDealerId: string;
}

export interface Dealer {
  dealerId: string;
  name: string;
  address: string;
  city: string;
  zipCode: string;
  phone: string;
  distance: number;
  hours: string;
  rating: number;
  isPreferred?: boolean;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  partCount: number;
  searchTerm: string;
  subcategories?: Category[];
}

export interface Entitlement {
  tier: "fleet" | "retail" | "wholesale";
  discountPercent: number;
  loyaltyPoints: number;
  description: string;
}

// Dealers by region (for ZIP search)
export const dealers: Dealer[] = [
  { dealerId: "sd_ford_001", name: "Downtown Ford San Diego", address: "1234 Market St", city: "San Diego", zipCode: "92101", phone: "(619) 555-0101", distance: 0, hours: "Mon-Sat 8AM-6PM", rating: 4.8 },
  { dealerId: "sd_ford_002", name: "Kearny Mesa Ford", address: "5678 Convoy St", city: "San Diego", zipCode: "92111", phone: "(619) 555-0102", distance: 7.9, hours: "Mon-Sat 7AM-7PM", rating: 4.6 },
  { dealerId: "sd_ford_003", name: "El Cajon Ford", address: "910 Main St", city: "El Cajon", zipCode: "92020", phone: "(619) 555-0103", distance: 12.8, hours: "Mon-Sat 8AM-6PM", rating: 4.5 },
  { dealerId: "sd_ford_004", name: "National City Ford", address: "2468 Mile of Cars", city: "National City", zipCode: "91950", phone: "(619) 555-0104", distance: 4.4, hours: "Mon-Sat 8AM-8PM", rating: 4.7 },
  { dealerId: "sd_ford_005", name: "Mira Mesa Ford", address: "9876 Mira Mesa Blvd", city: "San Diego", zipCode: "92126", phone: "(858) 555-0105", distance: 13.8, hours: "Mon-Sat 8AM-6PM", rating: 4.4 },
  { dealerId: "la_ford_006", name: "Downtown LA Ford", address: "100 S Figueroa St", city: "Los Angeles", zipCode: "90015", phone: "(213) 555-0106", distance: 110.8, hours: "Mon-Sat 8AM-7PM", rating: 4.3 },
  { dealerId: "ir_ford_008", name: "Irvine Ford", address: "123 Auto Center Dr", city: "Irvine", zipCode: "92618", phone: "(949) 555-0108", distance: 77.1, hours: "Mon-Sat 8AM-6PM", rating: 4.6 },
];

// Get dealers by ZIP (simulated proximity search)
export function searchDealersByZip(zip: string): Dealer[] {
  // Return all dealers sorted by distance
  return [...dealers].sort((a, b) => a.distance - b.distance);
}

// Fleet vehicles
export const fleetVehicles: Vehicle[] = [
  { vin: "1FTFW1E50MFA12345", year: 2021, make: "Ford", model: "F-150", trim: "XLT", engine: "3.5L EcoBoost V6", fleetId: "F150-047", mileage: 74892, nextService: "Oil Change", preferredDealerId: "sd_ford_001" },
  { vin: "1FTBW2CM5MKA67890", year: 2021, make: "Ford", model: "Transit", trim: "250", engine: "3.5L EcoBoost V6", fleetId: "TRANSIT-012", mileage: 45120, nextService: "Brake Service", preferredDealerId: "sd_ford_002" },
  { vin: "1FT7W2BT3MED11111", year: 2021, make: "Ford", model: "F-250", trim: "Lariat", engine: "6.7L Power Stroke V8", fleetId: "F250-089", mileage: 62340, nextService: "Air Filter", preferredDealerId: "sd_ford_001" },
  { vin: "1FTBW3XG9MDA22222", year: 2021, make: "Ford", model: "E-350", trim: "Cutaway", engine: "7.3L V8", fleetId: "E350-023", mileage: 89100, nextService: "Spark Plugs", preferredDealerId: "sd_ford_003" },
];

// Category hierarchy with search terms
export const vehicleCategories: Category[] = [
  {
    id: "engine",
    name: "Engine",
    icon: "⚙️",
    partCount: 45,
    searchTerm: "oil",
    subcategories: [
      { id: "oil-service", name: "Oil & Service", icon: "🛢️", partCount: 15, searchTerm: "oil" },
      { id: "oil-filters", name: "Oil Filters", icon: "🔧", partCount: 8, searchTerm: "oil filter" },
      { id: "air-intake", name: "Air Intake", icon: "💨", partCount: 12, searchTerm: "air" },
      { id: "ignition", name: "Ignition System", icon: "⚡", partCount: 10, searchTerm: "spark" },
    ],
  },
  {
    id: "brakes",
    name: "Brakes",
    icon: "🔴",
    partCount: 28,
    searchTerm: "brake",
    subcategories: [
      { id: "brake-pads", name: "Brake Pads & Shoes", icon: "🔴", partCount: 12, searchTerm: "brake" },
      { id: "brake-rotors", name: "Rotors & Drums", icon: "⭕", partCount: 8, searchTerm: "brake" },
      { id: "brake-hardware", name: "Calipers & Hardware", icon: "🔧", partCount: 8, searchTerm: "brake" },
    ],
  },
  {
    id: "filters",
    name: "Filters & Fluids",
    icon: "🔄",
    partCount: 32,
    searchTerm: "filter",
    subcategories: [
      { id: "motor-oil", name: "Motor Oil", icon: "🛢️", partCount: 8, searchTerm: "oil" },
      { id: "oil-filters-main", name: "Oil Filters", icon: "🔧", partCount: 8, searchTerm: "oil filter" },
      { id: "air-filters", name: "Air Filters", icon: "💨", partCount: 6, searchTerm: "air" },
      { id: "cabin-filters", name: "Cabin Air Filters", icon: "🌬️", partCount: 6, searchTerm: "air" },
    ],
  },
  {
    id: "electrical",
    name: "Electrical",
    icon: "🔌",
    partCount: 56,
    searchTerm: "spark",
    subcategories: [
      { id: "spark-plugs", name: "Spark Plugs", icon: "⚡", partCount: 16, searchTerm: "spark" },
      { id: "ignition-coils", name: "Ignition Coils", icon: "🔥", partCount: 12, searchTerm: "spark" },
      { id: "batteries", name: "Batteries & Charging", icon: "🔋", partCount: 12, searchTerm: "oil" },
      { id: "sensors", name: "Sensors", icon: "📡", partCount: 16, searchTerm: "filter" },
    ],
  },
  {
    id: "cooling",
    name: "Cooling System",
    icon: "❄️",
    partCount: 24,
    searchTerm: "oil",
    subcategories: [
      { id: "coolant", name: "Coolant & Antifreeze", icon: "💧", partCount: 8, searchTerm: "oil" },
      { id: "radiators", name: "Radiators", icon: "🌡️", partCount: 8, searchTerm: "filter" },
      { id: "hoses", name: "Hoses & Belts", icon: "🔗", partCount: 8, searchTerm: "filter" },
    ],
  },
  {
    id: "maintenance-kits",
    name: "Maintenance Kits",
    icon: "🧰",
    partCount: 18,
    searchTerm: "oil",
    subcategories: [
      { id: "oil-change-kit", name: "Oil Change Kits", icon: "🛢️", partCount: 6, searchTerm: "oil" },
      { id: "brake-kit", name: "Brake Service Kits", icon: "🔴", partCount: 6, searchTerm: "brake" },
      { id: "tune-up", name: "Tune-Up Kits", icon: "⚡", partCount: 6, searchTerm: "spark" },
    ],
  },
];

// Quick actions
export const quickActions = [
  { id: "oil-change", name: "Oil Change", icon: "🛢️", searchTerm: "oil", description: "Oil + Filter" },
  { id: "brake-job", name: "Brake Job", icon: "🔴", searchTerm: "brake", description: "Pads + Rotors" },
  { id: "tune-up", name: "Tune-Up", icon: "⚡", searchTerm: "spark", description: "Plugs + Filters" },
  { id: "filters", name: "All Filters", icon: "🔄", searchTerm: "filter", description: "Oil + Air + Cabin" },
];

// Fleet entitlements
export const fleetEntitlement: Entitlement = {
  tier: "fleet",
  discountPercent: 18,
  loyaltyPoints: 500,
  description: "Fleet Volume Discount",
};

// Calculate pricing with context
export function calculatePricing(
  listPrice: number,
  dealerId: string,
  preferredDealerId: string | null,
  entitlement: Entitlement | null
): {
  listPrice: number;
  dealerPrice: number;
  entitlementDiscount: number;
  finalPrice: number;
  savings: number;
  savingsPercent: number;
  isPreferredDealer: boolean;
} {
  const isPreferred = dealerId === preferredDealerId;
  
  // Base dealer markup/discount (preferred dealers get 5% off)
  const dealerPrice = isPreferred ? listPrice * 0.95 : listPrice;
  
  // Entitlement discount (stacks with dealer discount)
  const entitlementDiscount = entitlement ? dealerPrice * (entitlement.discountPercent / 100) : 0;
  
  const finalPrice = dealerPrice - entitlementDiscount;
  const savings = listPrice - finalPrice;
  const savingsPercent = Math.round((savings / listPrice) * 100);
  
  return {
    listPrice,
    dealerPrice,
    entitlementDiscount,
    finalPrice,
    savings,
    savingsPercent,
    isPreferredDealer: isPreferred,
  };
}

// Decode VIN
export function decodeVin(vin: string): Vehicle | null {
  const found = fleetVehicles.find(v => v.vin === vin);
  if (found) return found;
  
  if (vin.length === 17 && vin.startsWith("1FT")) {
    return {
      vin,
      year: 2020 + Math.floor(Math.random() * 4),
      make: "Ford",
      model: vin.includes("W1E") ? "F-150" : vin.includes("BW2") ? "Transit" : "F-250",
      trim: "XL",
      engine: "3.5L EcoBoost V6",
      fleetId: `VIN-${vin.slice(-4)}`,
      mileage: Math.floor(Math.random() * 100000),
      nextService: "",
      preferredDealerId: "",
    };
  }
  return null;
}

// Year/Model options
export const yearOptions = Array.from({ length: 10 }, (_, i) => 2025 - i);
export const modelOptions = ["F-150", "F-250", "F-350", "Transit", "Transit Connect", "E-350", "Ranger", "Maverick", "Explorer", "Expedition"];
export const engineOptions: Record<string, string[]> = {
  "F-150": ["3.5L EcoBoost V6", "5.0L V8", "2.7L EcoBoost V6", "3.0L Power Stroke V6"],
  "F-250": ["6.7L Power Stroke V8", "7.3L V8"],
  "F-350": ["6.7L Power Stroke V8", "7.3L V8"],
  "Transit": ["3.5L EcoBoost V6", "3.5L V6"],
  "Transit Connect": ["2.0L I4"],
  "E-350": ["7.3L V8", "6.8L V10"],
  "Ranger": ["2.3L EcoBoost I4"],
  "Maverick": ["2.5L Hybrid", "2.0L EcoBoost I4"],
  "Explorer": ["3.0L EcoBoost V6", "2.3L EcoBoost I4"],
  "Expedition": ["3.5L EcoBoost V6"],
};
