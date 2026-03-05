/** Common wear/tear parts for fleet bulk ordering. Used by Dashboard and Fleet governance flow. */
export const WEAR_PARTS = [
  { sku: "FL-500S", name: "Oil Filter", category: "filters" },
  { sku: "FA-1900", name: "Air Filter", category: "filters" },
  { sku: "FP-88", name: "Cabin Filter", category: "filters" },
  { sku: "BRF-1478", name: "Brake Pads (F)", category: "brakes" },
  { sku: "BRF-1934", name: "Brake Pads (R)", category: "brakes" },
  { sku: "SP-589", name: "Spark Plugs", category: "electrical" },
  { sku: "WW-2201-PF", name: "Wiper Blades", category: "wipers" },
  { sku: "BAGM-48H6-800", name: "Battery", category: "electrical" },
] as const;
