"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { fleetVehicles } from "@/lib/fleet";
import { fetchWeather, SimpleWeatherData } from "@/lib/weather";
import { fetchRecalls, NHTSARecall } from "@/lib/nhtsa";
import { getEnvironmentalPreset, ENVIRONMENT_PRESETS } from "@/lib/environmentalFactors";
import { 
  calculateVehicleRisk, 
  VehicleRiskResult, 
  compareToFleetCohort,
  generateDTCSparklines,
  SparklineData,
  setWeatherConditions,
  initWASM,
} from "@/lib/wasm/riskEngine";
import {
  getSortValue,
  BEHAVIORAL_SORT_OPTIONS,
  type BehavioralSortKey,
  getBehavioralContext,
} from "@/lib/vinBehavioralContext";
import {
  getGovernanceBand,
  derivePosteriorFromVehicle,
  BAND_ACTIONS,
  getBandReason,
  GOVERNANCE_VALUE_PROP,
} from "@/lib/governanceMatrix";
import { WEAR_PARTS } from "@/lib/wearParts";
import { realInventory } from "@/lib/inventory";
import { WeatherCanvas, getWeatherType, WeatherType } from "@/components/fleet/WeatherCanvas";
import { RiskVisualization, RiskMeter } from "@/components/fleet/RiskVisualization";
import { Sparkline } from "@/components/Sparkline";

