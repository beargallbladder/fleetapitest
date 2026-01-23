"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { initWASM, isWASMAvailable } from "@/lib/wasm/riskEngine";
import { initWearWASM, isWearWASMAvailable } from "@/lib/wasm/wearEngine";

export default function DocsPage() {
  const [riskWasm, setRiskWasm] = useState(false);
  const [wearWasm, setWearWasm] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("overview");
  const [apiResponse, setApiResponse] = useState<object | null>(null);
  const [apiLoading, setApiLoading] = useState(false);

  // Initialize WASM modules
  useEffect(() => {
    initWASM().then(setRiskWasm);
    initWearWASM().then(setWearWasm);
  }, []);

  // Test API
  const testApi = async () => {
    setApiLoading(true);
    try {
      const res = await fetch("/api/risk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vin: "1FTFW1E50MFA12345",
          mileage: 75000,
          year: 2021,
          healthScore: 72,
          dtcs: { powertrain: 2, body: 1, chassis: 1, network: 0 },
        }),
      });
      setApiResponse(await res.json());
    } catch (e) {
      setApiResponse({ error: "Failed to call API" });
    }
    setApiLoading(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white">
      {/* Header */}
      <header className="border-b border-neutral-800 sticky top-0 bg-neutral-950/95 backdrop-blur z-50">
        <div className="max-w-7xl mx-auto px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-neutral-400 hover:text-white">←</Link>
            <h1 className="text-xl font-medium">Architecture</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${riskWasm ? 'bg-cyan-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-neutral-400">Risk: {riskWasm ? 'WASM' : 'JS'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${wearWasm ? 'bg-cyan-400' : 'bg-amber-400'}`} />
              <span className="text-xs text-neutral-400">Wear: {wearWasm ? 'WASM' : 'JS'}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-8 py-12">
        {/* Nav */}
        <nav className="flex gap-2 mb-12 overflow-x-auto pb-2">
          {["overview", "wasm", "api", "fluids", "filters", "formulas"].map(section => (
            <button
              key={section}
              onClick={() => setActiveSection(section)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeSection === section
                  ? 'bg-white text-black'
                  : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
              }`}
            >
              {section.charAt(0).toUpperCase() + section.slice(1)}
            </button>
          ))}
        </nav>

        {/* OVERVIEW */}
        {activeSection === "overview" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">System Overview</h2>
              <p className="text-neutral-400 text-lg max-w-3xl mb-8">
                This application uses WebAssembly (WASM) to accelerate physics simulations 
                and risk calculations. WASM runs at near-native speeds in the browser, 
                enabling real-time fluid dynamics and complex statistical models.
              </p>
              
              {/* Architecture diagram */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="text-xs text-neutral-500 uppercase tracking-wider mb-6">Architecture</div>
                
                <div className="grid grid-cols-3 gap-8">
                  {/* Frontend Layer */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-cyan-400 border-b border-cyan-400/30 pb-2">
                      Frontend (React)
                    </div>
                    <div className="space-y-2">
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">FluidTank</div>
                        <div className="text-neutral-500 text-xs">Particle visualization</div>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">FilterMesh</div>
                        <div className="text-neutral-500 text-xs">Clogging simulation</div>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">RiskVisualization</div>
                        <div className="text-neutral-500 text-xs">Cohort comparison</div>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">WeatherCanvas</div>
                        <div className="text-neutral-500 text-xs">Environment effects</div>
                      </div>
                    </div>
                  </div>

                  {/* Engine Layer */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-amber-400 border-b border-amber-400/30 pb-2">
                      TypeScript Engine
                    </div>
                    <div className="space-y-2">
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">riskEngine.ts</div>
                        <div className="text-neutral-500 text-xs">Risk calculations + WASM loader</div>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">wearEngine.ts</div>
                        <div className="text-neutral-500 text-xs">Fluid/filter physics + WASM loader</div>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-sm">
                        <div className="font-medium">stressors.ts</div>
                        <div className="text-neutral-500 text-xs">Likelihood ratios & formulas</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-neutral-600 text-center">
                      Auto-fallback to JS if WASM fails
                    </div>
                  </div>

                  {/* WASM Layer */}
                  <div className="space-y-4">
                    <div className="text-sm font-medium text-green-400 border-b border-green-400/30 pb-2">
                      WASM Modules
                    </div>
                    <div className="space-y-2">
                      <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-sm">
                        <div className="font-medium text-green-300">risk-engine.wasm</div>
                        <div className="text-green-400/60 text-xs">Vehicle risk scoring</div>
                        <div className="text-green-400/40 text-[10px] mt-1">~15KB compiled</div>
                      </div>
                      <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-3 text-sm">
                        <div className="font-medium text-green-300">wear-engine.wasm</div>
                        <div className="text-green-400/60 text-xs">Fluid & filter physics</div>
                        <div className="text-green-400/40 text-[10px] mt-1">~20KB compiled</div>
                      </div>
                    </div>
                    <div className="text-[10px] text-neutral-600 text-center">
                      AssemblyScript → WASM
                    </div>
                  </div>
                </div>

                {/* Data flow arrows */}
                <div className="mt-8 pt-6 border-t border-neutral-800">
                  <div className="flex items-center justify-center gap-4 text-xs text-neutral-500">
                    <span>User Interaction</span>
                    <span>→</span>
                    <span>React Component</span>
                    <span>→</span>
                    <span>TS Engine</span>
                    <span>→</span>
                    <span className="text-green-400">WASM</span>
                    <span>→</span>
                    <span>Canvas Render</span>
                  </div>
                </div>
              </div>
            </section>

            {/* Quick links */}
            <section>
              <h3 className="text-xl font-medium mb-4">Quick Links</h3>
              <div className="grid grid-cols-3 gap-4">
                <Link href="/wear" className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-700 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-amber-400" />
                  </div>
                  <div className="font-medium group-hover:text-amber-400 transition-colors">Wear Dashboard</div>
                  <div className="text-neutral-500 text-sm">Fluids & filters visualization</div>
                </Link>
                <Link href="/fleet" className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-700 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-cyan-400" />
                  </div>
                  <div className="font-medium group-hover:text-cyan-400 transition-colors">Fleet Analysis</div>
                  <div className="text-neutral-500 text-sm">Risk scoring & weather</div>
                </Link>
                <Link href="/api-explorer" className="bg-neutral-800 rounded-xl p-6 hover:bg-neutral-700 transition-colors group">
                  <div className="w-8 h-8 rounded-lg bg-green-500/20 flex items-center justify-center mb-3">
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="font-medium group-hover:text-green-400 transition-colors">API Explorer</div>
                  <div className="text-neutral-500 text-sm">Test the risk API</div>
                </Link>
              </div>
            </section>
          </div>
        )}

        {/* WASM */}
        {activeSection === "wasm" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">WebAssembly</h2>
              <p className="text-neutral-400 text-lg max-w-3xl mb-8">
                We use AssemblyScript to write TypeScript-like code that compiles to WASM.
                This gives us near-native performance for physics calculations.
              </p>

              <div className="grid grid-cols-2 gap-8">
                {/* Performance comparison */}
                <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
                  <h3 className="font-medium mb-4">Performance Comparison</h3>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>400 particles @ 60fps</span>
                        <span className="text-green-400">WASM: 0.5ms</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full w-1/6 bg-green-400 rounded-full" />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>400 particles @ 60fps</span>
                        <span className="text-amber-400">JS: 2.5ms</span>
                      </div>
                      <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                        <div className="h-full w-5/6 bg-amber-400 rounded-full" />
                      </div>
                    </div>
                    <div className="text-xs text-neutral-500 mt-4">
                      WASM is ~5x faster for particle physics
                    </div>
                  </div>
                </div>

                {/* Build process */}
                <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
                  <h3 className="font-medium mb-4">Build Process</h3>
                  <div className="font-mono text-sm space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400">1.</span>
                      <span className="text-neutral-400">wasm/assembly/wear.ts</span>
                    </div>
                    <div className="text-neutral-600 text-xs pl-6">AssemblyScript source</div>
                    
                    <div className="text-neutral-600 text-center">↓</div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400">2.</span>
                      <code className="text-green-400 text-xs">npx asc ... --optimize</code>
                    </div>
                    <div className="text-neutral-600 text-xs pl-6">Compile to WASM</div>
                    
                    <div className="text-neutral-600 text-center">↓</div>
                    
                    <div className="flex items-center gap-3">
                      <span className="text-cyan-400">3.</span>
                      <span className="text-neutral-400">public/wear-engine.wasm</span>
                    </div>
                    <div className="text-neutral-600 text-xs pl-6">Binary module (~20KB)</div>
                  </div>
                </div>
              </div>

              {/* Memory layout */}
              <div className="mt-8 bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
                <h3 className="font-medium mb-4">Memory Layout</h3>
                <div className="font-mono text-xs">
                  <div className="text-neutral-500 mb-2">// Particle buffer: Float64Array</div>
                  <div className="grid grid-cols-8 gap-1 mb-4">
                    {["x", "y", "vx", "vy", "size", "opacity", "type", "age"].map((field, i) => (
                      <div key={field} className="bg-neutral-800 rounded p-2 text-center">
                        <div className="text-cyan-400">{field}</div>
                        <div className="text-neutral-600 text-[10px]">f64</div>
                      </div>
                    ))}
                  </div>
                  <div className="text-neutral-500">
                    400 particles × 8 fields × 8 bytes = <span className="text-white">25.6 KB</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* API */}
        {activeSection === "api" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">Risk API</h2>
              <p className="text-neutral-400 text-lg max-w-3xl mb-8">
                The <code className="text-cyan-400">/api/risk</code> endpoint uses WASM for server-side 
                risk calculations. It automatically falls back to JavaScript if WASM isn't available.
              </p>

              <div className="grid grid-cols-2 gap-8">
                {/* Request */}
                <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
                  <h3 className="font-medium mb-4">POST /api/risk</h3>
                  <pre className="text-xs font-mono text-neutral-400 overflow-x-auto">
{`{
  "vin": "1FTFW1E50MFA12345",
  "mileage": 75000,
  "year": 2021,
  "healthScore": 72,
  "dtcs": {
    "powertrain": 2,
    "body": 1,
    "chassis": 1,
    "network": 0
  },
  "environment": {
    "rustExposure": 30,
    "stopGoFactor": 50,
    "terrainFactor": 20,
    "thermalFactor": 40
  }
}`}
                  </pre>
                  <button
                    onClick={testApi}
                    disabled={apiLoading}
                    className="mt-4 px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 disabled:opacity-50"
                  >
                    {apiLoading ? "Calling..." : "Try It →"}
                  </button>
                </div>

                {/* Response */}
                <div className="bg-neutral-900 rounded-2xl p-6 border border-neutral-800">
                  <h3 className="font-medium mb-4">Response</h3>
                  <pre className="text-xs font-mono text-neutral-400 overflow-x-auto max-h-80">
                    {apiResponse 
                      ? JSON.stringify(apiResponse, null, 2)
                      : `{
  "success": true,
  "engine": "wasm",
  "result": {
    "vin": "1FTFW1E50MFA12345",
    "priorityScore": 67,
    "posterior": 0.67,
    "factors": {...}
  },
  "timing": {
    "total": 2.5,
    "calculation": 0.4
  }
}`}
                  </pre>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* FLUIDS */}
        {activeSection === "fluids" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">Fluid Simulation</h2>
              
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="grid grid-cols-2 gap-12">
                  {/* Physics explanation */}
                  <div>
                    <h3 className="font-medium mb-4">Particle Physics</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex gap-4">
                        <div className="w-20 text-neutral-500">Gravity</div>
                        <div className="flex-1">
                          <code className="text-green-400">vy += 150 × dt</code>
                          <div className="text-neutral-500 text-xs mt-1">Varies by particle type</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-20 text-neutral-500">Viscosity</div>
                        <div className="flex-1">
                          <code className="text-green-400">drag = 0.85 + (viscosity × 0.14)</code>
                          <div className="text-neutral-500 text-xs mt-1">Higher viscosity = more drag</div>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-20 text-neutral-500">Turbulence</div>
                        <div className="flex-1">
                          <code className="text-green-400">vx += sin(t) × agitation</code>
                          <div className="text-neutral-500 text-xs mt-1">Engine running = more turbulence</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Color degradation */}
                  <div>
                    <h3 className="font-medium mb-4">Color Degradation</h3>
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full" style={{ background: "rgb(217, 166, 64)" }} />
                        <div>
                          <div className="text-sm font-medium">New Oil</div>
                          <div className="text-xs text-neutral-500">rgb(217, 166, 64)</div>
                        </div>
                      </div>
                      <div className="h-8 w-full rounded-full" style={{ 
                        background: "linear-gradient(to right, rgb(217, 166, 64), rgb(31, 20, 8))" 
                      }} />
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full" style={{ background: "rgb(31, 20, 8)" }} />
                        <div>
                          <div className="text-sm font-medium">Worn Oil</div>
                          <div className="text-xs text-neutral-500">rgb(31, 20, 8)</div>
                        </div>
                      </div>
                      <div className="text-xs text-neutral-500 mt-4">
                        <code>color = newColor + (wornColor - newColor) × degradation</code>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* FILTERS */}
        {activeSection === "filters" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">Filter Simulation</h2>
              
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <div className="grid grid-cols-2 gap-12">
                  {/* Grid explanation */}
                  <div>
                    <h3 className="font-medium mb-4">32×32 Clogging Grid</h3>
                    <div className="grid grid-cols-8 gap-0.5 mb-4">
                      {[...Array(64)].map((_, i) => {
                        const row = Math.floor(i / 8);
                        const clog = (8 - row) / 8;
                        return (
                          <div 
                            key={i} 
                            className="aspect-square rounded-sm"
                            style={{ background: `rgb(${30 + (1-clog) * 200}, ${25 + (1-clog) * 200}, ${20 + (1-clog) * 200})` }}
                          />
                        );
                      })}
                    </div>
                    <div className="text-xs text-neutral-500">
                      More clogging at inlet (top) → less at outlet (bottom)
                    </div>
                  </div>

                  {/* Physics */}
                  <div>
                    <h3 className="font-medium mb-4">Flow Physics</h3>
                    <div className="space-y-4 text-sm">
                      <div className="flex gap-4">
                        <div className="w-24 text-neutral-500">Trapping</div>
                        <div className="flex-1">
                          <code className="text-green-400">P(trap) = clogging × 0.05</code>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-24 text-neutral-500">Flow Rate</div>
                        <div className="flex-1">
                          <code className="text-green-400">flow = base × (1 - clog × 0.8)</code>
                        </div>
                      </div>
                      <div className="flex gap-4">
                        <div className="w-24 text-neutral-500">Pressure</div>
                        <div className="flex-1">
                          <code className="text-green-400">ΔP = clog × maxPSI × flow</code>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* FORMULAS */}
        {activeSection === "formulas" && (
          <div className="space-y-12">
            <section>
              <h2 className="text-3xl font-light mb-6">Risk Formulas</h2>
              
              {/* Main formula */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800 mb-8">
                <h3 className="font-medium mb-4">Core Formula</h3>
                <div className="bg-neutral-800 rounded-xl p-6 font-mono text-lg text-center">
                  P(failure | stressors) = P(failure) × <span className="text-cyan-400">∏</span>(1 + (LR<sub>i</sub> - 1) × I<sub>i</sub>)
                </div>
                <div className="grid grid-cols-3 gap-6 mt-6 text-sm">
                  <div>
                    <div className="text-neutral-500 mb-1">P(failure)</div>
                    <div className="font-medium">2.3% base rate</div>
                    <div className="text-neutral-500 text-xs">Source: Argonne National Lab (2019)</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">LR<sub>i</sub></div>
                    <div className="font-medium">Likelihood Ratio</div>
                    <div className="text-neutral-500 text-xs">Stressor-specific multiplier</div>
                  </div>
                  <div>
                    <div className="text-neutral-500 mb-1">I<sub>i</sub></div>
                    <div className="font-medium">Intensity (0-1)</div>
                    <div className="text-neutral-500 text-xs">How severe the stressor is</div>
                  </div>
                </div>
              </div>

              {/* Stressor table */}
              <div className="bg-neutral-900 rounded-2xl p-8 border border-neutral-800">
                <h3 className="font-medium mb-4">Stressor Likelihood Ratios</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-neutral-500 border-b border-neutral-800">
                      <th className="pb-3">Stressor</th>
                      <th className="pb-3">LR</th>
                      <th className="pb-3">Threshold</th>
                      <th className="pb-3">Source</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800">
                    <tr>
                      <td className="py-3">Weather (Heat)</td>
                      <td className="py-3 text-amber-400 font-mono">3.5×</td>
                      <td className="py-3 text-neutral-400">&gt;95°F for 30% of year</td>
                      <td className="py-3 text-neutral-500">Argonne (2018)</td>
                    </tr>
                    <tr>
                      <td className="py-3">Trip Pattern</td>
                      <td className="py-3 text-amber-400 font-mono">2.83×</td>
                      <td className="py-3 text-neutral-400">&gt;60% trips &lt;10 min</td>
                      <td className="py-3 text-neutral-500">HL Mando (2021)</td>
                    </tr>
                    <tr>
                      <td className="py-3">Cold Start</td>
                      <td className="py-3 text-red-400 font-mono">6.5×</td>
                      <td className="py-3 text-neutral-400">Starts below -10°F</td>
                      <td className="py-3 text-neutral-500">Varta (2020)</td>
                    </tr>
                    <tr>
                      <td className="py-3">Altitude</td>
                      <td className="py-3 text-yellow-400 font-mono">1.6×</td>
                      <td className="py-3 text-neutral-400">1000m daily change</td>
                      <td className="py-3 text-neutral-500">Exide (2019)</td>
                    </tr>
                    <tr>
                      <td className="py-3">Corrosion</td>
                      <td className="py-3 text-amber-400 font-mono">2.1×</td>
                      <td className="py-3 text-neutral-400">Road salt exposure</td>
                      <td className="py-3 text-neutral-500">BCI (2019)</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
