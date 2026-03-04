import { categoryTaxonomy, realInventory } from "@/lib/inventory";
import { dealers as mockDealers } from "@/lib/mockData";

export type MockSearchPart = {
  partNumber: string;
  name: string;
  brand: string;
  description: string;
  category: string;
  subcategory: string;
  imageUrl: string;
  listPrice: number;
  dealers: Array<{
    dealerId: string;
    name: string;
    distance: number;
    webPrice: number;
    stock: number;
  }>;
};

export type MockSearchResponse = {
  totalResults: number;
  page: number;
  pageSize: number;
  parts: MockSearchPart[];
};

export type MockCatalogResponse = {
  source: "mock";
  categories: Array<{
    id: string;
    name: string;
    partCount: number;
    subcategories?: Array<{ id: string; name: string; partCount: number }>;
  }>;
};

export type JerichoMode = "mock" | "live";

export function jerichoMode(): JerichoMode {
  // Default to mock so demos never depend on live availability.
  return (process.env.JERICHO_MODE as JerichoMode) || "mock";
}

export function normalizePartNumber(s: string) {
  return String(s || "").replace(/[^A-Za-z0-9]/g, "").toUpperCase();
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

function makeDealersForPart(partNumber: string, listPrice: number) {
  return mockDealers.slice(0, 6).map((d) => {
    const h = hash(`${partNumber}-${d.dealerId}`);
    const discount = 0.96 + (h % 9) / 100; // 0.96..1.04 deterministic
    const webPrice = Math.round(listPrice * discount * 100) / 100;
    const stock = 1 + (hash(`${d.dealerId}-${partNumber}`) % 20);
    return {
      dealerId: d.dealerId,
      name: d.name,
      distance: d.distance,
      webPrice,
      stock,
    };
  });
}

export function searchMockParts(
  keyword: string,
  page: number,
  pageSize: number
): MockSearchResponse {
  const q = String(keyword || "").trim().toLowerCase();
  const p = Number.isFinite(page) && page > 0 ? Math.floor(page) : 1;
  const ps = Number.isFinite(pageSize) && pageSize > 0 ? Math.floor(pageSize) : 10;

  const filtered = realInventory.filter((inv) => {
    if (!q) return true;
    const sku = inv.sku.toLowerCase();
    const name = inv.name.toLowerCase();
    const terms = (inv.searchTerms || []).some((t) => t.toLowerCase().includes(q));
    return sku.includes(q) || name.includes(q) || terms;
  });

  const total = filtered.length;
  const start = (p - 1) * ps;
  const slice = filtered.slice(start, start + ps);

  const parts: MockSearchPart[] = slice.map((inv) => ({
    partNumber: inv.sku,
    name: inv.name,
    brand: inv.brand || "Ford",
    description: inv.application || inv.name,
    category: inv.categoryId,
    subcategory: inv.subcategoryId || "",
    imageUrl: "",
    listPrice: inv.price,
    dealers: makeDealersForPart(inv.sku, inv.price),
  }));

  return {
    totalResults: total,
    page: p,
    pageSize: ps,
    parts,
  };
}

export function getMockPartByNumber(partNumber: string): MockSearchPart | null {
  const target = normalizePartNumber(partNumber);
  const inv =
    realInventory.find((p) => normalizePartNumber(p.sku) === target) ||
    realInventory.find((p) => p.sku === partNumber);
  if (!inv) return null;
  return {
    partNumber: inv.sku,
    name: inv.name,
    brand: inv.brand || "Ford",
    description: inv.application || inv.name,
    category: inv.categoryId,
    subcategory: inv.subcategoryId || "",
    imageUrl: "",
    listPrice: inv.price,
    dealers: makeDealersForPart(inv.sku, inv.price),
  };
}

export function getMockCatalog(): MockCatalogResponse {
  return {
    source: "mock",
    categories: categoryTaxonomy.map((cat) => ({
      id: cat.id,
      name: cat.name,
      partCount: cat.subcategories
        ? cat.subcategories.reduce((sum, sub) => sum + sub.parts.length, 0)
        : cat.parts?.length || 0,
      subcategories: cat.subcategories?.map((sub) => ({
        id: sub.id,
        name: sub.name,
        partCount: sub.parts.length,
      })),
    })),
  };
}

export function getMockSamples() {
  return {
    apiKey: "pk_test_jericho_2026",
    vins: ["1FTFW1E50MFA00001", "1FTPW1E50MFA00002"],
    parts: ["FL-500-S", "BR-PAD-F150-FR", "BR-PAD-F150-RR"],
    zips: ["92101", "90015"],
    dealers: ["sd_ford_001", "sd_ford_002"],
    categories: ["CAT-MAINT", "CAT-BRK", "CAT-FLUID"],
    docsUrl: "https://jericho-api-48gl.onrender.com/v1/docs",
  };
}

export function resolveVinMock(vin: string) {
  const v = String(vin || "").trim().toUpperCase();
  return {
    source: "mock",
    vin: v,
    make: "Ford",
    model: v.includes("PW") ? "F-150" : "F-150",
    year: 2021,
    engine: "3.5L EcoBoost V6",
    trim: "XLT",
    valid: v.length === 17,
  };
}

export function resolveMmyMock(make: string, model: string, year: number) {
  return {
    source: "mock",
    make,
    model,
    year,
    valid: Boolean(make && model && year),
  };
}

