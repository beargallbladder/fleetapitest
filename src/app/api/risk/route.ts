/**
 * Risk Engine API
 *
 * POST /api/risk
 *
 * Calculates vehicle service priority using the risk engine.
 * Falls back to JavaScript implementation if the accelerated path is unavailable.
 * 
 * Request Body:
 * {
 *   vin: string,
 *   mileage: number,
 *   year: number,
 *   healthScore: number,
 *   dtcs?: { powertrain: number, body: number, chassis: number, network: number },
 *   environment?: { rustExposure: number, stopGoFactor: number, terrainFactor: number, thermalFactor: number },
 *   recalls?: number
 * }
 * 
 * Response:
 * {
 *   success: true,
 *   engine: "wasm" | "javascript",
 *   result: VehicleRiskResult,
 *   timing: { total: number, calculation: number }
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import {
  calculateVehicleRisk,
  VehicleRiskInput,
  VehicleRiskResult,
  initWASM,
  isWASMAvailable,
  setWeatherConditions,
} from "@/lib/wasm/riskEngine";

// Track whether the risk engine runtime has been initialized
let wasmInitialized = false;

async function ensureWASMLoaded(): Promise<boolean> {
  if (!wasmInitialized) {
    wasmInitialized = await initWASM();
  }
  return isWASMAvailable();
}

export async function POST(request: NextRequest) {
  const startTime = performance.now();
  
  try {
    const body = await request.json();
    
    // Validate required fields
    if (!body.vin || typeof body.mileage !== "number" || typeof body.year !== "number") {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: vin, mileage, year",
      }, { status: 400 });
    }

    // Initialize risk engine runtime
    const usingWASM = await ensureWASMLoaded();

    // Set weather conditions if provided
    if (body.weather) {
      setWeatherConditions({
        temperature: body.weather.temperature || 70,
        humidity: body.weather.humidity || 50,
        precipitation: body.weather.precipitation || 0,
        tempVariance: body.weather.tempVariance || 15,
      });
    }

    // Build risk input
    const currentYear = new Date().getFullYear();
    const riskInput: VehicleRiskInput = {
      vin: body.vin,
      mileage: body.mileage,
      ageYears: currentYear - body.year,
      healthScore: body.healthScore ?? 75,
      dtcs: body.dtcs ?? {
        powertrain: 0,
        body: 0,
        chassis: 0,
        network: 0,
      },
      environment: body.environment ?? {
        rustExposure: 20,
        stopGoFactor: 30,
        terrainFactor: 20,
        thermalFactor: 25,
      },
      activeRecalls: body.recalls ?? 0,
    };

    // Calculate risk
    const calcStart = performance.now();
    const result = calculateVehicleRisk(riskInput);
    const calcTime = performance.now() - calcStart;

    const totalTime = performance.now() - startTime;

    return NextResponse.json({
      success: true,
      engine: usingWASM ? "wasm" : "javascript",
      result,
      timing: {
        total: Math.round(totalTime * 100) / 100,
        calculation: Math.round(calcTime * 100) / 100,
      },
    });

  } catch (error) {
    console.error("[RiskAPI] Error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}

// GET - API documentation
export async function GET() {
  const usingWASM = await ensureWASMLoaded();
  
  return NextResponse.json({
    name: "Risk Engine API",
    version: "1.0.0",
    engine: usingWASM ? "wasm" : "javascript",
    endpoints: {
      "POST /api/risk": {
        description: "Calculate vehicle service priority risk score",
        body: {
          vin: "string (required)",
          mileage: "number (required)",
          year: "number (required)",
          healthScore: "number (optional, 0-100, default: 75)",
          dtcs: {
            powertrain: "number (optional, default: 0)",
            body: "number (optional, default: 0)",
            chassis: "number (optional, default: 0)",
            network: "number (optional, default: 0)",
          },
          environment: {
            rustExposure: "number (0-100, default: 20)",
            stopGoFactor: "number (0-100, default: 30)",
            terrainFactor: "number (0-100, default: 20)",
            thermalFactor: "number (0-100, default: 25)",
          },
          weather: {
            temperature: "number (°F, optional)",
            humidity: "number (%, optional)",
            precipitation: "number (0-1, optional)",
            tempVariance: "number (°F daily swing, optional)",
          },
          recalls: "number (optional, default: 0)",
        },
        response: {
          success: "boolean",
          engine: "wasm | javascript",
          result: {
            vin: "string",
            priorityScore: "number (0-100)",
            prior: "number (base probability)",
            likelihood: "number (combined multiplier)",
            posterior: "number (final probability)",
            outlierScore: "number (z-score average)",
            outlierCategories: "object (per-category z-scores)",
            factors: "object (individual factor multipliers)",
          },
          timing: {
            total: "number (ms)",
            calculation: "number (ms)",
          },
        },
      },
    },
    formula: "P(failure|stressors) = P(failure) × ∏(1 + (LR_i - 1) × I_i)",
    stressors: [
      { name: "Weather", ratio: 3.5, source: "Argonne National Lab (2018)" },
      { name: "Trip Pattern", ratio: 2.83, source: "HL Mando (2021)" },
      { name: "Cold Start", ratio: 6.5, source: "Varta Automotive (2020)" },
      { name: "Altitude", ratio: 1.6, source: "Exide (2019)" },
      { name: "Corrosion", ratio: 2.1, source: "Battery Council Intl (2019)" },
    ],
  });
}
