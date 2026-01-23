// Model-Specific Inventory
// Fake but realistic data following the real Ford/Motorcraft schema
// Real SKUs where applicable, model-specific variants for others

import { Part, realInventory } from "./inventory";
import { FordModel, modelCategories } from "./fleet";
import { dedupeStrings } from "./dedupe";

// Model-specific part variations
// Uses real SKUs as base, with model-specific variants

interface ModelPart extends Omit<Part, "categoryId" | "subcategoryId" | "supplier" | "isOEM"> {
  compatibleModels: FordModel[];
  modelSpecific: boolean;
}

// Generate model-specific SKU variant
function modelSku(baseSku: string, model: FordModel): string {
  const modelCodes: Record<FordModel, string> = {
    "F-150": "F1",
    "F-250": "F2",
    "F-350": "F3",
    "Transit": "TR",
    "E-350": "E3",
    "Ranger": "RG",
    "Explorer": "EX",
    "Expedition": "ED",
    "Maverick": "MV",
  };
  return `${baseSku}-${modelCodes[model]}`;
}

// Model-specific inventory additions
// These extend the base inventory with model-specific parts

export const modelSpecificParts: Record<FordModel, ModelPart[]> = {
  // F-150 (already covered by base inventory, plus these)
  "F-150": [
    { sku: "FA-1900-F1", name: "Engine Air Filter Element - F-150 3.5L EcoBoost", brand: "Motorcraft", price: 22.49, application: "Intake", searchTerms: ["air filter", "f150", "ecoboost"], compatibleModels: ["F-150"], modelSpecific: true },
    { sku: "FL-500S-F1", name: "Engine Oil Filter - F-150 All Engines", brand: "Motorcraft", price: 8.89, application: "Engine", searchTerms: ["oil filter", "f150"], compatibleModels: ["F-150"], modelSpecific: false },
    { sku: "BRF-1501-F1", name: "Disc Brake Pad Set - F-150 Heavy Duty Front", brand: "Motorcraft", price: 118.99, position: "Front", searchTerms: ["brake pad", "f150", "heavy duty"], compatibleModels: ["F-150"], modelSpecific: true },
  ],

  // F-250 Super Duty
  "F-250": [
    { sku: "FL-2087-HD", name: "Engine Oil Filter Kit - 6.7L Power Stroke", brand: "Motorcraft", price: 18.95, application: "Engine", searchTerms: ["oil filter", "diesel", "power stroke", "f250"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "FA-1883-HD", name: "Engine Air Filter Element - 6.7L Power Stroke", brand: "Motorcraft", price: 32.99, application: "Intake", searchTerms: ["air filter", "diesel", "power stroke"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "FD-4625-HD", name: "Fuel Filter Kit - 6.7L Power Stroke", brand: "Motorcraft", price: 54.89, application: "Fuel System", searchTerms: ["fuel filter", "diesel", "power stroke"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "DEF-50-G", name: "Diesel Exhaust Fluid (DEF) - 2.5 Gallon", brand: "Motorcraft", price: 14.99, type: "Fluid", searchTerms: ["def", "diesel", "exhaust fluid", "urea"], compatibleModels: ["F-250", "F-350"], modelSpecific: false },
    { sku: "BRF-1655-HD", name: "Disc Brake Pad Set - Super Duty Front", brand: "Motorcraft", price: 142.99, position: "Front", searchTerms: ["brake pad", "super duty", "f250"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "BRR-890-HD", name: "Disc Brake Rotor - Super Duty Front", brand: "Motorcraft", price: 189.99, position: "Front", searchTerms: ["rotor", "super duty", "f250"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "BAGM-78DT-850", name: "Vehicle Battery - Diesel, 78 Group, 850 CCA", brand: "Motorcraft", price: 299.99, series: "Tested Tough Max", searchTerms: ["battery", "diesel", "super duty"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "SP-520-HD", name: "Glow Plug - 6.7L Power Stroke", brand: "Motorcraft", price: 28.49, searchTerms: ["glow plug", "diesel", "starting"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
  ],

  // F-350 (shares with F-250)
  "F-350": [
    { sku: "FL-2087-HD", name: "Engine Oil Filter Kit - 6.7L Power Stroke", brand: "Motorcraft", price: 18.95, application: "Engine", searchTerms: ["oil filter", "diesel", "power stroke", "f350"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
    { sku: "BRF-1700-DRW", name: "Disc Brake Pad Set - F-350 Dually Rear", brand: "Motorcraft", price: 168.99, position: "Rear", searchTerms: ["brake pad", "dually", "f350"], compatibleModels: ["F-350"], modelSpecific: true },
    { sku: "ASH-24800-HD", name: "Suspension Shock Absorber - Super Duty Rear", brand: "Motorcraft", price: 198.00, position: "Rear", searchTerms: ["shock", "super duty", "suspension"], compatibleModels: ["F-250", "F-350"], modelSpecific: true },
  ],

  // Transit
  "Transit": [
    { sku: "FA-1927-TR", name: "Engine Air Filter Element - Transit 3.5L", brand: "Motorcraft", price: 26.99, application: "Intake", searchTerms: ["air filter", "transit"], compatibleModels: ["Transit"], modelSpecific: true },
    { sku: "FL-500S-TR", name: "Engine Oil Filter - Transit All Engines", brand: "Motorcraft", price: 9.49, application: "Engine", searchTerms: ["oil filter", "transit"], compatibleModels: ["Transit"], modelSpecific: false },
    { sku: "BRF-1612-TR", name: "Disc Brake Pad Set - Transit Front", brand: "Motorcraft", price: 98.49, position: "Front", searchTerms: ["brake pad", "transit"], compatibleModels: ["Transit"], modelSpecific: true },
    { sku: "BRF-1613-TR", name: "Disc Brake Pad Set - Transit Rear", brand: "Motorcraft", price: 88.49, position: "Rear", searchTerms: ["brake pad", "transit", "rear"], compatibleModels: ["Transit"], modelSpecific: true },
    { sku: "FP-88-TR", name: "Cabin Air Filter - Transit", brand: "Motorcraft", price: 29.99, application: "Cabin", searchTerms: ["cabin filter", "transit", "hvac"], compatibleModels: ["Transit"], modelSpecific: false },
    { sku: "WW-2401-TR", name: "Wiper Blade - Transit 24\"", brand: "Motorcraft", price: 25.99, searchTerms: ["wiper", "transit"], compatibleModels: ["Transit"], modelSpecific: true },
    { sku: "BAGM-H7-760", name: "Vehicle Battery - Transit 760 CCA", brand: "Motorcraft", price: 245.00, series: "Tested Tough Max", searchTerms: ["battery", "transit"], compatibleModels: ["Transit"], modelSpecific: true },
    { sku: "SLD-100-TR", name: "Sliding Door Roller Assembly", brand: "Ford", price: 89.99, searchTerms: ["sliding door", "roller", "transit"], compatibleModels: ["Transit"], modelSpecific: true },
  ],

  // E-350
  "E-350": [
    { sku: "FA-1758-E", name: "Engine Air Filter Element - E-Series 7.3L", brand: "Motorcraft", price: 28.99, application: "Intake", searchTerms: ["air filter", "e-series", "e350"], compatibleModels: ["E-350"], modelSpecific: true },
    { sku: "FL-820S-E", name: "Engine Oil Filter - E-Series 7.3L", brand: "Motorcraft", price: 11.49, application: "Engine", searchTerms: ["oil filter", "e-series", "e350"], compatibleModels: ["E-350"], modelSpecific: true },
    { sku: "BRF-1510-E", name: "Disc Brake Pad Set - E-Series Front", brand: "Motorcraft", price: 112.99, position: "Front", searchTerms: ["brake pad", "e-series", "e350"], compatibleModels: ["E-350"], modelSpecific: true },
    { sku: "SP-479-E", name: "Spark Plug - E-Series 7.3L", brand: "Motorcraft", price: 8.99, searchTerms: ["spark plug", "e-series", "e350"], compatibleModels: ["E-350"], modelSpecific: true },
    { sku: "FT-155-E", name: "Transmission Filter Kit - E-Series", brand: "Motorcraft", price: 92.49, application: "Transmission", searchTerms: ["transmission filter", "e-series"], compatibleModels: ["E-350"], modelSpecific: true },
  ],

  // Ranger
  "Ranger": [
    { sku: "FA-1916-RG", name: "Engine Air Filter Element - Ranger 2.3L", brand: "Motorcraft", price: 24.49, application: "Intake", searchTerms: ["air filter", "ranger"], compatibleModels: ["Ranger"], modelSpecific: true },
    { sku: "FL-400S-RG", name: "Engine Oil Filter - Ranger 2.3L EcoBoost", brand: "Motorcraft", price: 9.99, application: "Engine", searchTerms: ["oil filter", "ranger", "ecoboost"], compatibleModels: ["Ranger"], modelSpecific: true },
    { sku: "BRF-1378-RG", name: "Disc Brake Pad Set - Ranger Front", brand: "Motorcraft", price: 89.99, position: "Front", searchTerms: ["brake pad", "ranger"], compatibleModels: ["Ranger"], modelSpecific: true },
    { sku: "BRF-1379-RG", name: "Disc Brake Pad Set - Ranger Rear", brand: "Motorcraft", price: 79.99, position: "Rear", searchTerms: ["brake pad", "ranger", "rear"], compatibleModels: ["Ranger"], modelSpecific: true },
    { sku: "FP-88-RG", name: "Cabin Air Filter - Ranger", brand: "Motorcraft", price: 25.49, application: "Cabin", searchTerms: ["cabin filter", "ranger"], compatibleModels: ["Ranger"], modelSpecific: false },
    { sku: "SP-547-RG", name: "Spark Plug - Ranger 2.3L EcoBoost", brand: "Motorcraft", price: 14.99, searchTerms: ["spark plug", "ranger"], compatibleModels: ["Ranger"], modelSpecific: true },
    { sku: "WW-1801-RG", name: "Wiper Blade - Ranger 18\"", brand: "Motorcraft", price: 21.99, searchTerms: ["wiper", "ranger"], compatibleModels: ["Ranger"], modelSpecific: true },
  ],

  // Explorer
  "Explorer": [
    { sku: "FA-1928-EX", name: "Engine Air Filter Element - Explorer", brand: "Motorcraft", price: 23.49, application: "Intake", searchTerms: ["air filter", "explorer"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "FL-500S-EX", name: "Engine Oil Filter - Explorer", brand: "Motorcraft", price: 9.29, application: "Engine", searchTerms: ["oil filter", "explorer"], compatibleModels: ["Explorer"], modelSpecific: false },
    { sku: "BRF-1522-EX", name: "Disc Brake Pad Set - Explorer Front", brand: "Motorcraft", price: 95.99, position: "Front", searchTerms: ["brake pad", "explorer"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "BRF-1523-EX", name: "Disc Brake Pad Set - Explorer Rear", brand: "Motorcraft", price: 85.99, position: "Rear", searchTerms: ["brake pad", "explorer", "rear"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "FP-79-EX", name: "Cabin Air Filter - Explorer", brand: "Motorcraft", price: 28.99, application: "Cabin", searchTerms: ["cabin filter", "explorer"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "SP-534-EX", name: "Spark Plug - Explorer 2.3L EcoBoost", brand: "Motorcraft", price: 12.99, searchTerms: ["spark plug", "explorer"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "SP-542-EX", name: "Spark Plug - Explorer 3.0L EcoBoost", brand: "Motorcraft", price: 15.99, searchTerms: ["spark plug", "explorer", "3.0"], compatibleModels: ["Explorer"], modelSpecific: true },
    { sku: "AST-195-EX", name: "Suspension Strut - Explorer Front", brand: "Motorcraft", price: 289.00, position: "Front", searchTerms: ["strut", "explorer", "suspension"], compatibleModels: ["Explorer"], modelSpecific: true },
  ],

  // Expedition
  "Expedition": [
    { sku: "FA-1929-ED", name: "Engine Air Filter Element - Expedition 3.5L", brand: "Motorcraft", price: 25.99, application: "Intake", searchTerms: ["air filter", "expedition"], compatibleModels: ["Expedition"], modelSpecific: true },
    { sku: "FL-500S-ED", name: "Engine Oil Filter - Expedition", brand: "Motorcraft", price: 9.49, application: "Engine", searchTerms: ["oil filter", "expedition"], compatibleModels: ["Expedition"], modelSpecific: false },
    { sku: "BRF-1600-ED", name: "Disc Brake Pad Set - Expedition Front", brand: "Motorcraft", price: 108.99, position: "Front", searchTerms: ["brake pad", "expedition"], compatibleModels: ["Expedition"], modelSpecific: true },
    { sku: "BRF-1601-ED", name: "Disc Brake Pad Set - Expedition Rear", brand: "Motorcraft", price: 98.99, position: "Rear", searchTerms: ["brake pad", "expedition", "rear"], compatibleModels: ["Expedition"], modelSpecific: true },
    { sku: "FP-88-ED", name: "Cabin Air Filter - Expedition", brand: "Motorcraft", price: 30.99, application: "Cabin", searchTerms: ["cabin filter", "expedition"], compatibleModels: ["Expedition"], modelSpecific: false },
    { sku: "BAGM-H8-850", name: "Vehicle Battery - Expedition 850 CCA", brand: "Motorcraft", price: 279.99, series: "Tested Tough Max", searchTerms: ["battery", "expedition"], compatibleModels: ["Expedition"], modelSpecific: true },
    { sku: "ASH-24600-ED", name: "Suspension Shock Absorber - Expedition Rear", brand: "Motorcraft", price: 168.00, position: "Rear", searchTerms: ["shock", "expedition", "suspension"], compatibleModels: ["Expedition"], modelSpecific: true },
    { sku: "YCC-475-ED", name: "A/C Compressor - Expedition", brand: "Motorcraft", price: 985.00, searchTerms: ["ac compressor", "expedition", "a/c"], compatibleModels: ["Expedition"], modelSpecific: true },
  ],

  // Maverick
  "Maverick": [
    { sku: "FA-1950-MV", name: "Engine Air Filter Element - Maverick", brand: "Motorcraft", price: 19.99, application: "Intake", searchTerms: ["air filter", "maverick"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "FL-400S-MV", name: "Engine Oil Filter - Maverick 2.0L EcoBoost", brand: "Motorcraft", price: 8.99, application: "Engine", searchTerms: ["oil filter", "maverick", "ecoboost"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "FL-910-MV", name: "Engine Oil Filter - Maverick 2.5L Hybrid", brand: "Motorcraft", price: 10.49, application: "Engine", searchTerms: ["oil filter", "maverick", "hybrid"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "BRF-1250-MV", name: "Disc Brake Pad Set - Maverick Front", brand: "Motorcraft", price: 74.99, position: "Front", searchTerms: ["brake pad", "maverick"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "BRF-1251-MV", name: "Disc Brake Pad Set - Maverick Rear", brand: "Motorcraft", price: 64.99, position: "Rear", searchTerms: ["brake pad", "maverick", "rear"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "FP-70-MV", name: "Cabin Air Filter - Maverick", brand: "Motorcraft", price: 24.49, application: "Cabin", searchTerms: ["cabin filter", "maverick"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "SP-520-MV", name: "Spark Plug - Maverick 2.0L EcoBoost", brand: "Motorcraft", price: 11.99, searchTerms: ["spark plug", "maverick"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "WW-2001-MV", name: "Wiper Blade - Maverick 20\"", brand: "Motorcraft", price: 22.99, searchTerms: ["wiper", "maverick"], compatibleModels: ["Maverick"], modelSpecific: true },
    { sku: "BAGM-H5-600", name: "Vehicle Battery - Maverick Hybrid", brand: "Motorcraft", price: 235.00, series: "Tested Tough Max", searchTerms: ["battery", "maverick", "hybrid"], compatibleModels: ["Maverick"], modelSpecific: true },
  ],
};

// Get parts compatible with a specific model
export function getPartsForModel(model: FordModel): Part[] {
  // Get universal parts from real inventory (fluids, chemicals, etc.)
  const universalParts = realInventory.filter(p => 
    p.categoryId === "fluids" || // All fluids work on all models
    p.type === "Washer Fluid" ||
    p.type === "Paint" ||
    p.name.includes("Wiper Blade") // Wiper blades by size, not model
  );
  
  // Get model-specific parts
  const specificParts: Part[] = (modelSpecificParts[model] || []).map(p => ({
    ...p,
    categoryId: getCategoryForPart(p),
    subcategoryId: getSubcategoryForPart(p),
    supplier: "ford",
    isOEM: p.brand === "Motorcraft" || p.brand === "Ford" || p.brand === "Ford Accessories",
  }));
  
  return [...specificParts, ...universalParts];
}

// Get wear and tear parts for a specific model
export function getWearAndTearForModel(model: FordModel): Part[] {
  const modelParts = getPartsForModel(model);
  
  // Filter to common wear items
  return modelParts.filter(p => 
    p.searchTerms.some(t => 
      ["oil filter", "air filter", "cabin filter", "brake pad", "wiper", "spark plug", "battery", "coolant", "motor oil"].includes(t)
    )
  );
}

// Helper to determine category
function getCategoryForPart(part: ModelPart): string {
  if (part.searchTerms.some(t => t.includes("filter"))) return "filters";
  if (part.searchTerms.some(t => t.includes("brake"))) return "brakes";
  if (part.searchTerms.some(t => t.includes("battery") || t.includes("spark") || t.includes("glow"))) return "electrical";
  if (part.searchTerms.some(t => t.includes("wiper"))) return "wipers";
  if (part.searchTerms.some(t => t.includes("shock") || t.includes("strut"))) return "suspension";
  if (part.searchTerms.some(t => t.includes("transmission"))) return "transmission";
  if (part.searchTerms.some(t => t.includes("a/c") || t.includes("compressor"))) return "climate";
  if (part.searchTerms.some(t => t.includes("def") || t.includes("fluid"))) return "fluids";
  return "engine";
}

// Helper to determine subcategory
function getSubcategoryForPart(part: ModelPart): string | undefined {
  if (part.searchTerms.some(t => t.includes("battery"))) return "batteries";
  if (part.searchTerms.some(t => t.includes("spark") || t.includes("glow"))) return "ignition";
  if (part.searchTerms.some(t => t.includes("brake pad") || t.includes("shoe"))) return "pads";
  if (part.searchTerms.some(t => t.includes("rotor"))) return "rotors";
  return undefined;
}

// Search across model-specific inventory
export function searchModelInventory(model: FordModel, query: string): Part[] {
  const modelParts = getPartsForModel(model);
  const q = query.toLowerCase();
  
  return modelParts.filter(p =>
    p.name.toLowerCase().includes(q) ||
    p.sku.toLowerCase().includes(q) ||
    p.searchTerms.some(t => t.includes(q))
  );
}

// Get inventory stats per model
export function getModelInventoryStats(model: FordModel) {
  const parts = getPartsForModel(model);
  const wearParts = getWearAndTearForModel(model);
  
  return {
    model,
    totalParts: parts.length,
    wearAndTearParts: wearParts.length,
    priceRange: {
      min: Math.min(...parts.map(p => p.price)),
      max: Math.max(...parts.map(p => p.price)),
    },
    categories: dedupeStrings(parts.map(p => p.categoryId)),
  };
}
