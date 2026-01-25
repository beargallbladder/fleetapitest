"use client";

import { useState, Suspense } from "react";

interface Endpoint {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  name: string;
  description: string;
  category: "parts";
  params: { name: string; type: string; required: boolean; description: string }[];
  exampleRequest?: object;
  run: (params: Record<string, string>) => Promise<object>;
}

function buildQuery(params: Record<string, string>, allowed: string[]) {
  const qs = new URLSearchParams();
  for (const key of allowed) {
    const v = (params[key] || "").trim();
    if (v) qs.set(key, v);
  }
  return qs.toString();
}

async function fetchJson(path: string) {
  const res = await fetch(path, { method: "GET", cache: "no-store" });
  const json = await res.json().catch(() => ({}));
  return {
    ok: res.ok,
    status: res.status,
    json,
  };
}

// Real (server) endpoints backed by the upstream parts provider
const allEndpoints: Endpoint[] = [
  {
    method: "GET",
    path: "/api/parts/catalog",
    name: "Get Catalog",
    category: "parts",
    description: "Proxies the upstream catalog endpoint.",
    params: [],
    run: async () => {
      const r = await fetchJson("/api/parts/catalog");
      return r.ok ? r.json : { error: r.json?.error || "Request failed", status: r.status };
    },
  },
  {
    method: "GET",
    path: "/api/parts/search",
    name: "Search Parts",
    category: "parts",
    description: "Search parts via upstream provider (proxied server-side).",
    params: [
      { name: "keyword", type: "string", required: true, description: "Search keyword or part number" },
      { name: "zipCode", type: "string", required: true, description: "ZIP code for dealer availability/pricing" },
      { name: "page", type: "number", required: false, description: "Page number (default: 1)" },
      { name: "pageSize", type: "number", required: false, description: "Page size (default: 10)" },
    ],
    run: async (params) => {
      const qs = buildQuery(params, ["keyword", "zipCode", "page", "pageSize"]);
      const r = await fetchJson(`/api/parts/search?${qs}`);
      return r.ok ? r.json : { error: r.json?.error || "Request failed", status: r.status };
    },
  },
  {
    method: "GET",
    path: "/api/parts/{partNumber}",
    name: "Get Part Details",
    category: "parts",
    description: "Fetch a single part by part number (proxied server-side).",
    params: [
      { name: "partNumber", type: "string", required: true, description: "Part number (e.g., 'FL-500S')" },
      { name: "zipCode", type: "string", required: false, description: "ZIP code (used if fallback search is needed)" },
    ],
    run: async (params) => {
      const pn = (params.partNumber || "").trim();
      if (!pn) return { error: "Missing required param: partNumber" };
      const zip = (params.zipCode || "").trim();
      const qs = zip ? `?${new URLSearchParams({ zipCode: zip }).toString()}` : "";
      const r = await fetchJson(`/api/parts/${encodeURIComponent(pn)}${qs}`);
      return r.ok ? r.json : { error: r.json?.error || "Request failed", status: r.status };
    },
  },
];

function ApiExplorerContent() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<Endpoint | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [response, setResponse] = useState<object | null>(null);
  const [loading, setLoading] = useState(false);
  const [latency, setLatency] = useState<number | null>(null);

  const endpoints = allEndpoints;

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
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-neutral-900 text-white">
              Parts API
            </span>
          </div>
          <h1 className="text-4xl font-extralight text-neutral-900 mb-3">API Explorer</h1>
          <p className="text-neutral-400 text-lg">
            Test live endpoints backed by the upstream parts provider
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
