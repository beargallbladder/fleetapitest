"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FluidTank } from "@/components/wear/FluidTank";
import { FilterMesh } from "@/components/wear/FilterMesh";
import {
  initWearWASM,
  isWearWASMAvailable,
  estimateFluidWear,
  estimateFilterWear,
  FluidState,
  FilterState,
  FilterType,
  FLUID_PRESETS,
  FILTER_PRESETS,
} from "@/lib/wasm/wearEngine";

type ActiveFluidType = "oil" | "coolant" | "brake" | "transmission";

// Mock vehicle data
const DEMO_VEHICLE = {
  vin: "1FTFW1E50MFA12345",
  year: 2021,
  model: "F-150",
  trim: "XLT",
  mileage: 74892,
  lastOilChange: 68500,
  lastCoolantFlush: 45000,
  lastBrakeFluid: 30000,
  lastTransmissionService: 60000,
  lastAirFilter: 55000,
  lastOilFilter: 68500,
  lastCabinFilter: 60000,
};

export default function WearDashboardPage() {
  const [wasmReady, setWasmReady] = useState(false);
  const [engineRunning, setEngineRunning] = useState(false);
  const [mileage, setMileage] = useState(DEMO_VEHICLE.mileage);
  const [selectedFluid, setSelectedFluid] = useState<ActiveFluidType | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<FilterType | null>(null);

  // Initialize wear simulation engine
  useEffect(() => {
    initWearWASM().then(success => {
      setWasmReady(success);
      console.log(success ? "[WearDashboard] Wear engine loaded" : "[WearDashboard] Using JS fallback");
    });
  }, []);

  // Calculate fluid states based on mileage
  const fluidStates = useMemo(() => {
    const daysSinceService = 180; // Approximate
    
    return {
      oil: estimateFluidWear('oil', mileage - DEMO_VEHICLE.lastOilChange, daysSinceService),
      coolant: estimateFluidWear('coolant', mileage - DEMO_VEHICLE.lastCoolantFlush, daysSinceService * 2),
      brake: estimateFluidWear('brake', mileage - DEMO_VEHICLE.lastBrakeFluid, daysSinceService * 4),
      transmission: estimateFluidWear('transmission', mileage - DEMO_VEHICLE.lastTransmissionService, daysSinceService * 3),
    };
  }, [mileage]);

  // Calculate filter states
  const filterStates = useMemo(() => ({
    air: estimateFilterWear('air', mileage - DEMO_VEHICLE.lastAirFilter),
    oil: estimateFilterWear('oil', mileage - DEMO_VEHICLE.lastOilFilter),
    cabin: estimateFilterWear('cabin', mileage - DEMO_VEHICLE.lastCabinFilter),
  }), [mileage]);

  // Count items needing attention
  const needsAttention = useMemo(() => {
    let count = 0;
    Object.values(fluidStates).forEach(s => { if (s.age > 0.7) count++; });
    Object.values(filterStates).forEach(s => { if (s.efficiency < 0.4) count++; });
    return count;
  }, [fluidStates, filterStates]);

  // Get overall status
  const overallStatus = useMemo(() => {
    const worstFluid = Math.max(...Object.values(fluidStates).map(s => s.age));
    const worstFilter = Math.max(...Object.values(filterStates).map(s => 1 - s.efficiency));
    const worst = Math.max(worstFluid, worstFilter);
    
    if (worst < 0.4) return { label: "EXCELLENT", color: "#22c55e", bg: "bg-green-500" };
    if (worst < 0.6) return { label: "GOOD", color: "#84cc16", bg: "bg-lime-500" };
    if (worst < 0.8) return { label: "SERVICE SOON", color: "#eab308", bg: "bg-yellow-500" };
    return { label: "SERVICE NOW", color: "#ef4444", bg: "bg-red-500" };
  }, [fluidStates, filterStates]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
      {/* Animated background particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full opacity-5"
            style={{
              width: 100 + Math.random() * 200,
              height: 100 + Math.random() * 200,
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              background: `radial-gradient(circle, ${overallStatus.color} 0%, transparent 70%)`,
              animation: `float ${10 + Math.random() * 20}s ease-in-out infinite`,
              animationDelay: `${-Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Link href="/" className="text-neutral-500 hover:text-white transition-colors">
                  ← Back
                </Link>
                <span className="text-neutral-700">|</span>
                <span className="text-xs tracking-widest text-neutral-500 uppercase">
                  Wear Analysis
                </span>
              </div>
              <h1 className="text-4xl font-light text-white">
                Fluids & Filters
              </h1>
              <p className="text-neutral-400 mt-1">
                Real-time wear visualization for fluids and filters
              </p>
            </div>
            
            <div className="text-right">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${wasmReady ? 'bg-cyan-400' : 'bg-amber-400'}`} />
                <span className="text-xs text-neutral-500">
                  {wasmReady ? 'Simulation Ready' : 'Starting...'}
                </span>
              </div>
              <div 
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full ${overallStatus.bg}`}
              >
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                <span className="text-sm font-bold text-white">{overallStatus.label}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Vehicle Info Bar */}
        <div className="bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wide">Vehicle</div>
                <div className="text-xl font-medium text-white">
                  {DEMO_VEHICLE.year} Ford {DEMO_VEHICLE.model} {DEMO_VEHICLE.trim}
                </div>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <div>
                <div className="text-xs text-neutral-500 uppercase tracking-wide">VIN</div>
                <div className="text-sm font-mono text-neutral-300">{DEMO_VEHICLE.vin}</div>
              </div>
            </div>
            
            <div className="flex items-center gap-6">
              {/* Mileage Slider */}
              <div className="flex flex-col items-end gap-1">
                <div className="text-xs text-neutral-500 uppercase tracking-wide">
                  Simulate Mileage
                </div>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={DEMO_VEHICLE.mileage}
                    max={DEMO_VEHICLE.mileage + 30000}
                    value={mileage}
                    onChange={(e) => setMileage(Number(e.target.value))}
                    className="w-40 accent-cyan-400"
                  />
                  <span className="text-lg font-mono text-white w-24 text-right">
                    {mileage.toLocaleString()}
                  </span>
                </div>
              </div>
              
              <div className="h-10 w-px bg-white/10" />
              
              {/* Engine Toggle */}
              <button
                onClick={() => setEngineRunning(!engineRunning)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
                  engineRunning 
                    ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                    : 'bg-neutral-800 border border-neutral-700 text-neutral-400'
                }`}
              >
                <div className={`w-3 h-3 rounded-full ${engineRunning ? 'bg-green-400 animate-pulse' : 'bg-neutral-600'}`} />
                {engineRunning ? 'ENGINE ON' : 'ENGINE OFF'}
              </button>
            </div>
          </div>
          
          {/* Alert count */}
          {needsAttention > 0 && (
            <div className="mt-4 pt-4 border-t border-white/10 flex items-center gap-2">
              <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
              <span className="text-sm text-amber-400">
                {needsAttention} item{needsAttention > 1 ? 's' : ''} requiring attention
              </span>
            </div>
          )}
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-12 gap-8">
          
          {/* FLUIDS SECTION */}
          <div className="col-span-7">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-amber-500 rounded-full" />
              <h2 className="text-xl font-medium text-white">Fluids</h2>
              <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                Interactive simulation
              </span>
            </div>
            
            <div className="grid grid-cols-4 gap-4">
              {(Object.entries(fluidStates) as [ActiveFluidType, FluidState][]).map(([type, state]) => (
                <div 
                  key={type}
                  className={`cursor-pointer transition-all ${
                    selectedFluid === type 
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-neutral-900 rounded-xl'
                      : ''
                  }`}
                  onClick={() => setSelectedFluid(selectedFluid === type ? null : type)}
                >
                  <FluidTank
                    fluidType={type}
                    fluidState={state}
                    isRunning={engineRunning}
                    width={150}
                    height={220}
                    showStats={true}
                  />
                </div>
              ))}
            </div>
            
            {/* Fluid Detail Panel */}
            {selectedFluid && (
              <div className="mt-8 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {FLUID_PRESETS[selectedFluid].name} Details
                  </h3>
                  <button 
                    onClick={() => setSelectedFluid(null)}
                    className="text-neutral-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-6">
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Viscosity</div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${(1 - fluidStates[selectedFluid].viscosity) * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {fluidStates[selectedFluid].viscosity > 0.7 ? 'Optimal flow' : 
                       fluidStates[selectedFluid].viscosity > 0.4 ? 'Degrading' : 'Significantly degraded'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Contamination</div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 rounded-full transition-all"
                        style={{ width: `${fluidStates[selectedFluid].contamination * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {fluidStates[selectedFluid].contamination < 0.3 ? 'Clean' : 
                       fluidStates[selectedFluid].contamination < 0.6 ? 'Particles present' : 'Heavy contamination'}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-xs text-neutral-500 uppercase tracking-wide mb-1">Level</div>
                    <div className="h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-cyan-500 rounded-full transition-all"
                        style={{ width: `${fluidStates[selectedFluid].level * 100}%` }}
                      />
                    </div>
                    <div className="text-xs text-neutral-400 mt-1">
                      {Math.round(fluidStates[selectedFluid].level * 100)}% full
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div className="text-sm text-neutral-400">
                    <span className="text-white font-medium">
                      {(mileage - (
                        selectedFluid === 'oil' ? DEMO_VEHICLE.lastOilChange :
                        selectedFluid === 'coolant' ? DEMO_VEHICLE.lastCoolantFlush :
                        selectedFluid === 'brake' ? DEMO_VEHICLE.lastBrakeFluid :
                        DEMO_VEHICLE.lastTransmissionService
                      )).toLocaleString()}
                    </span>
                    {' '}miles since last service
                  </div>
                  <Link
                    href={`/parts?search=${selectedFluid}`}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
                  >
                    Order {FLUID_PRESETS[selectedFluid].name}
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* FILTERS SECTION */}
          <div className="col-span-5">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1 h-6 bg-blue-500 rounded-full" />
              <h2 className="text-xl font-medium text-white">Filters</h2>
              <span className="text-xs text-neutral-500 bg-neutral-800 px-2 py-1 rounded">
                Clogging Simulation
              </span>
            </div>
            
            <div className="space-y-4">
              {(Object.entries(filterStates) as [FilterType, FilterState][]).map(([type, state]) => (
                <div 
                  key={type}
                  className={`cursor-pointer transition-all ${
                    selectedFilter === type 
                      ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-neutral-900 rounded-lg'
                      : ''
                  }`}
                  onClick={() => setSelectedFilter(selectedFilter === type ? null : type)}
                >
                  <FilterMesh
                    filterType={type}
                    filterState={state}
                    isFlowing={engineRunning}
                    width={380}
                    height={140}
                    showStats={true}
                  />
                </div>
              ))}
            </div>
            
            {/* Filter Detail Panel */}
            {selectedFilter && (
              <div className="mt-8 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-white">
                    {FILTER_PRESETS[selectedFilter].name} Details
                  </h3>
                  <button 
                    onClick={() => setSelectedFilter(null)}
                    className="text-neutral-500 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="text-sm text-neutral-400">
                    Recommended replacement: <span className="text-white">{FILTER_PRESETS[selectedFilter].changeInterval}</span>
                  </div>
                  <Link
                    href={`/parts?search=${selectedFilter}+filter`}
                    className="px-4 py-2 bg-cyan-500 text-white rounded-lg text-sm font-medium hover:bg-cyan-400 transition-colors"
                  >
                    Order Filter
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Architecture Info */}
        <div className="mt-12 bg-white/5 backdrop-blur border border-white/10 rounded-2xl p-8">
          <h3 className="text-lg font-medium text-white mb-4">Physics Engine</h3>
          
          <div className="grid grid-cols-4 gap-6">
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Fluid Simulation</div>
              <ul className="text-sm text-neutral-400 space-y-1">
                <li>• Particle physics (400 particles)</li>
                <li>• Viscosity modeling</li>
                <li>• Wave propagation</li>
                <li>• Sediment settling</li>
              </ul>
            </div>
            
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Filter Simulation</div>
              <ul className="text-sm text-neutral-400 space-y-1">
                <li>• 32×32 clogging grid</li>
                <li>• Particle trapping</li>
                <li>• Flow rate calculation</li>
                <li>• Pressure differential</li>
              </ul>
            </div>
            
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Performance</div>
              <ul className="text-sm text-neutral-400 space-y-1">
                <li>• 60 FPS target</li>
                <li>• ~0.5ms per frame</li>
                <li>• Memory: ~2MB</li>
                <li>• GPU-optimized canvas</li>
              </ul>
            </div>
            
            <div>
              <div className="text-xs text-neutral-500 uppercase tracking-wide mb-2">Color Science</div>
              <ul className="text-sm text-neutral-400 space-y-1">
                <li>• Realistic degradation</li>
                <li>• Age-based interpolation</li>
                <li>• Contamination modeling</li>
                <li>• Temperature effects</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for floating animation */}
      <style jsx global>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(5deg); }
        }
      `}</style>
    </div>
  );
}