export default function FleetIntelligencePage() {
  // State
  const [region, setRegion] = useState<string>("san-diego");
  const [weather, setWeather] = useState<SimpleWeatherData | null>(null);
  const [weatherType, setWeatherType] = useState<WeatherType>("clear");
  const [selectedVIN, setSelectedVIN] = useState<string | null>(null);
  const [vehicleRecalls, setVehicleRecalls] = useState<Map<string, NHTSARecall[]>>(new Map());
  const [vehicleRisks, setVehicleRisks] = useState<Map<string, VehicleRiskResult>>(new Map());
  const [dtcSparklines, setDtcSparklines] = useState<SparklineData[]>([]);
  const [isCalculating, setIsCalculating] = useState(true);
  const [behavioralSort, setBehavioralSort] = useState<BehavioralSortKey>("priority_index");

  // Initialize Risk Engine on mount
  useEffect(() => {
    initWASM().then((success) => {
      if (success) {
        console.log('[Fleet] Risk engine loaded');
      } else {
        console.log('[Fleet] Using JavaScript fallback for risk calculations');
      }
    });
  }, []);

  // Get environment preset
  const envPreset = useMemo(() => getEnvironmentalPreset(region), [region]);

  // Fetch weather data
  useEffect(() => {
    async function loadWeather() {
      try {
        const data = await fetchWeather(envPreset.lat, envPreset.lon);
        setWeather(data);
        
        // Determine weather type
        const type = getWeatherType(
          data.current.temperature,
          data.current.precipProbability / 100,
          data.current.humidity
        );
        setWeatherType(type);
        
        // Set weather in risk engine
        setWeatherConditions({
          temperature: data.current.temperature,
          humidity: data.current.humidity,
          precipitation: data.current.precipProbability / 100,
          tempVariance: Math.abs(data.forecast[0]?.high - data.forecast[0]?.low) || 15,
        });
      } catch (e) {
        console.error("Weather fetch failed:", e);
      }
    }
    loadWeather();
  }, [envPreset]);

  // Fetch recalls for all vehicles
  useEffect(() => {
    async function loadRecalls() {
      const recallMap = new Map<string, NHTSARecall[]>();
      const uniqueVehicles: string[] = [];
      const seen: Record<string, true> = {};
      for (const v of fleetVehicles) {
        const key = `${v.year}-${v.model}`;
        if (!seen[key]) {
          seen[key] = true;
          uniqueVehicles.push(key);
        }
      }
      
      for (const key of uniqueVehicles) {
        const [year, model] = key.split("-");
        try {
          const recalls = await fetchRecalls(parseInt(year), model);
          fleetVehicles
            .filter(v => v.year === parseInt(year) && v.model === model)
            .forEach(v => recallMap.set(v.vin, recalls));
        } catch {
          // Skip on error
        }
      }
      setVehicleRecalls(recallMap);
    }
    loadRecalls();
  }, []);

  // Calculate risk for all vehicles
  useEffect(() => {
    setIsCalculating(true);
    
    const riskMap = new Map<string, VehicleRiskResult>();
    
    fleetVehicles.forEach(vehicle => {
      const recalls = vehicleRecalls.get(vehicle.vin) || [];
      const currentYear = new Date().getFullYear();
      const ageYears = currentYear - vehicle.year;
      
      // Generate mock DTCs based on vehicle state
      const healthFactor = (100 - vehicle.fordHealthScore) / 100;
      const mileageFactor = vehicle.odometer / 150000;
      
      const dtcs = {
        powertrain: Math.round((healthFactor * 2 + mileageFactor) * (0.5 + Math.random())),
        body: Math.round((healthFactor * 1.5) * (0.5 + Math.random())),
        chassis: Math.round((healthFactor * 1.2 + mileageFactor * 0.5) * (0.5 + Math.random())),
        network: Math.round((healthFactor * 1.8) * (0.5 + Math.random())),
      };

      const result = calculateVehicleRisk({
        vin: vehicle.vin,
        mileage: vehicle.odometer,
        ageYears,
        healthScore: vehicle.fordHealthScore,
        dtcs,
        environment: {
          rustExposure: envPreset.factors.rustExposure,
          stopGoFactor: envPreset.factors.stopGoFactor,
          terrainFactor: envPreset.factors.terrainFactor,
          thermalFactor: envPreset.factors.thermalFactor,
        },
        activeRecalls: recalls.length,
      });

      riskMap.set(vehicle.vin, result);
    });

    setVehicleRisks(riskMap);
    setIsCalculating(false);
  }, [vehicleRecalls, envPreset]);

  // Generate sparklines when vehicle is selected
  useEffect(() => {
    if (!selectedVIN) {
      setDtcSparklines([]);
      return;
    }

    const vehicle = fleetVehicles.find(v => v.vin === selectedVIN);
    const risk = vehicleRisks.get(selectedVIN);
    
    if (vehicle && risk) {
      const healthFactor = (100 - vehicle.fordHealthScore) / 100;
      const mileageFactor = vehicle.odometer / 150000;
      
      // Generate DTC sparklines
      const sparklines = generateDTCSparklines(selectedVIN, {
        powertrain: Math.round((healthFactor * 2 + mileageFactor) * 1.2),
        body: Math.round(healthFactor * 1.5),
        chassis: Math.round((healthFactor * 1.2 + mileageFactor * 0.5) * 1.1),
        network: Math.round(healthFactor * 1.8),
      });
      setDtcSparklines(sparklines);
    }
  }, [selectedVIN, vehicleRisks, envPreset]);

  // Selected vehicle data
  const selectedVehicle = selectedVIN ? fleetVehicles.find(v => v.vin === selectedVIN) : null;
  const selectedRisk = selectedVIN ? vehicleRisks.get(selectedVIN) : null;
  const selectedRecalls = selectedVIN ? (vehicleRecalls.get(selectedVIN) || []) : [];
  const cohortComparison = selectedRisk ? compareToFleetCohort(selectedRisk, 2500) : null;

  // Sort vehicles by behavioral context (VIN Behavioral Context Layer)
  const sortedVehicles = useMemo(() => {
    return [...fleetVehicles].sort((a, b) => {
      const valA = getSortValue(a.vin, behavioralSort, {
        fleetId: a.fleetId,
        tripVolume: a.tripVolume,
      });
      const valB = getSortValue(b.vin, behavioralSort, {
        fleetId: b.fleetId,
        tripVolume: b.tripVolume,
      });
      return valB - valA; // higher = engage first
    });
  }, [behavioralSort]);

  // Governance band counts (for "why governance is effective" summary)
  const governanceCounts = useMemo(() => {
    let escalated = 0, monitor = 0, suppressed = 0;
    fleetVehicles.forEach(v => {
      const risk = vehicleRisks.get(v.vin);
      if (!risk) return;
      const post = derivePosteriorFromVehicle(v, risk.posterior, 5, true);
      const band = getGovernanceBand(post);
      if (band === "ESCALATED") escalated++;
      else if (band === "MONITOR") monitor++;
      else suppressed++;
    });
    return { escalated, monitor, suppressed };
  }, [vehicleRisks]);

  const wouldEscalateOnPAlone = useMemo(() => {
    return fleetVehicles.filter(v => {
      const risk = vehicleRisks.get(v.vin);
      return risk && risk.posterior >= 0.85;
    }).length;
  }, [vehicleRisks]);

  return (
    <div className="min-h-screen bg-white relative">
      {/* Weather-responsive background */}
      <WeatherCanvas 
        weatherType={weatherType}
        temperature={weather?.current.temperature || 70}
        intensity={0.6}
      />

      {/* Content */}
      <div className="relative z-10 pt-16 pb-24">
        {/* Header */}
        <header className="max-w-7xl mx-auto px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs tracking-widest text-neutral-400 uppercase mb-1">Fleet Intelligence</div>
              <h1 className="text-3xl font-light text-neutral-900">Risk Analysis</h1>
            </div>
            
            {/* Region Selector */}
            <div className="flex items-center gap-4">
              <label className="text-xs text-neutral-400 uppercase tracking-wide">Region</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="px-4 py-2 bg-white border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-neutral-300"
              >
                {ENVIRONMENT_PRESETS.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Weather & Environment Summary */}
          {weather && (
            <div className="mt-6 flex items-center gap-8 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Current</span>
                <span className="font-medium text-neutral-900">
                  {Math.round(weather.current.temperature)}°F
                </span>
                <span className="text-neutral-400 capitalize">
                  {weather.current.conditions}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Humidity</span>
                <span className="font-medium text-neutral-900">{weather.current.humidity}%</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-neutral-400">Env Stress</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                  envPreset.severity === "high" ? "bg-red-100 text-red-700" :
                  envPreset.severity === "medium" ? "bg-amber-100 text-amber-700" :
                  "bg-green-100 text-green-700"
                }`}>
                  {envPreset.severity.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </header>

        {/* Governance value prop + band counts — why governance is effective */}
        {!isCalculating && (
          <div className="max-w-7xl mx-auto px-8 -mt-2 mb-6">
            <div className="bg-neutral-50 border border-neutral-100 rounded-xl px-6 py-4">
              <p className="text-sm text-neutral-600 mb-3">{GOVERNANCE_VALUE_PROP}</p>
              <div className="flex items-center gap-6 text-sm">
                <span className="font-medium text-neutral-900">Band summary:</span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  <span className="text-red-700 font-medium">{governanceCounts.escalated} ESCALATED</span>
                  <span className="text-neutral-400">(order parts)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-amber-700 font-medium">{governanceCounts.monitor} MONITOR</span>
                  <span className="text-neutral-400">(track)</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-green-700 font-medium">{governanceCounts.suppressed} SUPPRESSED</span>
                  <span className="text-neutral-400">(no action)</span>
                </span>
                {wouldEscalateOnPAlone > governanceCounts.escalated && (
                  <span className="ml-auto text-xs text-neutral-500 bg-white px-2 py-1 rounded border border-neutral-100">
                    If we used P alone: {wouldEscalateOnPAlone} would escalate. With P+C+S: {governanceCounts.escalated} — {wouldEscalateOnPAlone - governanceCounts.escalated} false alarms avoided.
                  </span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Main Grid */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left: Vehicle List */}
            <div className="col-span-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium text-neutral-900">Fleet Vehicles</h2>
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-neutral-400 whitespace-nowrap">Sort by</label>
                    <select
                      value={behavioralSort}
                      onChange={(e) => setBehavioralSort(e.target.value as BehavioralSortKey)}
                      className="text-xs px-2 py-1.5 bg-white border border-neutral-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-neutral-300"
                    >
                      {BEHAVIORAL_SORT_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                    <span className="text-xs text-neutral-400">{fleetVehicles.length} total</span>
                  </div>
                </div>

                {isCalculating ? (
                  <div className="py-12 text-center text-neutral-400">
                    <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-600 rounded-full animate-spin mx-auto mb-3" />
                    Calculating risk...
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[600px] overflow-y-auto">
                    {sortedVehicles.map(vehicle => {
                      const risk = vehicleRisks.get(vehicle.vin);
                      const recalls = vehicleRecalls.get(vehicle.vin) || [];
                      const isSelected = selectedVIN === vehicle.vin;
                      const behavioral = getBehavioralContext(vehicle.vin, {
                        fleetId: vehicle.fleetId,
                        tripVolume: vehicle.tripVolume,
                      });
                      const post = risk
                        ? derivePosteriorFromVehicle(vehicle, risk.posterior, 5, true)
                        : null;
                      const band = post ? getGovernanceBand(post) : null;

                      return (
                        <button
                          key={vehicle.vin}
                          onClick={() => setSelectedVIN(vehicle.vin)}
                          className={`w-full flex items-center justify-between p-4 rounded-xl transition-all ${
                            isSelected 
                              ? "bg-neutral-900 text-white" 
                              : "bg-neutral-50 hover:bg-neutral-100"
                          }`}
                        >
                          <div className="flex items-center gap-4">
                            <RiskMeter score={risk?.priorityScore || 0} size={40} />
                            <div className="text-left">
                              <div className={`font-medium ${isSelected ? "text-white" : "text-neutral-900"}`}>
                                {vehicle.year} {vehicle.model}
                              </div>
                              <div className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                                {vehicle.vin.slice(-6)} · {vehicle.odometer.toLocaleString()} mi
                              </div>
                              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {band && (
                                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                    band === "ESCALATED" ? (isSelected ? "bg-red-500/80 text-white" : "bg-red-100 text-red-700") :
                                    band === "MONITOR" ? (isSelected ? "bg-amber-500/80 text-white" : "bg-amber-100 text-amber-700") :
                                    isSelected ? "bg-neutral-700 text-neutral-200" : "bg-neutral-200 text-neutral-600"
                                  }`}>
                                    {band}
                                  </span>
                                )}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  isSelected ? "bg-neutral-700 text-neutral-200" : "bg-neutral-200 text-neutral-600"
                                }`}>
                                  {behavioral.vas.activity_state}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                                  isSelected ? "bg-neutral-700 text-neutral-200" : "bg-neutral-200 text-neutral-600"
                                }`}>
                                  TSI {behavioral.tsi.stress_band}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {recalls.length > 0 && (
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                                isSelected ? "bg-red-500 text-white" : "bg-red-100 text-red-700"
                              }`}>
                                RECALL
                              </span>
                            )}
                            <span className={`text-xs ${isSelected ? "text-neutral-400" : "text-neutral-400"}`}>
                              →
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right: Vehicle Detail */}
            <div className="col-span-8">
              {selectedVehicle && selectedRisk && cohortComparison ? (
                <div className="space-y-6">
                  {/* Risk Visualization */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 overflow-hidden">
                    <div className="p-6 border-b border-neutral-100">
                      <div className="flex items-center justify-between">
                        <div>
                          <h2 className="text-xl font-medium text-neutral-900">
                            {selectedVehicle.year} Ford {selectedVehicle.model}
                          </h2>
                          <p className="text-sm text-neutral-500 mt-1">
                            VIN: {selectedVehicle.vin}
                          </p>
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-light text-neutral-900">
                            {selectedRisk.priorityScore}
                          </div>
                          <div className="text-xs text-neutral-400 uppercase tracking-wide">
                            Priority Score
                          </div>
                        </div>
                      </div>
                      {/* Governance (PRD): P from WASM risk → band → wear parts & order */}
                      {(() => {
                        const posterior = derivePosteriorFromVehicle(
                          selectedVehicle,
                          selectedRisk.posterior,
                          5,
                          true
                        );
                        const band = getGovernanceBand(posterior);
                        const { label, action, cta } = BAND_ACTIONS[band];
                        return (
                          <div className="mt-4 space-y-3">
                            <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-100">
                              <div className="text-[10px] text-neutral-400 uppercase tracking-wide mb-2">
                                Governance band · P from risk engine
                              </div>
                              <div className="flex items-center gap-3 text-xs flex-wrap">
                                <span className="text-neutral-500">P={posterior.P.toFixed(2)}</span>
                                <span className="text-neutral-500">C={posterior.C.toFixed(2)}</span>
                                <span className="text-neutral-500">S={posterior.S}d</span>
                                <span className={`ml-auto px-2 py-0.5 rounded font-medium ${
                                  band === "ESCALATED" ? "bg-red-100 text-red-700" :
                                  band === "MONITOR" ? "bg-amber-100 text-amber-700" :
                                  "bg-green-100 text-green-700"
                                }`}>
                                  {label}
                                </span>
                              </div>
                              <div className="text-[10px] text-neutral-500 mt-1">{action}</div>
                              <p className="text-[10px] text-neutral-400 mt-1.5 italic">
                                Why this band: {getBandReason(band, posterior)}
                              </p>
                            </div>
                            {band === "ESCALATED" && (
                              <div className="p-3 bg-red-50/80 border border-red-100 rounded-lg">
                                <div className="text-[10px] text-red-700 uppercase tracking-wide mb-2">
                                  Wear parts at risk
                                </div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {WEAR_PARTS.slice(0, 5).map(wp => {
                                    const part = realInventory.find(p => p.sku === wp.sku);
                                    return (
                                      <Link
                                        key={wp.sku}
                                        href={`/parts/${wp.sku}`}
                                        className="text-xs px-2 py-1 bg-white border border-red-100 rounded hover:border-red-300"
                                      >
                                        {wp.name} {part && `$${part.price.toFixed(0)}`}
                                      </Link>
                                    );
                                  })}
                                </div>
                                <Link
                                  href={`/?mode=commerce&year=${selectedVehicle.year}&model=${selectedVehicle.model}`}
                                  className="text-xs font-medium text-red-700 hover:text-red-900"
                                >
                                  {cta} →
                                </Link>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>

                    <RiskVisualization
                      vehicleRisk={selectedRisk}
                      cohortComparison={cohortComparison}
                      className="h-[350px]"
                    />
                  </div>

                  {/* DTC Sparklines */}
                  {dtcSparklines.length > 0 && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-6">
                      <h3 className="text-sm font-medium text-neutral-900 mb-4">
                        DTC Trend Analysis
                        <span className="text-neutral-400 font-normal ml-2">(12-week history)</span>
                      </h3>
                      
                      <div className="grid grid-cols-4 gap-6">
                        {dtcSparklines.map(sparkline => (
                          <div key={sparkline.category} className="space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs text-neutral-500 capitalize">
                                {sparkline.category}
                              </span>
                              <span className={`text-xs font-medium ${
                                sparkline.trend === "worsening" ? "text-red-600" :
                                sparkline.trend === "improving" ? "text-green-600" :
                                "text-neutral-400"
                              }`}>
                                {sparkline.trend === "worsening" ? "↑" :
                                 sparkline.trend === "improving" ? "↓" : "→"}
                              </span>
                            </div>
                            <Sparkline
                              data={sparkline.values}
                              width={150}
                              height={40}
                              strokeColor={
                                sparkline.currentZScore > 2 ? "#ef4444" :
                                sparkline.currentZScore > 1 ? "#f59e0b" :
                                "#22c55e"
                              }
                            />
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-neutral-400">z-score</span>
                              <span className={`font-mono ${
                                sparkline.currentZScore > 2 ? "text-red-600" :
                                sparkline.currentZScore > 1 ? "text-amber-600" :
                                "text-green-600"
                              }`}>
                                {sparkline.currentZScore.toFixed(2)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* NHTSA Recalls */}
                  {selectedRecalls.length > 0 && (
                    <div className="bg-red-50 border border-red-100 rounded-2xl p-6">
                      <h3 className="text-sm font-medium text-red-900 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                        Active NHTSA Recalls ({selectedRecalls.length})
                      </h3>
                      <div className="space-y-4">
                        {selectedRecalls.slice(0, 3).map((recall, idx) => (
                          <div key={idx} className="bg-white rounded-lg p-4">
                            <div className="font-medium text-red-900 text-sm mb-1">
                              {recall.Component}
                            </div>
                            <p className="text-xs text-neutral-600 line-clamp-2">
                              {recall.Summary}
                            </p>
                            <div className="mt-2 text-xs text-neutral-400">
                              Campaign: {recall.NHTSACampaignNumber}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Outlier Categories */}
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-6">
                    <h3 className="text-sm font-medium text-neutral-900 mb-4">
                      Outlier Detection vs. Cohort
                    </h3>
                    <div className="grid grid-cols-4 gap-4">
                      {Object.entries(selectedRisk.outlierCategories).map(([cat, data]) => (
                        <div 
                          key={cat}
                          className={`p-4 rounded-xl ${
                            data.status === "critical_outlier" ? "bg-red-50 border border-red-200" :
                            data.status === "moderate_outlier" ? "bg-amber-50 border border-amber-200" :
                            data.status === "watch" ? "bg-yellow-50 border border-yellow-200" :
                            "bg-neutral-50 border border-neutral-100"
                          }`}
                        >
                          <div className="text-xs text-neutral-500 capitalize mb-1">{cat}</div>
                          <div className={`text-lg font-medium ${
                            data.status === "critical_outlier" ? "text-red-700" :
                            data.status === "moderate_outlier" ? "text-amber-700" :
                            data.status === "watch" ? "text-yellow-700" :
                            "text-green-700"
                          }`}>
                            {data.zScore.toFixed(1)}σ
                          </div>
                          <div className={`text-xs mt-1 ${
                            data.status === "critical_outlier" ? "text-red-600" :
                            data.status === "moderate_outlier" ? "text-amber-600" :
                            data.status === "watch" ? "text-yellow-600" :
                            "text-green-600"
                          }`}>
                            {data.status.replace("_", " ").toUpperCase()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions — risk → governance → wear parts → order */}
                  {(() => {
                    const posterior = derivePosteriorFromVehicle(
                      selectedVehicle,
                      selectedRisk.posterior,
                      5,
                      true
                    );
                    const band = getGovernanceBand(posterior);
                    const isEscalated = band === "ESCALATED";
                    return (
                      <div className="flex flex-col gap-3">
                        {isEscalated && (
                          <Link
                            href={`/?mode=commerce&year=${selectedVehicle.year}&model=${selectedVehicle.model}`}
                            className="w-full py-3 bg-red-600 text-white rounded-xl text-center text-sm font-medium hover:bg-red-700 transition-colors"
                          >
                            Order wear parts (ESCALATED)
                          </Link>
                        )}
                        <div className="flex items-center gap-4">
                          <Link
                            href={`/dashboard?mode=commerce&vin=${selectedVehicle.vin}`}
                            className="flex-1 py-3 bg-neutral-900 text-white rounded-xl text-center text-sm font-medium hover:bg-neutral-800 transition-colors"
                          >
                            View in Dashboard
                          </Link>
                          <Link
                            href={`/?mode=commerce&year=${selectedVehicle.year}&model=${selectedVehicle.model}`}
                            className="flex-1 py-3 bg-neutral-100 text-neutral-900 rounded-xl text-center text-sm font-medium hover:bg-neutral-200 transition-colors"
                          >
                            {isEscalated ? "Browse parts" : "Order parts"}
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-12 text-center">
                  <div className="text-neutral-400 mb-2">Select a vehicle</div>
                  <div className="text-sm text-neutral-300">
                    to view risk analysis and cohort comparison
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
