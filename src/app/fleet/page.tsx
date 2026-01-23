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
  calculateFailureProbability,
  StressorInput,
  FailureProbabilityResult,
  ALL_STRESSORS,
  BASE_FAILURE_RATE,
  initWASM,
  isWASMAvailable,
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
  const [stressorResult, setStressorResult] = useState<FailureProbabilityResult | null>(null);
  const [wasmLoaded, setWasmLoaded] = useState(false);

  // Initialize WASM on mount
  useEffect(() => {
    initWASM().then((success) => {
      setWasmLoaded(success);
      if (success) {
        console.log('[Fleet] WASM risk engine loaded');
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
      const uniqueVehicles = [...new Set(fleetVehicles.map(v => `${v.year}-${v.model}`))];
      
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

  // Generate sparklines and stressor analysis when vehicle is selected
  useEffect(() => {
    if (!selectedVIN) {
      setDtcSparklines([]);
      setStressorResult(null);
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

      // Calculate stressor-based failure probability
      // Derive stressor inputs from environment preset and vehicle data
      const stressorInput: StressorInput = {
        // Weather - derive from environment preset
        daysOver95F: envPreset.id === "phoenix" ? 145 : 
                     envPreset.id === "miami" ? 90 :
                     envPreset.id === "dallas" ? 85 :
                     envPreset.id === "san-diego" ? 25 : 15,
        daysBelow10F: envPreset.id === "chicago" ? 25 :
                      envPreset.id === "detroit" ? 30 :
                      envPreset.id === "denver" ? 15 : 0,
        // Trip patterns - derive from mileage and health
        shortTripRatio: 0.3 + (healthFactor * 0.4), // Higher health issues = more short trips
        dailyStarts: 3 + (healthFactor * 4), // More starts if unhealthy
        // Terrain - from preset
        dailyElevationChange: envPreset.id === "denver" ? 800 :
                              envPreset.id === "seattle" ? 300 :
                              envPreset.id === "san-diego" ? 150 : 50,
        // Corrosion - from preset
        saltDaysPerYear: envPreset.factors.rustExposure * 1.5,
        coastalExposure: envPreset.id === "san-diego" || 
                         envPreset.id === "miami" || 
                         envPreset.id === "seattle",
      };
      
      const result = calculateFailureProbability(stressorInput);
      setStressorResult(result);
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
                              {recall.component}
                            </div>
                            <p className="text-xs text-neutral-600 line-clamp-2">
                              {recall.summary}
                            </p>
                            <div className="mt-2 text-xs text-neutral-400">
                              Campaign: {recall.nhtsaCampaignNumber}
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

                  {/* Stressor Analysis (from PRD) */}
                  {stressorResult && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-neutral-100 p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-neutral-900">
                          VIN Stressor Analysis
                        </h3>
                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                          stressorResult.riskTier.id === "critical" ? "bg-red-100 text-red-700" :
                          stressorResult.riskTier.id === "high" ? "bg-amber-100 text-amber-700" :
                          stressorResult.riskTier.id === "moderate" ? "bg-yellow-100 text-yellow-700" :
                          "bg-green-100 text-green-700"
                        }`}>
                          {stressorResult.riskTier.name}
                        </div>
                      </div>

                      {/* Failure Probability */}
                      <div className="mb-6 p-4 bg-neutral-50 rounded-xl">
                        <div className="flex items-baseline gap-3">
                          <span className="text-4xl font-light text-neutral-900">
                            {(stressorResult.probability * 100).toFixed(1)}%
                          </span>
                          <span className="text-sm text-neutral-500">
                            failure probability
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-neutral-400">
                          Base rate {(stressorResult.baseRate * 100).toFixed(1)}% × 
                          Combined multiplier {stressorResult.combinedMultiplier.toFixed(2)}x
                        </div>
                      </div>

                      {/* Active Stressors */}
                      <div className="space-y-3 mb-6">
                        {stressorResult.stressors
                          .filter(s => s.isActive)
                          .sort((a, b) => b.contribution - a.contribution)
                          .map(stressor => (
                            <div key={stressor.id} className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className={`w-2 h-2 rounded-full ${
                                  stressor.contribution > 2 ? "bg-red-500" :
                                  stressor.contribution > 1.5 ? "bg-amber-500" :
                                  "bg-yellow-500"
                                }`} />
                                <span className="text-sm text-neutral-700">{stressor.name}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-neutral-400">
                                  LR: {stressor.likelihoodRatio}x
                                </span>
                                <span className="text-xs text-neutral-400">
                                  I: {(stressor.intensity * 100).toFixed(0)}%
                                </span>
                                <span className="text-sm font-medium text-neutral-900">
                                  {stressor.contribution.toFixed(2)}x
                                </span>
                              </div>
                            </div>
                          ))}
                      </div>

                      {/* Revenue Opportunity */}
                      <div className="flex items-center justify-between p-4 bg-neutral-900 rounded-xl text-white">
                        <div>
                          <div className="text-xs text-neutral-400">Service Revenue Opportunity</div>
                          <div className="text-2xl font-light">${stressorResult.revenueOpportunity}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-neutral-400">Primary Risk</div>
                          <div className="text-sm">{stressorResult.primaryRisk}</div>
                        </div>
                      </div>

                      {/* Recommended Parts */}
                      {stressorResult.recommendedParts.length > 0 && (
                        <div className="mt-4">
                          <div className="text-xs text-neutral-400 mb-2">Recommended Parts</div>
                          <div className="flex flex-wrap gap-2">
                            {stressorResult.recommendedParts.map(sku => (
                              <Link
                                key={sku}
                                href={`/parts/${sku}?mode=commerce`}
                                className="px-3 py-1 bg-neutral-100 rounded-full text-xs text-neutral-700 hover:bg-neutral-200 transition-colors"
                              >
                                {sku}
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

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

        {/* Bayesian Engine Info */}
        <div className="max-w-7xl mx-auto px-8 mt-12">
          <div className="bg-neutral-900 rounded-2xl p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-medium">Risk Engine</h3>
                <p className="text-sm text-neutral-400 mt-1">
                  WASM-accelerated risk calculation for fleet service prioritization
                </p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${wasmLoaded ? 'bg-cyan-500 animate-pulse' : 'bg-amber-500'}`} />
                  <span className="text-xs text-neutral-400">
                    {wasmLoaded ? 'WASM' : 'JS Fallback'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-xs text-neutral-400">
                    {vehicleRisks.size} vehicles analyzed
                  </span>
                </div>
              </div>
            </div>

            {/* Stressor Likelihood Ratios */}
            <div className="mb-8">
              <div className="text-neutral-500 text-xs uppercase tracking-wide mb-4">
                Stressor Likelihood Ratios (Validated Sources)
              </div>
              <div className="grid grid-cols-5 gap-4">
                {ALL_STRESSORS.map(stressor => (
                  <div key={stressor.id} className="bg-neutral-800 rounded-lg p-4">
                    <div className="text-2xl font-light text-white mb-1">
                      {stressor.likelihoodRatio}x
                    </div>
                    <div className="text-sm text-neutral-300 mb-2">{stressor.name}</div>
                    <div className="text-[10px] text-neutral-500 leading-tight">
                      {stressor.source} ({stressor.year})
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-5 gap-6 text-sm">
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Base Rate</div>
                <div className="text-2xl font-light text-white">{(BASE_FAILURE_RATE * 100).toFixed(1)}%</div>
                <div className="text-neutral-500 text-xs mt-1">Annual failure rate</div>
                <div className="text-neutral-600 text-[10px] mt-2">Source: Argonne National Lab (2019)</div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Formula</div>
                <div className="font-mono text-xs text-neutral-300 leading-relaxed">
                  P(fail|stressors) = <br/>
                  P(fail) × ∏(1 + (LR<sub>i</sub> - 1) × I<sub>i</sub>)
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Revenue Model</div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-red-400">CRITICAL</span>
                    <span className="text-white">$1,200</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-amber-400">HIGH</span>
                    <span className="text-white">$850</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-yellow-400">MODERATE</span>
                    <span className="text-white">$450</span>
                  </div>
                </div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Fleet Target</div>
                <div className="text-2xl font-light text-white">15M</div>
                <div className="text-neutral-500 text-xs">Ford/Lincoln vehicles</div>
              </div>
              <div>
                <div className="text-neutral-500 text-xs uppercase tracking-wide mb-1">Data Classification</div>
                <div className="text-green-400 font-medium">LOW PII</div>
                <div className="text-neutral-500 text-xs mt-1">VIN + Mileage + Zip only</div>
                <div className="text-neutral-600 text-[10px] mt-1">No historical RO data required</div>
              </div>
            </div>

            {/* Academic Sources */}
            <div className="mt-8 pt-6 border-t border-neutral-800">
              <div className="text-neutral-500 text-xs uppercase tracking-wide mb-3">Academic References</div>
              <div className="text-[10px] text-neutral-600 space-y-1">
                <div>Argonne National Laboratory (2018). Temperature Effects on Lead-Acid Battery Performance and Life. Energy Storage Materials, Vol 15.</div>
                <div>Argonne National Laboratory (2019). Impact of Extreme Fast Charging on Battery Life. Journal of Power Sources, Vol 422.</div>
                <div>HL Mando Corporation (2021). Short Trip Impact on 12V Battery State of Charge. Ford Supplier Research.</div>
                <div>Varta Automotive (2020). Cold Climate Battery Performance Study.</div>
                <div>Battery Council International (2019). Road Salt Impact on Automotive Batteries.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
