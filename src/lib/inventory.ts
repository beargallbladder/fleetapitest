// Real Ford Parts & Motorcraft Inventory + Aftermarket Alternatives
// Source: Ford Parts Screen Capture + Marketplace Data
// Extraction Date: 2026-01-22
import { dedupeStrings } from "./dedupe";

export interface Part {
  sku: string;
  name: string;
  brand: "Motorcraft" | "Ford" | "Ford Accessories" | "Duralast" | "Valucraft" | "STP" | "Bosch" | "ACDelco" | "Denso";
  price: number;
  type?: string;
  packaging?: string;
  application?: string;
  position?: string;
  series?: string;
  categoryId: string;
  subcategoryId?: string;
  searchTerms: string[];
  supplier: "ford" | "autozone" | "oreilly" | "napa" | "rockauto";
  isOEM: boolean;
}

export interface Subcategory {
  id: string;
  name: string;
  parts: Part[];
}

export interface Category {
  id: string;
  name: string;
  subcategories?: Subcategory[];
  parts?: Part[];
}

// ============ REAL INVENTORY ============

export const realInventory: Part[] = [
  // === FLUIDS, CHEMICALS & LUBRICANTS ===
  // Ford OEM
  { sku: "XO-5W30-Q1SP", name: "Engine Oil - SAE 5W-30 Synthetic Blend", brand: "Motorcraft", price: 9.79, type: "Engine Oil", categoryId: "fluids", subcategoryId: "oils", searchTerms: ["oil", "motor oil", "engine oil", "5w30", "synthetic"], supplier: "ford", isOEM: true },
  { sku: "XT-10-QLVC", name: "Automatic Transmission Fluid - MERCON LV", brand: "Motorcraft", price: 9.51, type: "Transmission Fluid", categoryId: "fluids", subcategoryId: "oils", searchTerms: ["transmission", "atf", "mercon", "trans fluid"], supplier: "ford", isOEM: true },
  { sku: "PM-20", name: "Brake Fluid - High Performance DOT 4", brand: "Motorcraft", price: 6.96, type: "Brake Fluid", categoryId: "fluids", subcategoryId: "oils", searchTerms: ["brake fluid", "dot 4", "hydraulic"], supplier: "ford", isOEM: true },
  { sku: "VC-13-G", name: "Engine Coolant / Antifreeze - Concentrated", brand: "Motorcraft", price: 20.94, type: "Coolant", categoryId: "fluids", subcategoryId: "coolant", searchTerms: ["coolant", "antifreeze", "radiator"], supplier: "ford", isOEM: true },
  { sku: "VC-13DL-G", name: "Engine Coolant / Antifreeze - Prediluted 50/50", brand: "Motorcraft", price: 16.79, type: "Coolant", categoryId: "fluids", subcategoryId: "coolant", searchTerms: ["coolant", "antifreeze", "50/50"], supplier: "ford", isOEM: true },
  { sku: "ZC-32-B2", name: "Windshield Washer Fluid Concentrate", brand: "Motorcraft", price: 8.70, type: "Washer Fluid", categoryId: "fluids", subcategoryId: "chemicals", searchTerms: ["washer", "windshield", "wiper fluid"], supplier: "ford", isOEM: true },
  
  // Aftermarket Fluids
  { sku: "AZ-5W30-SYN", name: "Full Synthetic Motor Oil 5W-30", brand: "STP", price: 7.49, type: "Engine Oil", categoryId: "fluids", subcategoryId: "oils", searchTerms: ["oil", "motor oil", "5w30", "synthetic", "full synthetic"], supplier: "autozone", isOEM: false },
  { sku: "AZ-DOT4-BF", name: "DOT 4 Brake Fluid 12oz", brand: "Duralast", price: 4.99, type: "Brake Fluid", categoryId: "fluids", subcategoryId: "oils", searchTerms: ["brake fluid", "dot 4"], supplier: "autozone", isOEM: false },
  { sku: "AZ-COOL-5050", name: "Universal Antifreeze 50/50 1 Gal", brand: "Duralast", price: 12.99, type: "Coolant", categoryId: "fluids", subcategoryId: "coolant", searchTerms: ["coolant", "antifreeze", "50/50"], supplier: "autozone", isOEM: false },

  // === FILTERS ===
  // Ford OEM
  { sku: "FL-500S", name: "Engine Oil Filter - Spin On", brand: "Motorcraft", price: 8.89, application: "Engine", categoryId: "filters", searchTerms: ["oil filter", "filter", "fl500", "spin on"], supplier: "ford", isOEM: true },
  { sku: "FL-2087", name: "Engine Oil Filter Kit - Element and Gasket", brand: "Motorcraft", price: 12.95, application: "Engine", categoryId: "filters", searchTerms: ["oil filter", "filter kit", "element", "gasket"], supplier: "ford", isOEM: true },
  { sku: "FA-1900", name: "Engine Air Filter Element", brand: "Motorcraft", price: 20.29, application: "Intake", categoryId: "filters", searchTerms: ["air filter", "intake", "engine air"], supplier: "ford", isOEM: true },
  { sku: "FP-88", name: "Cabin Air Filter - ODOR and POLLEN", brand: "Motorcraft", price: 27.68, application: "Cabin", categoryId: "filters", searchTerms: ["cabin filter", "air filter", "pollen", "odor", "hvac"], supplier: "ford", isOEM: true },
  { sku: "FT-180", name: "Transmission Filter Kit Screen", brand: "Motorcraft", price: 87.64, application: "Transmission", categoryId: "filters", searchTerms: ["transmission filter", "trans filter", "screen"], supplier: "ford", isOEM: true },
  
  // Aftermarket Filters
  { sku: "AZ-OF-F150", name: "Oil Filter - F-150 2015-2024", brand: "Duralast", price: 5.99, application: "Engine", categoryId: "filters", searchTerms: ["oil filter", "filter", "f150", "f-150"], supplier: "autozone", isOEM: false },
  { sku: "BOSCH-3323", name: "Premium Oil Filter", brand: "Bosch", price: 7.29, application: "Engine", categoryId: "filters", searchTerms: ["oil filter", "premium", "bosch"], supplier: "autozone", isOEM: false },
  { sku: "AZ-AF-F150", name: "Air Filter - F-150 2015-2024", brand: "Duralast", price: 14.99, application: "Intake", categoryId: "filters", searchTerms: ["air filter", "intake", "f150"], supplier: "autozone", isOEM: false },
  { sku: "AZ-CAB-CARBON", name: "Cabin Air Filter - Carbon", brand: "Duralast", price: 18.99, application: "Cabin", categoryId: "filters", searchTerms: ["cabin filter", "carbon", "odor"], supplier: "autozone", isOEM: false },

  // === BRAKES ===
  // Ford OEM
  { sku: "BRF-1478", name: "Disc Brake Pad Set - Front", brand: "Motorcraft", price: 102.62, position: "Front", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake pad", "front brake", "disc pad", "brake"], supplier: "ford", isOEM: true },
  { sku: "BRF-1934", name: "Disc Brake Pad Set - Rear", brand: "Motorcraft", price: 102.62, position: "Rear", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake pad", "rear brake", "disc pad", "brake"], supplier: "ford", isOEM: true },
  { sku: "BRR-234", name: "Disc Brake Rotor - Front", brand: "Motorcraft", price: 125.99, position: "Front", categoryId: "brakes", subcategoryId: "rotors", searchTerms: ["rotor", "brake rotor", "disc", "front rotor"], supplier: "ford", isOEM: true },
  { sku: "N/A-SHOE", name: "Parking Brake Shoe Kit", brand: "Ford", price: 121.80, position: "Rear", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake shoe", "parking brake", "emergency brake"], supplier: "ford", isOEM: true },
  { sku: "HUB-55", name: "Wheel Bearing and Hub Assembly", brand: "Ford", price: 478.80, position: "Front", categoryId: "brakes", subcategoryId: "rotors", searchTerms: ["wheel bearing", "hub", "bearing assembly"], supplier: "ford", isOEM: true },
  { sku: "BB-12", name: "Power Brake Booster", brand: "Ford", price: 1653.40, categoryId: "brakes", subcategoryId: "hydraulics", searchTerms: ["brake booster", "power brake", "booster"], supplier: "ford", isOEM: true },
  { sku: "BH-99", name: "Brake Hydraulic Hose", brand: "Ford", price: 41.48, categoryId: "brakes", subcategoryId: "hydraulics", searchTerms: ["brake hose", "hydraulic", "brake line"], supplier: "ford", isOEM: true },
  
  // Aftermarket Brakes
  { sku: "DL-GOLD-F150-F", name: "Gold Ceramic Brake Pads - Front", brand: "Duralast", price: 54.99, position: "Front", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake pad", "front", "ceramic", "gold"], supplier: "autozone", isOEM: false },
  { sku: "DL-GOLD-F150-R", name: "Gold Ceramic Brake Pads - Rear", brand: "Duralast", price: 49.99, position: "Rear", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake pad", "rear", "ceramic", "gold"], supplier: "autozone", isOEM: false },
  { sku: "DL-ROTOR-F150-F", name: "Brake Rotor - Front", brand: "Duralast", price: 62.99, position: "Front", categoryId: "brakes", subcategoryId: "rotors", searchTerms: ["rotor", "front", "brake rotor"], supplier: "autozone", isOEM: false },
  { sku: "VC-PADS-ECON", name: "Economy Brake Pads - Front", brand: "Valucraft", price: 29.99, position: "Front", categoryId: "brakes", subcategoryId: "pads", searchTerms: ["brake pad", "economy", "value"], supplier: "autozone", isOEM: false },

  // === ELECTRICAL ===
  // Ford OEM
  { sku: "BAGM-48H6-800", name: "Vehicle Battery - 80 AH, 800 Amp AGM", brand: "Motorcraft", price: 257.54, series: "Tested Tough Max", categoryId: "electrical", subcategoryId: "batteries", searchTerms: ["battery", "agm", "800 amp", "tested tough"], supplier: "ford", isOEM: true },
  { sku: "BXT-96R-590", name: "Vehicle Battery - 35 AH", brand: "Motorcraft", price: 212.74, categoryId: "electrical", subcategoryId: "batteries", searchTerms: ["battery", "35ah", "car battery"], supplier: "ford", isOEM: true },
  { sku: "SP-589", name: "Spark Plug", brand: "Motorcraft", price: 13.01, categoryId: "electrical", subcategoryId: "ignition", searchTerms: ["spark plug", "plug", "ignition", "spark"], supplier: "ford", isOEM: true },
  { sku: "DG-511", name: "Ignition Coil", brand: "Motorcraft", price: 98.62, categoryId: "electrical", subcategoryId: "ignition", searchTerms: ["coil", "ignition coil", "coil pack", "spark"], supplier: "ford", isOEM: true },
  { sku: "TPMS-35", name: "Tire Pressure Monitoring System (TPMS) Sensor", brand: "Motorcraft", price: 40.18, categoryId: "electrical", subcategoryId: "sensors", searchTerms: ["tpms", "tire pressure", "sensor", "monitoring"], supplier: "ford", isOEM: true },
  { sku: "DY-1200", name: "Oxygen Sensor (HEGO)", brand: "Motorcraft", price: 172.20, categoryId: "electrical", subcategoryId: "sensors", searchTerms: ["oxygen sensor", "o2 sensor", "hego", "exhaust"], supplier: "ford", isOEM: true },
  { sku: "PAM-10", name: "Parking Aid Sensor", brand: "Ford", price: 149.80, categoryId: "electrical", subcategoryId: "sensors", searchTerms: ["parking sensor", "backup sensor", "parking aid"], supplier: "ford", isOEM: true },
  { sku: "DU-88", name: "Camshaft Position Sensor", brand: "Motorcraft", price: 31.92, categoryId: "electrical", subcategoryId: "sensors", searchTerms: ["camshaft sensor", "cam sensor", "position sensor"], supplier: "ford", isOEM: true },
  { sku: "HL-LED-RH", name: "Headlight Assembly (LED) - Right", brand: "Ford", price: 1533.71, categoryId: "electrical", subcategoryId: "lighting", searchTerms: ["headlight", "led", "right", "assembly"], supplier: "ford", isOEM: true },
  { sku: "TL-LED-LH", name: "Tail Light Lamp - Left", brand: "Ford", price: 1059.24, categoryId: "electrical", subcategoryId: "lighting", searchTerms: ["tail light", "taillight", "rear light", "left"], supplier: "ford", isOEM: true },
  { sku: "FL-20", name: "Fog Light Lamp", brand: "Ford", price: 199.00, categoryId: "electrical", subcategoryId: "lighting", searchTerms: ["fog light", "fog lamp", "driving light"], supplier: "ford", isOEM: true },
  { sku: "DLS-40", name: "Door Lock Switch", brand: "Motorcraft", price: 61.46, categoryId: "electrical", subcategoryId: "switches", searchTerms: ["door lock", "switch", "lock switch"], supplier: "ford", isOEM: true },
  { sku: "SW-7700", name: "Tailgate Release Switch", brand: "Ford", price: 38.75, categoryId: "electrical", subcategoryId: "switches", searchTerms: ["tailgate", "release", "switch"], supplier: "ford", isOEM: true },
  { sku: "WPT-980", name: "Running Board Motor Connector Wire", brand: "Motorcraft", price: 106.02, categoryId: "electrical", subcategoryId: "switches", searchTerms: ["running board", "connector", "wire", "motor"], supplier: "ford", isOEM: true },
  
  // Aftermarket Electrical
  { sku: "DL-GOLD-65", name: "Gold Battery - Group 65", brand: "Duralast", price: 189.99, categoryId: "electrical", subcategoryId: "batteries", searchTerms: ["battery", "gold", "group 65"], supplier: "autozone", isOEM: false },
  { sku: "DL-PLAT-65", name: "Platinum AGM Battery - Group 65", brand: "Duralast", price: 239.99, categoryId: "electrical", subcategoryId: "batteries", searchTerms: ["battery", "agm", "platinum"], supplier: "autozone", isOEM: false },
  { sku: "DENSO-IT16", name: "Iridium TT Spark Plug", brand: "Denso", price: 8.99, categoryId: "electrical", subcategoryId: "ignition", searchTerms: ["spark plug", "iridium", "denso"], supplier: "autozone", isOEM: false },
  { sku: "BOSCH-4417", name: "Platinum+4 Spark Plug", brand: "Bosch", price: 9.49, categoryId: "electrical", subcategoryId: "ignition", searchTerms: ["spark plug", "platinum", "bosch"], supplier: "autozone", isOEM: false },
  { sku: "ACD-O2-41", name: "Oxygen Sensor - Upstream", brand: "ACDelco", price: 89.99, categoryId: "electrical", subcategoryId: "sensors", searchTerms: ["oxygen sensor", "o2", "upstream"], supplier: "autozone", isOEM: false },

  // === CLIMATE CONTROL ===
  { sku: "YCC-450", name: "Air Conditioning (A/C) Compressor", brand: "Motorcraft", price: 939.40, categoryId: "climate", searchTerms: ["ac compressor", "a/c", "air conditioning", "compressor"], supplier: "ford", isOEM: true },
  { sku: "YJ-770", name: "A/C Condenser", brand: "Motorcraft", price: 380.20, categoryId: "climate", searchTerms: ["condenser", "a/c", "ac condenser"], supplier: "ford", isOEM: true },
  { sku: "YH-1890", name: "HVAC Defrost Mode Door Actuator", brand: "Motorcraft", price: 33.32, categoryId: "climate", searchTerms: ["actuator", "defrost", "hvac", "blend door"], supplier: "ford", isOEM: true },
  { sku: "YH-1900", name: "HVAC Blend Door Actuator Motor", brand: "Motorcraft", price: 33.84, categoryId: "climate", searchTerms: ["blend door", "actuator", "hvac", "motor"], supplier: "ford", isOEM: true },
  { sku: "HT-202", name: "Heater Core", brand: "Motorcraft", price: 130.76, categoryId: "climate", searchTerms: ["heater core", "heater", "core", "heat"], supplier: "ford", isOEM: true },

  // === ENGINE ===
  { sku: "PW-550", name: "Water Pump", brand: "Motorcraft", price: 151.20, categoryId: "engine", searchTerms: ["water pump", "pump", "cooling"], supplier: "ford", isOEM: true },
  { sku: "RH-180", name: "Engine Coolant Thermostat Housing", brand: "Motorcraft", price: 64.39, categoryId: "engine", searchTerms: ["thermostat", "housing", "coolant"], supplier: "ford", isOEM: true },
  { sku: "JK6-1000", name: "Serpentine Belt - 5.0L", brand: "Motorcraft", price: 29.40, categoryId: "engine", searchTerms: ["belt", "serpentine", "drive belt", "5.0"], supplier: "ford", isOEM: true },
  { sku: "BT-120", name: "Accessory Drive Belt Tensioner", brand: "Motorcraft", price: 174.24, categoryId: "engine", searchTerms: ["tensioner", "belt tensioner", "drive"], supplier: "ford", isOEM: true },
  { sku: "KM-500", name: "Radiator Coolant Hose (Upper)", brand: "Motorcraft", price: 53.34, categoryId: "engine", searchTerms: ["hose", "radiator hose", "coolant hose", "upper"], supplier: "ford", isOEM: true },
  { sku: "RAD-100", name: "Radiator", brand: "Motorcraft", price: 362.91, categoryId: "engine", searchTerms: ["radiator", "cooling", "rad"], supplier: "ford", isOEM: true },
  { sku: "EV-200", name: "PCV Valve", brand: "Motorcraft", price: 9.44, categoryId: "engine", searchTerms: ["pcv", "valve", "crankcase"], supplier: "ford", isOEM: true },
  
  // Aftermarket Engine
  { sku: "GATES-K060923", name: "Serpentine Belt", brand: "Duralast", price: 22.99, categoryId: "engine", searchTerms: ["belt", "serpentine", "gates"], supplier: "autozone", isOEM: false },
  { sku: "DL-WP-F150", name: "Water Pump - F-150 5.0L", brand: "Duralast", price: 89.99, categoryId: "engine", searchTerms: ["water pump", "cooling", "f150"], supplier: "autozone", isOEM: false },

  // === WIPERS & WASHERS ===
  { sku: "WW-2201-PF", name: "Wiper Blade - 22\" (559 MM)", brand: "Motorcraft", price: 23.65, categoryId: "wipers", searchTerms: ["wiper", "wiper blade", "blade", "windshield wiper"], supplier: "ford", isOEM: true },
  { sku: "WA-100", name: "Windshield Wiper Arm - Right", brand: "Ford", price: 74.70, categoryId: "wipers", searchTerms: ["wiper arm", "arm", "windshield"], supplier: "ford", isOEM: true },
  { sku: "WG-300", name: "Windshield Washer Pump Motor", brand: "Ford", price: 48.70, categoryId: "wipers", searchTerms: ["washer pump", "pump", "washer motor"], supplier: "ford", isOEM: true },
  { sku: "WNS-50", name: "Windshield Washer Nozzle Spray", brand: "Ford", price: 18.74, categoryId: "wipers", searchTerms: ["nozzle", "spray", "washer nozzle"], supplier: "ford", isOEM: true },
  
  // Aftermarket Wipers
  { sku: "BOSCH-ICON-22", name: "ICON Wiper Blade 22\"", brand: "Bosch", price: 27.99, categoryId: "wipers", searchTerms: ["wiper", "icon", "bosch", "22"], supplier: "autozone", isOEM: false },
  { sku: "DL-WIPER-22", name: "Premium Wiper Blade 22\"", brand: "Duralast", price: 14.99, categoryId: "wipers", searchTerms: ["wiper", "blade", "22"], supplier: "autozone", isOEM: false },

  // === SUSPENSION & STEERING ===
  { sku: "ASH-24500", name: "Suspension Shock Absorber - Rear", brand: "Motorcraft", price: 154.00, position: "Rear", categoryId: "suspension", searchTerms: ["shock", "shock absorber", "rear shock", "suspension"], supplier: "ford", isOEM: true },
  { sku: "AST-180", name: "Suspension Strut - Front Right", brand: "Motorcraft", price: 313.60, position: "Front", categoryId: "suspension", searchTerms: ["strut", "front strut", "suspension strut"], supplier: "ford", isOEM: true },
  { sku: "CA-400", name: "Suspension Control Arm and Ball Joint - Front", brand: "Ford", price: 119.00, position: "Front", categoryId: "suspension", searchTerms: ["control arm", "ball joint", "suspension arm"], supplier: "ford", isOEM: true },
  { sku: "STG-500", name: "Rack and Pinion Gear Assembly", brand: "Ford", price: 1600.20, categoryId: "suspension", searchTerms: ["rack and pinion", "steering", "rack", "gear"], supplier: "ford", isOEM: true },
  { sku: "KNK-100", name: "Steering Knuckle - Left Front", brand: "Ford", price: 394.80, position: "Front", categoryId: "suspension", searchTerms: ["knuckle", "steering knuckle", "spindle"], supplier: "ford", isOEM: true },

  // === TRANSMISSION ===
  { sku: "TOS-90", name: "Automatic Transmission Oil Pan Gasket", brand: "Ford", price: 18.90, categoryId: "transmission", searchTerms: ["transmission", "pan gasket", "gasket", "oil pan"], supplier: "ford", isOEM: true },

  // === ACCESSORIES ===
  { sku: "HM-100", name: "Kit Floor Contour Mat - Front", brand: "Ford Accessories", price: 105.00, categoryId: "accessories", searchTerms: ["floor mat", "mat", "carpet", "interior"], supplier: "ford", isOEM: true },
];

// ============ CATEGORY TAXONOMY ============

export const categoryTaxonomy: Category[] = [
  { id: "fluids", name: "Fluids, Chemicals & Lubricants" },
  { id: "filters", name: "Filters" },
  { id: "brakes", name: "Brakes" },
  { id: "electrical", name: "Electrical" },
  { id: "climate", name: "Climate Control" },
  { id: "engine", name: "Engine" },
  { id: "wipers", name: "Wipers & Washers" },
  { id: "suspension", name: "Suspension & Steering" },
  { id: "transmission", name: "Transmission" },
  { id: "accessories", name: "Accessories" },
];

// ============ SUPPLIER INFO ============

export const suppliers = {
  ford: { name: "Ford Parts", tagline: "Powered by Ford", color: "#003478" },
  autozone: { name: "AutoZone", tagline: "Get in the Zone", color: "#D52B1E" },
  oreilly: { name: "O'Reilly Auto Parts", tagline: "O-O-O'Reilly", color: "#00843D" },
  napa: { name: "NAPA Auto Parts", tagline: "Know How", color: "#004B87" },
  rockauto: { name: "RockAuto", tagline: "All the Parts Your Car Will Ever Need", color: "#FF6600" },
};

// ============ SEARCH FUNCTIONS ============

export function searchInventory(query: string): Part[] {
  const q = query.toLowerCase();
  return realInventory.filter(p => 
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.searchTerms.some(t => t.includes(q))
  );
}

export function getPartBySku(sku: string): Part | undefined {
  return realInventory.find(p => p.sku.toLowerCase() === sku.toLowerCase());
}

export function getPartsByCategory(categoryId: string): Part[] {
  return realInventory.filter(p => p.categoryId === categoryId);
}

// Get OEM vs Aftermarket options for a part
export function getAlternatives(part: Part): Part[] {
  // Find parts in same category with similar search terms
  const searchTermSet = new Set(part.searchTerms);
  return realInventory.filter(p => 
    p.sku !== part.sku &&
    p.categoryId === part.categoryId &&
    p.searchTerms.some(t => searchTermSet.has(t))
  );
}

// ============ WEAR & TEAR FOCUS ============

export const wearAndTearSkus = [
  "XO-5W30-Q1SP", "FL-500S", "FA-1900", "FP-88", "BRF-1478", "BRF-1934",
  "BRR-234", "SP-589", "WW-2201-PF", "PM-20", "VC-13DL-G", "JK6-1000",
];

export const wearAndTearParts = realInventory.filter(p => wearAndTearSkus.includes(p.sku));

// ============ STATS ============

export const inventoryStats = {
  totalParts: realInventory.length,
  oemParts: realInventory.filter(p => p.isOEM).length,
  aftermarketParts: realInventory.filter(p => !p.isOEM).length,
  suppliers: dedupeStrings(realInventory.map(p => p.supplier)),
  brands: dedupeStrings(realInventory.map(p => p.brand)),
};
