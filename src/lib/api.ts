// NOTE: Do NOT call the upstream API directly from the browser (it would leak the API key).
// All parts API traffic should go through our internal proxy route:
// `GET /api/parts/search?keyword=...&zipCode=...`
const INTERNAL_API_BASE = "";

export interface Dealer {
  dealerId: string;
  dealerName: string;
  zipCode: string;
  participationLevel: string;
  salesModel: string;
  distanceMiles: number;
  inventoryId: string;
  available: number;
  webPrice: number;
  msrp: number;
  pickupAvailable: boolean;
  leadTimeDays: number;
  isPreferred: boolean;
  actionType: string;
}

export interface Part {
  partNumber: string;
  description: string;
  longDescription: string;
  categoryId: string;
  subcategoryId: string;
  unitOfMeasure: string;
  listPrice: number;
  coreCharge: number;
  isWearAndTear: boolean;
  dealers: Dealer[];
  availability: {
    preferredDealerHasStock: boolean;
    dealersAvailable: number;
    minWebPrice: number;
    aggregatorActive: boolean;
  };
}

export interface SearchResponse {
  precisionLevel: string;
  pricingTier: string;
  totalResults: number;
  page: number;
  pageSize: number;
  parts: Part[];
}

export async function searchParts(
  keyword: string,
  zipCode: string,
  page = 1,
  pageSize = 10
): Promise<SearchResponse> {
  const params = new URLSearchParams({
    keyword,
    zipCode,
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(`${INTERNAL_API_BASE}/api/parts/search?${params}`, { cache: "no-store" });

  if (!res.ok) {
    let msg = "Failed to fetch parts";
    try {
      const data = await res.json();
      if (data?.error) msg = String(data.error);
    } catch {
      // ignore
    }
    throw new Error(msg);
  }

  return res.json();
}

export async function getPartByNumber(
  partNumber: string,
  zipCode: string
): Promise<Part | null> {
  const res = await searchParts(partNumber, zipCode, 1, 20);
  return res.parts.find((p) => p.partNumber === partNumber) || null;
}
