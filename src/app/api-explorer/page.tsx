"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { realInventory, categoryTaxonomy, inventoryStats } from "@/lib/inventory";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";
import { demoCustomer, calculateEntitlementPrice } from "@/lib/vehicles";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  name: string;
  description: string;
  category: "search" | "commerce";
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest?: object;
  run: (params: Record<string, string>) => Promise<object>;
}

// Endpoints
const allEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/v1/catalog",
    name: "Get Catalog",
    category: "search",
    description: "Returns the full parts catalog with categories and part counts.",
    params: [],
    run: async () => {
      return {
        source: "Ford Parts & Motorcraft",
        stats: inventoryStats,
        categories: categoryTaxonomy.map(cat => ({
          id: cat.id,
          name: cat.name,
          partCount: cat.subcategories 
            ? cat.subcategories.reduce((sum, sub) => sum + sub.parts.length, 0)
            : cat.parts?.length || 0,
          subcategories: cat.subcategories?.map(sub => ({
            id: sub.id,
            name: sub.name,
            partCount: sub.parts.length,
          })),
        })),
      };
    },
  },
  {
    method: "GET",
    path: "/v1/parts/search",
    name: "Search Parts",
    category: "search",
    description: "Search parts by keyword, part number, or category.",
    params: [
      { name: "q", type: "string", required: true, description: "Search query" },
      { name: "category", type: "string", required: false, description: "Category filter" },
      { name: "limit", type: "number", required: false, description: "Max results" },
    ],
    run: async (params) => {
      const query = (params.q || "").toLowerCase();
      const results = realInventory
        .filter(p => 
          p.name.toLowerCase().includes(query) ||
          p.sku.toLowerCase().includes(query) ||
          p.searchTerms.some(t => t.toLowerCase().includes(query))
        )
        .filter(p => !params.category || p.categoryId === params.category)
        .slice(0, parseInt(params.limit) || 20)
        .map(p => ({
          partNumber: p.sku,
          name: p.name,
          brand: p.brand,
          listPrice: p.price,
          category: p.categoryId,
          isOEM: p.isOEM,
          supplier: p.supplier,
        }));

      return {
        query: params.q,
        totalResults: results.length,
        results,
      };
    },
  },
  {
    method: "GET",
    path: "/v1/parts/{partNumber}",
    name: "Get Part Details",
    category: "search",
    description: "Get detailed information for a specific part.",
    params: [
      { name: "partNumber", type: "string", required: true, description: "Part number (e.g., 'FL-500S')" },
    ],
    run: async (params) => {
      const part = realInventory.find(p => p.sku === params.partNumber);
      if (!part) {
        return { error: "Part not found", partNumber: params.partNumber };
      }
      return {
        partNumber: part.sku,
        name: part.name,
        brand: part.brand,
        listPrice: part.price,
        category: part.categoryId,
        subcategory: part.subcategoryId,
        type: part.type,
        application: part.application,
        isOEM: part.isOEM,
        supplier: part.supplier,
        searchTerms: part.searchTerms,
      };
    },
  },
  {
    method: "POST",
    path: "/v1/auth/token",
    name: "Get Auth Token",
    category: "commerce",
    description: "Exchange FIN code for JWT token with profile entitlements.",
    params: [
      { name: "finCode", type: "string", required: true, description: "FIN code (e.g., 'FLEET-4892')" },
    ],
    exampleRequest: { finCode: "FLEET-4892", apiKey: "pk_live_xxx" },
    run: async (params) => {
      if (params.finCode === demoCustomer.customerId) {
        return {
          token: "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
          expiresIn: 3600,
          profile: {
            customerId: demoCustomer.customerId,
            tier: demoCustomer.tier,
            discountPercent: demoCustomer.discountPercent,
            preferredDealerId: demoCustomer.preferredDealerId,
            preferredDealerName: demoCustomer.preferredDealerName,
          },
        };
      }
      return { error: "Invalid FIN code" };
    },
  },
  {
    method: "GET",
    path: "/v1/pricing/{partNumber}",
    name: "Get Entitlement Pricing",
    category: "commerce",
    description: "Get pricing with entitlements applied based on authenticated profile.",
    params: [
      { name: "partNumber", type: "string", required: true, description: "Part number" },
    ],
    run: async (params) => {
      const part = realInventory.find(p => p.sku === params.partNumber);
      if (!part) {
        return { error: "Part not found" };
      }
      const pricing = calculateEntitlementPrice(part.price, demoCustomer);
      return {
        partNumber: part.sku,
        listPrice: part.price,
        yourPrice: pricing.finalPrice,
        discountPercent: pricing.discountPercent,
        discountAmount: pricing.discountAmount,
        tier: demoCustomer.tier,
        breakdown: [
          { label: "List Price", amount: part.price },
          { label: `${demoCustomer.tier.toUpperCase()} Discount (${pricing.discountPercent}%)`, amount: -pricing.discountAmount },
          { label: "Final Price", amount: pricing.finalPrice },
        ],
      };
    },
  },
  {
    method: "POST",
    path: "/v1/cart/add",
    name: "Add to Cart",
    category: "commerce",
    description: "Add item to cart with entitlement pricing.",
    params: [
      { name: "partNumber", type: "string", required: true, description: "Part number" },
      { name: "quantity", type: "number", required: true, description: "Quantity" },
    ],
    exampleRequest: { partNumber: "FL-500S", quantity: 2 },
    run: async (params) => {
      const part = realInventory.find(p => p.sku === params.partNumber);
      if (!part) {
        return { error: "Part not found" };
      }
      const qty = parseInt(params.quantity) || 1;
      const pricing = calculateEntitlementPrice(part.price, demoCustomer);
      return {
        success: true,
        cartItem: {
          partNumber: part.sku,
          name: part.name,
          quantity: qty,
          unitPrice: pricing.finalPrice,
          lineTotal: pricing.finalPrice * qty,
        },
        message: `Added ${qty}x ${part.sku} to cart`,
      };
    },
  },
];

function ApiExplorerContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];
  
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  // Filter endpoints based on mode
  const endpoints = allEndpoints.filter(e => 
    mode === "commerce" || e.category === "search"
  );

  const withMode = (path: string) => `${path}?mode=${mode}`;

  const runEndpoint = async () => {
    if (!selectedEndpoint) return;
    
    setLoading(true);
    setResponse(null);
    const start = performance.now();
    
    try {
      const result = await selectedEndpoint.run(params);
      setLatency(Math.round(performance.now() - start));
      setResponse(result);
    } catch (err) {
      setResponse({ error: String(err) });
    } finally {
      setLoading(false);
    }
  };

  const selectEndpoint = (ep: Endpoint) => {
    setSelectedEndpoint(ep);
    setParams({});
    setResponse(null);
    setLatency(null);
  };

  return (
    <div className="min-h-screen bg-white pt-14">
      {/* Header */}
      <div className="border-b border-neutral-100">
        <div className="max-w-6xl mx-auto px-8 py-12">
          <div className="flex items-center gap-3 mb-4">
            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
              mode === "search" 
                ? "bg-blue-50 text-blue-600" 
                : "bg-neutral-900 text-white"
            }`}>
              {mode === "search" ? "Search API" : "Commerce API"}
            </span>
          </div>
          <h1 className="text-4xl font-extralight text-neutral-900 mb-3">API Explorer</h1>
          <p className="text-neutral-400 text-lg">
            Test endpoints with live data
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-12">
        <div className="grid lg:grid-cols-3 gap-12">
          
          {/* Endpoints List */}
          <div>
            <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">Endpoints</h2>
            <div className="space-y-2">
              {endpoints.map((ep, i) => (
                <button
                  key={i}
                  onClick={() => selectEndpoint(ep)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedEndpoint === ep 
                      ? "bg-neutral-900 text-white" 
                      : "hover:bg-neutral-50 border border-neutral-100"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                      ep.method === "GET" 
                        ? selectedEndpoint === ep ? "bg-green-500 text-white" : "bg-green-100 text-green-700"
                        : selectedEndpoint === ep ? "bg-blue-500 text-white" : "bg-blue-100 text-blue-700"
                    }`}>
                      {ep.method}
                    </span>
                    <span className={`text-sm font-medium ${
                      selectedEndpoint === ep ? "text-white" : "text-neutral-900"
                    }`}>
                      {ep.name}
                    </span>
                  </div>
                  <code className={`text-xs font-mono ${
                    selectedEndpoint === ep ? "text-neutral-400" : "text-neutral-400"
                  }`}>
                    {ep.path}
                  </code>
                </button>
              ))}
            </div>

            {mode === "search" && (
              <div className="mt-8 p-4 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-2">Commerce endpoints hidden</p>
                <Link href="/?mode=commerce" className="text-xs text-blue-600 hover:underline">
                  Switch to Commerce mode →
                </Link>
              </div>
            )}
          </div>

          {/* Request Builder */}
          <div className="lg:col-span-2">
            {selectedEndpoint ? (
              <div className="space-y-8">
                {/* Endpoint Info */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className={`text-xs font-mono px-2 py-1 rounded ${
                      selectedEndpoint.method === "GET" 
                        ? "bg-green-100 text-green-700"
                        : "bg-blue-100 text-blue-700"
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-lg font-mono text-neutral-700">{selectedEndpoint.path}</code>
                  </div>
                  <p className="text-neutral-500">{selectedEndpoint.description}</p>
                </div>

                {/* Parameters */}
                {selectedEndpoint.params.length > 0 && (
                  <div>
                    <h3 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">Parameters</h3>
                    <div className="space-y-4">
                      {selectedEndpoint.params.map((param) => (
                        <div key={param.name}>
                          <div className="flex items-center gap-2 mb-2">
                            <label className="text-sm font-medium text-neutral-900">{param.name}</label>
                            <span className="text-xs text-neutral-400">{param.type}</span>
                            {param.required && (
                              <span className="text-xs text-red-500">required</span>
                            )}
                          </div>
                          <input
                            type="text"
                            value={params[param.name] || ""}
                            onChange={(e) => setParams({ ...params, [param.name]: e.target.value })}
                            placeholder={param.description}
                            className="w-full px-4 py-3 border border-neutral-200 rounded-lg focus:outline-none focus:border-neutral-900 text-sm"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Run Button */}
                <button
                  onClick={runEndpoint}
                  disabled={loading}
                  className="px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800 disabled:opacity-50 text-sm font-medium"
                >
                  {loading ? "Running..." : "Run Request"}
                </button>

                {/* Response */}
                {response && (
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs text-neutral-400 uppercase tracking-wider">Response</h3>
                      {latency !== null && (
                        <span className={`text-xs font-mono ${
                          latency < 100 ? "text-green-600" : latency < 300 ? "text-yellow-600" : "text-red-600"
                        }`}>
                          {latency}ms
                        </span>
                      )}
                    </div>
                    <div className="bg-neutral-900 text-neutral-300 rounded-xl p-6 font-mono text-sm overflow-x-auto max-h-[500px] overflow-y-auto">
                      <pre>{JSON.stringify(response, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-neutral-300">
                <div className="text-center">
                  <svg className="w-12 h-12 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="text-sm">Select an endpoint to get started</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ApiExplorerPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pt-14" />}>
      <ApiExplorerContent />
    </Suspense>
  );
}
