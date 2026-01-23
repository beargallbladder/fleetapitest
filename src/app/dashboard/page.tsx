"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fleetVehicles, FleetVehicle, getFleetStats } from "@/lib/fleet";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";
import { fetchWeatherWithNormals, WeatherData } from "@/lib/weather";
import { calculateFleetPriorities, getPrioritySummary, ServicePriority, filterByTripVolume } from "@/lib/servicePriority";
import { regionalProfiles, calculateEnvironmentalStress } from "@/lib/environmentalFactors";
import { getCohortDTCProfile, CohortDTCProfile, DTC_CATEGORIES } from "@/lib/dtc";
import { 
  fetchFleetRecalls, 
  fetchInvestigations, 
  fetchVehicleNHTSAData,
  recallsToAlerts, 
  investigationsToAlerts,
  AlertItem,
  NHTSARecall,
  NHTSAInvestigation,
  VehicleNHTSAData,
} from "@/lib/nhtsa";
import { realInventory } from "@/lib/inventory";
import AlertTicker from "@/components/AlertTicker";
import Sparkline from "@/components/Sparkline";

type TripVolumeFilter = "all" | "high" | "normal" | "low";
type RegionFilter = "san_diego" | "phoenix" | "chicago" | "seattle" | "denver";

// Aggregate parts needed by model
interface ModelAggregate {
  model: string;
  count: number;
  vehicles: FleetVehicle[];
  avgScore: number;
  criticalCount: number;
  recallCount: number;
}

function aggregateByModel(
  vehicles: FleetVehicle[], 
  priorities: ServicePriority[],
  recallMap: Map<string, number>
): ModelAggregate[] {
  const groups: Record<string, ModelAggregate> = {};
  
  for (const v of vehicles) {
    const priority = priorities.find(p => p.vin === v.vin);
    const vehicleRecallCount = recallMap.get(v.vin) || 0;
    
    if (!groups[v.model]) {
      groups[v.model] = { model: v.model, count: 0, vehicles: [], avgScore: 0, criticalCount: 0, recallCount: 0 };
    }
    groups[v.model].count++;
    groups[v.model].vehicles.push(v);
    groups[v.model].recallCount += vehicleRecallCount > 0 ? 1 : 0; // Count vehicles with recalls
    if (priority) {
      groups[v.model].avgScore += priority.priorityScore;
      if (priority.priorityLevel === "critical" || priority.priorityLevel === "high") {
        groups[v.model].criticalCount++;
      }
    }
  }
  
  return Object.values(groups)
    .map(g => ({ ...g, avgScore: Math.round(g.avgScore / g.count) }))
    .sort((a, b) => b.recallCount - a.recallCount || b.criticalCount - a.criticalCount || b.avgScore - a.avgScore);
}

// Common wear parts
const WEAR_PARTS = [
  { sku: "FL-500S", name: "Oil Filter", category: "filters" },
  { sku: "FA-1900", name: "Air Filter", category: "filters" },
  { sku: "FP-88", name: "Cabin Filter", category: "filters" },
  { sku: "BRF-1478", name: "Brake Pads (F)", category: "brakes" },
  { sku: "BRF-1934", name: "Brake Pads (R)", category: "brakes" },
  { sku: "SP-589", name: "Spark Plugs", category: "electrical" },
  { sku: "WW-2201-PF", name: "Wiper Blades", category: "wipers" },
  { sku: "BAGM-48H6-800", name: "Battery", category: "electrical" },
];

