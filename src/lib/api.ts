// NOTE: Do NOT call the upstream API directly from the browser (it would leak the API key).
// All parts API traffic should go through our internal proxy route:
// `GET /api/parts/search?keyword=...&zipCode=...`
const INTERNAL_API_BASE = "";

export interface Dealer {
  dealerId: string;
  name: string;
  distance: number;
  webPrice: number;
  stock: number;
}

export interface Part {
  partNumber: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  listPrice: number;
  dealers: Dealer[];
}

export interface SearchResponse {
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
