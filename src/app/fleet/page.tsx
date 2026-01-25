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

  // Sort vehicles by priority
  const sortedVehicles = useMemo(() => {
    return [...fleetVehicles].sort((a, b) => {
      const riskA = vehicleRisks.get(a.vin)?.priorityScore || 0;
      const riskB = vehicleRisks.get(b.vin)?.priorityScore || 0;
      return riskB - riskA;
    });
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

        {/* Main Grid */}
        <div className="max-w-7xl mx-auto px-8">
          <div className="grid grid-cols-12 gap-8">
            
            {/* Left: Vehicle List */}
            <div className="col-span-4">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-sm font-medium text-neutral-900">Fleet Vehicles</h2>
                  <span className="text-xs text-neutral-400">
                    {fleetVehicles.length} total
                  </span>
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

                  {/* Actions */}
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
                      Order Parts
                    </Link>
                  </div>
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