function DashboardContent() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [recalls, setRecalls] = useState<NHTSARecall[]>([]);
  const [investigations, setInvestigations] = useState<NHTSAInvestigation[]>([]);
  const [priorities, setPriorities] = useState<ServicePriority[]>([]);
  const [tripFilter, setTripFilter] = useState<TripVolumeFilter>("all");
  const [region, setRegion] = useState<RegionFilter>("san_diego");
  const [selectedModel, setSelectedModel] = useState<string | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<FleetVehicle | null>(null);
  const [vehicleNHTSA, setVehicleNHTSA] = useState<VehicleNHTSAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingVehicle, setLoadingVehicle] = useState(false);
  
  // Map VINs to their recall counts
  const [vehicleRecallMap, setVehicleRecallMap] = useState<Map<string, number>>(new Map());

  // Combined alerts for ticker
  const allAlerts: AlertItem[] = [
    ...recallsToAlerts(recalls),
    ...investigationsToAlerts(investigations),
  ];

  // Environmental stress for selected region
  const envFactors = useMemo(() => {
    return calculateEnvironmentalStress(regionalProfiles[region] || regionalProfiles.san_diego);
  }, [region]);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Avoid Set iteration (can break TS builds when targeting < ES2015)
        const fleetVehicleTypes: { year: number; model: string }[] = [];
        const seen: Record<string, true> = {};
        for (const v of fleetVehicles) {
          const key = `${v.year}:${v.model}`;
          if (!seen[key]) {
            seen[key] = true;
            fleetVehicleTypes.push({ year: v.year, model: v.model });
          }
        }
        
        const [weatherData, recallData, investigationData] = await Promise.all([
          fetchWeatherWithNormals(),
          fetchFleetRecalls(fleetVehicleTypes),
          fetchInvestigations(),
        ]);
        
        setWeather(weatherData);
        setRecalls(recallData);
        setInvestigations(investigationData);
        
        // Build recall map (VIN -> recall count for that year/model)
        const recallMap = new Map<string, number>();
        for (const v of fleetVehicles) {
          const vehicleRecalls = recallData.filter(r => 
            r.Model?.toLowerCase() === v.model.toLowerCase() && 
            parseInt(r.ModelYear) === v.year
          );
          recallMap.set(v.vin, vehicleRecalls.length);
        }
        setVehicleRecallMap(recallMap);
        
        const allPriorities = calculateFleetPriorities(
          fleetVehicles, 
          weatherData, 
          envFactors,
          recallMap
        );
        setPriorities(allPriorities);
      } catch (e) {
        console.error("Dashboard data fetch error:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [envFactors]);

  // When vehicle is selected, fetch its specific NHTSA data
  useEffect(() => {
    if (selectedVehicle) {
      setLoadingVehicle(true);
      fetchVehicleNHTSAData(selectedVehicle.year, selectedVehicle.model)
        .then(data => {
          setVehicleNHTSA(data);
          setLoadingVehicle(false);
        })
        .catch(() => setLoadingVehicle(false));
    } else {
      setVehicleNHTSA(null);
    }
  }, [selectedVehicle]);

  // Filter and aggregate
  const filteredVehicles = filterByTripVolume(fleetVehicles, tripFilter);
  const filteredPriorities = priorities.filter(p => 
    filteredVehicles.some(v => v.vin === p.vin)
  );
  const modelAggregates = aggregateByModel(filteredVehicles, filteredPriorities, vehicleRecallMap);
  const summary = getPrioritySummary(filteredPriorities);
  const fleetStats = getFleetStats();

  // Get vehicles for selected model
  const modelVehicles = selectedModel 
    ? filteredVehicles.filter(v => v.model === selectedModel)
    : [];

  // Get part with price
  const getPartInfo = (sku: string) => realInventory.find(p => p.sku === sku);

  // Count total vehicles with recalls
  let totalVehiclesWithRecalls = 0;
  vehicleRecallMap.forEach((c) => {
    if (c > 0) totalVehiclesWithRecalls += 1;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center">
          <div className="w-6 h-6 border border-neutral-300 border-t-neutral-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-neutral-400">Loading fleet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-24 pt-14">
      {/* Clean Header */}
      <div className="border-b border-neutral-100 sticky top-14 bg-white/95 backdrop-blur-sm z-40">
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-medium text-neutral-900">Fleet</h1>
              <p className="text-sm text-neutral-400 mt-1">
                {fleetStats.totalVehicles} vehicles
                {totalVehiclesWithRecalls > 0 && (
                  <span className="text-red-500 ml-2">{totalVehiclesWithRecalls} with active recalls</span>
                )}
              </p>
            </div>
            <Link href="/" className="text-sm text-neutral-400 hover:text-neutral-900 transition-colors">
              Parts
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        
        {/* Priority Summary + Environmental Factors */}
        <div className="flex items-start justify-between mb-8 pb-8 border-b border-neutral-100">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <span className="text-3xl font-light text-red-500">{summary.critical}</span>
              <span className="text-xs text-neutral-400 uppercase tracking-wide">Critical</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-light text-orange-500">{summary.high}</span>
              <span className="text-xs text-neutral-400 uppercase tracking-wide">High</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-light text-neutral-400">{summary.medium}</span>
              <span className="text-xs text-neutral-400 uppercase tracking-wide">Medium</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-light text-neutral-300">{summary.low}</span>
              <span className="text-xs text-neutral-400 uppercase tracking-wide">Low</span>
            </div>
          </div>
          
          {/* Environment & Filters */}
          <div className="flex flex-col gap-3 items-end">
            {/* Region selector */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-neutral-400">Region:</span>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value as RegionFilter)}
                className="border border-neutral-200 rounded px-2 py-1 text-xs bg-white"
              >
                <option value="san_diego">San Diego (Coastal)</option>
                <option value="phoenix">Phoenix (Desert)</option>
                <option value="chicago">Chicago (Salt/Winter)</option>
                <option value="seattle">Seattle (Rain/Hills)</option>
                <option value="denver">Denver (Mountain)</option>
              </select>
            </div>
            
            {/* Stress indicators */}
            <div className="flex items-center gap-3 text-[10px]">
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Corrosion:</span>
                <span className={envFactors.corrosionRisk > 1.2 ? "text-red-500 font-medium" : "text-green-500"}>
                  {((envFactors.corrosionRisk - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Brakes:</span>
                <span className={envFactors.brakeStress > 1.2 ? "text-orange-500 font-medium" : "text-green-500"}>
                  {((envFactors.brakeStress - 1) * 100).toFixed(0)}%
                </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-neutral-400">Battery:</span>
                <span className={envFactors.batteryStress > 1.2 ? "text-orange-500 font-medium" : "text-green-500"}>
                  {((envFactors.batteryStress - 1) * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            {/* Trip filter */}
            <div className="flex items-center gap-2">
              {(["all", "high", "normal", "low"] as TripVolumeFilter[]).map(v => (
                <button
                  key={v}
                  onClick={() => setTripFilter(v)}
                  className={`px-3 py-1.5 rounded-full text-xs transition-all ${
                    tripFilter === v 
                      ? "bg-neutral-900 text-white" 
                      : "text-neutral-400 hover:text-neutral-900"
                  }`}
                >
                  {v === "all" ? "All Trips" : v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8">
          
          {/* Left: Model Aggregates */}
          <div className="col-span-4 space-y-1">
            <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">By Model</div>
            
            {modelAggregates.map(agg => (
              <button
                key={agg.model}
                onClick={() => {
                  setSelectedModel(selectedModel === agg.model ? null : agg.model);
                  setSelectedVehicle(null);
                }}
                className={`w-full text-left p-4 rounded-lg transition-all ${
                  selectedModel === agg.model 
                    ? "bg-neutral-900 text-white" 
                    : "hover:bg-neutral-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-medium ${selectedModel === agg.model ? "text-white" : "text-neutral-900"}`}>
                      {agg.model}
                    </span>
                    <span className={`text-sm ${selectedModel === agg.model ? "text-neutral-400" : "text-neutral-400"}`}>
                      {agg.count}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {agg.recallCount > 0 && (
                      <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${
                        selectedModel === agg.model 
                          ? "bg-red-500 text-white" 
                          : "bg-red-500 text-white"
                      }`}>
                        RECALL
                      </span>
                    )}
                    {agg.criticalCount > 0 && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        selectedModel === agg.model 
                          ? "bg-orange-500 text-white" 
                          : "bg-orange-50 text-orange-600"
                      }`}>
                        {agg.criticalCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}

            {/* Parts Needed */}
            {selectedModel && (
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">
                  Parts for {selectedModel}s
                </div>
                <div className="space-y-1">
                  {WEAR_PARTS.map(wp => {
                    const part = getPartInfo(wp.sku);
                    return (
                      <Link
                        key={wp.sku}
                        href={`/parts/${wp.sku}`}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-50 transition-colors group"
                      >
                        <div>
                          <span className="text-sm text-neutral-900 group-hover:text-neutral-900">{wp.name}</span>
                          <span className="text-xs text-neutral-300 ml-2">{wp.sku}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-sm text-neutral-900">${part?.price.toFixed(2)}</span>
                          <span className="text-xs text-neutral-400 ml-2">x {modelVehicles.length}</span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
                <div className="mt-4 p-4 bg-neutral-50 rounded-lg">
                  <div className="text-xs text-neutral-400 mb-1">Estimated for all {modelVehicles.length} {selectedModel}s</div>
                  <div className="text-lg font-medium text-neutral-900">
                    ${(WEAR_PARTS.reduce((sum, wp) => sum + (getPartInfo(wp.sku)?.price || 0), 0) * modelVehicles.length).toFixed(2)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Middle: Vehicles in Model */}
          <div className="col-span-4">
            {selectedModel ? (
              <>
                <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">
                  {modelVehicles.length} {selectedModel}s
                </div>
                <div className="space-y-1 max-h-[600px] overflow-y-auto">
                  {modelVehicles
                    .sort((a, b) => {
                      const pa = priorities.find(p => p.vin === a.vin);
                      const pb = priorities.find(p => p.vin === b.vin);
                      return (pb?.priorityScore || 0) - (pa?.priorityScore || 0);
                    })
                    .map(v => {
                      const priority = priorities.find(p => p.vin === v.vin);
                      const isSelected = selectedVehicle?.vin === v.vin;
                      const vehicleRecallCount = vehicleRecallMap.get(v.vin) || 0;
                      
                      return (
                        <button
                          key={v.vin}
                          onClick={() => setSelectedVehicle(isSelected ? null : v)}
                          className={`w-full text-left p-4 rounded-lg transition-all ${
                            isSelected ? "bg-neutral-900 text-white" : "hover:bg-neutral-50"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-medium ${isSelected ? "text-white" : "text-neutral-900"}`}>
                                {v.fleetId}
                              </span>
                              {vehicleRecallCount > 0 && (
                                <span className={`text-[10px] px-1.5 py-0.5 font-medium rounded ${
                                  isSelected ? "bg-red-400 text-white" : "bg-red-500 text-white"
                                }`}>
                                  {vehicleRecallCount} RECALL{vehicleRecallCount > 1 ? "S" : ""}
                                </span>
                              )}
                            </div>
                            <span className={`text-lg font-light ${
                              priority?.priorityLevel === "critical" ? "text-red-500" :
                              priority?.priorityLevel === "high" ? "text-orange-500" :
                              isSelected ? "text-neutral-400" : "text-neutral-300"
                            }`}>
                              {priority?.priorityScore || 0}
                            </span>
                          </div>
                          <div className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-400"}`}>
                            {v.odometer.toLocaleString()} mi · {v.year}
                          </div>
                        </button>
                      );
                    })}
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-300">
                <div className="text-center">
                  <div className="text-sm">Select a model</div>
                </div>
              </div>
            )}
          </div>

          {/* Right: Vehicle Detail */}
          <div className="col-span-4">
            {selectedVehicle ? (
              <div className="space-y-6">
                {/* Vehicle Info */}
                {(() => {
                  const vehiclePriority = priorities.find(p => p.vin === selectedVehicle.vin);
                  const score = vehiclePriority?.priorityScore || 0;
                  const level = vehiclePriority?.priorityLevel || "low";
                  const vehicleRecallCount = vehicleRecallMap.get(selectedVehicle.vin) || 0;
                  
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h2 className="text-xl font-medium text-neutral-900">
                              {selectedVehicle.year} {selectedVehicle.model}
                            </h2>
                            {vehicleRecallCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 bg-red-500 text-white font-medium rounded">
                                RECALL
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-neutral-400">{selectedVehicle.trim}</p>
                        </div>
                        <div className="text-right">
                          <div className={`text-3xl font-light ${
                            level === "critical" ? "text-red-500" : 
                            level === "high" ? "text-orange-500" : 
                            level === "medium" ? "text-yellow-600" : "text-green-500"
                          }`}>
                            {score}
                          </div>
                          <div className="text-xs text-neutral-400">Priority Score</div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-neutral-400">Odometer</div>
                          <div className="text-neutral-900">{selectedVehicle.odometer.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-neutral-400">Next Service</div>
                          <div className="text-neutral-900">{new Date(selectedVehicle.nextServiceDue).toLocaleDateString()}</div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Ford Alerts */}
                {selectedVehicle.fordAlerts.length > 0 && (
                  <div className="p-4 bg-red-50 rounded-lg">
                    <div className="text-xs text-red-600 uppercase tracking-wide mb-2">Ford Alerts</div>
                    {selectedVehicle.fordAlerts.map((alert, i) => (
                      <div key={i} className="text-sm text-red-700">{alert}</div>
                    ))}
                  </div>
                )}

                {/* NHTSA Recalls - Prominent */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-xs text-neutral-400 uppercase tracking-wide">NHTSA Recalls</div>
                    {loadingVehicle ? (
                      <div className="w-4 h-4 border border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
                    ) : (
                      <span className={`text-sm font-medium ${
                        vehicleNHTSA && vehicleNHTSA.recallCount > 0 ? "text-red-500" : "text-green-500"
                      }`}>
                        {vehicleNHTSA?.recallCount || 0}
                      </span>
                    )}
                  </div>

                  {vehicleNHTSA && vehicleNHTSA.recalls.length > 0 ? (
                    <div className="space-y-3">
                      {vehicleNHTSA.recalls.slice(0, 4).map(recall => (
                        <a
                          key={recall.NHTSACampaignNumber}
                          href={`https://www.nhtsa.gov/recalls?nhtsaId=${recall.NHTSACampaignNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block p-4 border border-red-100 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-mono text-red-500">{recall.NHTSACampaignNumber}</span>
                          </div>
                          <div className="text-sm font-medium text-neutral-900 mb-1">
                            {recall.Component}
                          </div>
                          <div className="text-xs text-neutral-500 line-clamp-2">
                            {recall.Summary}
                          </div>
                        </a>
                      ))}
                      {vehicleNHTSA.recalls.length > 4 && (
                        <p className="text-xs text-neutral-400 text-center">
                          + {vehicleNHTSA.recalls.length - 4} more
                        </p>
                      )}
                    </div>
                  ) : !loadingVehicle && (
                    <div className="p-4 bg-green-50 rounded-lg text-sm text-green-700">
                      No open recalls
                    </div>
                  )}
                </div>

                {/* DTC Outliers - Cohort Analysis */}
                {(() => {
                  const dtcProfile = getCohortDTCProfile(selectedVehicle.year, selectedVehicle.model);
                  if (!dtcProfile) return null;
                  
                  return (
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-xs text-neutral-400 uppercase tracking-wide">DTC Outliers</div>
                        <div className="text-[10px] text-neutral-400">
                          Cohort: {dtcProfile.cohortSize.toLocaleString()} vehicles
                        </div>
                      </div>
                      
                      {/* Category sparklines */}
                      <div className="grid grid-cols-2 gap-2 mb-4">
                        {Object.entries(dtcProfile.dtcsByCategory).map(([cat, data]) => {
                          const category = DTC_CATEGORIES.find(c => c.id === cat);
                          return (
                            <div key={cat} className="flex items-center justify-between p-2 bg-neutral-50 rounded">
                              <span className="text-xs text-neutral-600">{category?.name || cat}</span>
                              <Sparkline data={data} width={50} height={16} color="#6b7280" />
                            </div>
                          );
                        })}
                      </div>
                      
                      {/* Top outliers to check */}
                      {dtcProfile.topOutliers.length > 0 && (
                        <div className="p-3 border border-amber-100 bg-amber-50 rounded-lg">
                          <div className="text-xs text-amber-700 font-medium mb-2">
                            Will check at service:
                          </div>
                          <div className="space-y-1">
                            {dtcProfile.topOutliers.slice(0, 3).map(dtc => (
                              <div key={dtc.code} className="flex items-start gap-2 text-xs">
                                <span className="font-mono text-amber-600">{dtc.code}</span>
                                <span className="text-neutral-600 truncate">{dtc.description}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Priority Factors */}
                {(() => {
                  const vehiclePriority = priorities.find(p => p.vin === selectedVehicle.vin);
                  if (!vehiclePriority) return null;
                  
                  return (
                    <div>
                      <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Priority Factors</div>
                      <div className="space-y-2">
                        {vehiclePriority.factors.slice(0, 5).map((factor, i) => (
                          <div key={i} className="flex items-center justify-between text-sm">
                            <span className="text-neutral-500">{factor.name}</span>
                            <span className="text-neutral-900">{factor.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* Quick Order */}
                <Link
                  href={`/?model=${encodeURIComponent(selectedVehicle.model.toLowerCase())}&year=${selectedVehicle.year}`}
                  className="block w-full p-4 bg-neutral-900 text-white text-center rounded-lg hover:bg-neutral-800 transition-colors"
                >
                  Order Parts for This Vehicle
                </Link>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-300">
                <div className="text-center">
                  <div className="text-sm">Select a vehicle</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Alert Ticker */}
      <AlertTicker alerts={allAlerts} />
    </div>
  );
}

// Wrapper to check mode
function DashboardWrapper() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];
  
  // Dashboard only available in commerce mode
  if (!config.features.fleet) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl font-extralight text-neutral-200 mb-6">Fleet</div>
          <p className="text-neutral-500 mb-8">
            Fleet management is only available in Commerce mode. 
            Switch modes to access fleet dashboard, vehicle tracking, and service priority.
          </p>
          <Link 
            href="/?mode=commerce"
            className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Switch to Commerce Mode
          </Link>
        </div>
      </div>
    );
  }
  
  return <DashboardContent />;
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pt-14" />}>
      <DashboardWrapper />
    </Suspense>
  );
}
