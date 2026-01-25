"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { normalizeZip } from "@/lib/zip";

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<"parts" | "risk" | "auth">("parts");

  // Parts tester
  const [keyword, setKeyword] = useState("FL-500S");
  const [zipCode, setZipCode] = useState("92101");
  const [partsLoading, setPartsLoading] = useState(false);
  const [partsResponse, setPartsResponse] = useState<object | null>(null);
  const safeZip = useMemo(() => normalizeZip(zipCode), [zipCode]);

  const testParts = async () => {
    setPartsLoading(true);
    setPartsResponse(null);
    try {
      const qs = new URLSearchParams({
        keyword: keyword.trim(),
        zipCode: safeZip,
      });
      const res = await fetch(`/api/parts/search?${qs.toString()}`, { method: "GET" });
      const json = await res.json().catch(() => ({}));
      setPartsResponse(json);
    } catch {
      setPartsResponse({ error: "Failed to call /api/parts/search" });
    } finally {
      setPartsLoading(false);
    }
  };

  // Risk tester
  const [riskLoading, setRiskLoading] = useState(false);
  const [riskResponse, setRiskResponse] = useState<object | null>(null);

  const riskBody = useMemo(
    () => ({
      vin: "1FTFW1E50MFA12345",
      mileage: 75000,
      year: 2021,
      healthScore: 72,
      dtcs: { powertrain: 2, body: 1, chassis: 1, network: 0 },
      environment: {
        rustExposure: 30,
        stopGoFactor: 50,
        terrainFactor: 20,
        thermalFactor: 40,
      },
    }),
    []
  );

  const testRisk = async () => {
    setRiskLoading(true);
    setRiskResponse(null);
    try {
      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(riskBody),
      });
      const json = await res.json().catch(() => ({}));
      setRiskResponse(json);
    } catch {
      setRiskResponse({ error: "Failed to call /api/risk" });
    } finally {
      setRiskLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white pt-14">
      <div className="max-w-5xl mx-auto px-6 md:px-8 py-10">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-neutral-400 hover:text-neutral-900">←</Link>
            <div>
              <h1 className="text-2xl font-light text-neutral-900">API Docs</h1>
              <p className="text-sm text-neutral-500">Parts search + risk scoring endpoints for the demo.</p>
            </div>
          </div>
          <div className="text-xs text-neutral-500">
            Protected by Basic Auth
          </div>
        </div>

        <div className="flex gap-2 mb-8">
          {(
            [
              { id: "parts", label: "Parts API" },
              { id: "risk", label: "Risk API" },
              { id: "auth", label: "Auth" },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveSection(t.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors ${
                activeSection === t.id
                  ? "bg-neutral-900 border-neutral-900 text-white"
                  : "bg-white border-neutral-200 text-neutral-600 hover:border-neutral-400"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeSection === "parts" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">GET</div>
              <div className="text-lg font-medium text-neutral-900 mb-1">/api/parts/search</div>
              <div className="text-sm text-neutral-600 mb-4">
                Proxies the upstream parts provider and keeps your API key server-side.
              </div>
              <div className="text-sm text-neutral-700">
                <div className="font-medium mb-2">Query params</div>
                <ul className="text-neutral-600 space-y-1">
                  <li>- <span className="font-mono">keyword</span> (string, required)</li>
                  <li>- <span className="font-mono">zipCode</span> (string, optional; defaults to demo ZIP)</li>
                </ul>
              </div>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="text-sm font-medium text-neutral-900 mb-4">Try it</div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <input
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                  placeholder="keyword (e.g. FL-500S)"
                />
                <input
                  value={zipCode}
                  onChange={(e) => setZipCode(e.target.value)}
                  className="px-4 py-3 rounded-xl border border-neutral-200 bg-white focus:outline-none focus:border-neutral-900"
                  placeholder="zipCode (e.g. 48126)"
                />
                <button
                  onClick={testParts}
                  disabled={partsLoading || !keyword.trim()}
                  className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
                >
                  {partsLoading ? "Calling..." : "Call endpoint →"}
                </button>
              </div>

              <div className="mt-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Response</div>
                <pre className="text-xs bg-white border border-neutral-200 rounded-xl p-4 overflow-x-auto max-h-80">
                  {JSON.stringify(partsResponse ?? { note: "No response yet." }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeSection === "risk" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">POST</div>
              <div className="text-lg font-medium text-neutral-900 mb-1">/api/risk</div>
              <div className="text-sm text-neutral-600 mb-4">
                Calculates a service priority score from vehicle signals (mileage, health, DTCs, environment).
              </div>
              <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Example body</div>
              <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-4 overflow-x-auto">
                {JSON.stringify(riskBody, null, 2)}
              </pre>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-6">
              <div className="text-sm font-medium text-neutral-900 mb-4">Try it</div>
              <button
                onClick={testRisk}
                disabled={riskLoading}
                className="px-4 py-3 rounded-xl bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800 disabled:opacity-50"
              >
                {riskLoading ? "Calling..." : "Call endpoint →"}
              </button>

              <div className="mt-4">
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-2">Response</div>
                <pre className="text-xs bg-white border border-neutral-200 rounded-xl p-4 overflow-x-auto max-h-80">
                  {JSON.stringify(riskResponse ?? { note: "No response yet." }, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        )}

        {activeSection === "auth" && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-neutral-200 bg-white p-6">
              <div className="text-lg font-medium text-neutral-900 mb-2">Basic Auth (demo gate)</div>
              <p className="text-sm text-neutral-600 mb-4">
                This app is protected behind HTTP Basic Auth via Next.js Middleware.
                Set these env vars in Vercel (and your local shell) to enable access:
              </p>
              <pre className="text-xs bg-neutral-50 border border-neutral-200 rounded-xl p-4 overflow-x-auto">
{`BASIC_AUTH_USERNAME=...
BASIC_AUTH_PASSWORD=...`}
              </pre>
              <div className="text-sm text-neutral-700 mt-4">
                If you’re calling endpoints with <span className="font-mono">curl</span>:
              </div>
              <pre className="text-xs bg-neutral-900 text-white rounded-xl p-4 overflow-x-auto mt-2">
{`curl -u USER:PASSWORD "https://YOUR_DOMAIN/api/parts/search?keyword=FL-500S&zipCode=48126"`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
