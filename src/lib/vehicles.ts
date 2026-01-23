// Ford Vehicle Catalog for Selection
// Based on current Ford lineup

export interface VehicleModel {
  id: string;
  name: string;
  category: "truck" | "suv" | "commercial" | "electric";
  startingPrice: number;
  years: number[]; // Available model years
  hybrid?: boolean;
  electric?: boolean;
  imageUrl?: string; // Ford CDN or placeholder
}

// Ford vehicle lineup
export const fordVehicles: VehicleModel[] = [
  // Trucks
  { id: "maverick", name: "Maverick", category: "truck", startingPrice: 28145, years: [2022, 2023, 2024, 2025], hybrid: true },
  { id: "ranger", name: "Ranger", category: "truck", startingPrice: 33350, years: [2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { id: "f-150", name: "F-150", category: "truck", startingPrice: 37450, years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025], hybrid: true },
  { id: "f-150-lightning", name: "F-150 Lightning", category: "electric", startingPrice: 54780, years: [2022, 2023, 2024, 2025], electric: true },
  { id: "super-duty", name: "Super Duty", category: "truck", startingPrice: 45675, years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { id: "f-650", name: "F-650 / F-750", category: "commercial", startingPrice: 69995, years: [2020, 2021, 2022, 2023, 2024, 2025] },
  
  // SUVs
  { id: "escape", name: "Escape", category: "suv", startingPrice: 30350, years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025], hybrid: true },
  { id: "bronco-sport", name: "Bronco Sport", category: "suv", startingPrice: 31845, years: [2021, 2022, 2023, 2024, 2025] },
  { id: "bronco", name: "Bronco", category: "suv", startingPrice: 39995, years: [2021, 2022, 2023, 2024, 2025] },
  { id: "explorer", name: "Explorer", category: "suv", startingPrice: 38465, years: [2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { id: "mustang-mach-e", name: "Mustang Mach-E", category: "electric", startingPrice: 37995, years: [2021, 2022, 2023, 2024, 2025], electric: true },
  { id: "expedition", name: "Expedition", category: "suv", startingPrice: 62400, years: [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  
  // Commercial
  { id: "transit", name: "Transit", category: "commercial", startingPrice: 48400, years: [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
  { id: "transit-connect", name: "Transit Connect", category: "commercial", startingPrice: 32000, years: [2019, 2020, 2021, 2022, 2023] },
  { id: "e-transit", name: "E-Transit", category: "electric", startingPrice: 48150, years: [2022, 2023, 2024, 2025], electric: true },
  { id: "e-series", name: "E-Series", category: "commercial", startingPrice: 41330, years: [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025] },
];

// Group by category
export const vehiclesByCategory = {
  truck: fordVehicles.filter(v => v.category === "truck"),
  suv: fordVehicles.filter(v => v.category === "suv"),
  commercial: fordVehicles.filter(v => v.category === "commercial"),
  electric: fordVehicles.filter(v => v.category === "electric"),
};

// Get model by ID
export function getVehicleById(id: string): VehicleModel | undefined {
  return fordVehicles.find(v => v.id === id);
}

// Fleet entitlement pricing
export interface EntitlementPricing {
  customerId: string;
  finCode: string;
  tier: "bronze" | "silver" | "gold" | "platinum";
  discountPercent: number;
  preferredDealerId: string;
  preferredDealerName: string;
}

// Demo customer - logged in with FIN code
export const demoCustomer: EntitlementPricing = {
  customerId: "FLEET-4892",
  finCode: "FIN-SD-7721",
  tier: "gold",
  discountPercent: 15,
  preferredDealerId: "dealer-jerrys",
  preferredDealerName: "Jerry's Ford San Diego",
};

// Calculate entitlement price
export function calculateEntitlementPrice(listPrice: number, customer: EntitlementPricing): {
  listPrice: number;
  discountAmount: number;
  finalPrice: number;
  discountPercent: number;
} {
  const discountAmount = listPrice * (customer.discountPercent / 100);
  return {
    listPrice,
    discountAmount,
    finalPrice: listPrice - discountAmount,
    discountPercent: customer.discountPercent,
  };
}
