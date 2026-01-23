# WASM Architecture - Risk & Wear Physics Engine

## Overview

This document describes the WebAssembly (WASM) architecture used for real-time fluid dynamics, filter physics, and wear simulations in the Ford Parts application.

## Why WASM?

1. **Performance**: WASM runs at near-native speeds, enabling complex physics simulations at 60 FPS
2. **Parallelization**: Particle systems with 400+ particles require efficient batch processing
3. **Determinism**: Consistent physics behavior across all browsers and devices
4. **Memory Efficiency**: Direct memory access for large arrays (particles, grids)

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Components                          │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │  FluidTank  │  │ FilterMesh  │  │  RiskVisualization      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │                │                      │               │
└─────────┼────────────────┼──────────────────────┼───────────────┘
          │                │                      │
          ▼                ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TypeScript Engine Layer                      │
│  ┌─────────────────────┐     ┌─────────────────────────────┐   │
│  │   wearEngine.ts     │     │      riskEngine.ts          │   │
│  │  - Fluid physics    │     │   - Bayesian calculations   │   │
│  │  - Filter clogging  │     │   - Weather adjustments     │   │
│  │  - JS fallback      │     │   - Fleet analysis          │   │
│  └──────────┬──────────┘     └──────────────┬──────────────┘   │
│             │                               │                   │
└─────────────┼───────────────────────────────┼───────────────────┘
              │                               │
              ▼                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                      WASM Modules                                │
│  ┌───────────────────────┐   ┌───────────────────────────────┐  │
│  │   wear-engine.wasm    │   │     risk-engine.wasm          │  │
│  │                       │   │                               │  │
│  │  Exports:             │   │  Exports:                     │  │
│  │  - setFluidProperties │   │  - setWeather                 │  │
│  │  - updateFluidParticles│  │  - calculateVehicleRisk       │  │
│  │  - initFluidParticles │   │  - calculateOutlierScore      │  │
│  │  - updateFilterGrid   │   │  - calculateAllVehicles       │  │
│  │  - updateWearParticles│   │  - updateParticles            │  │
│  │  - updateFluidSurface │   │  - simulateRiskFluid          │  │
│  └───────────────────────┘   └───────────────────────────────┘  │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## WASM Modules

### 1. wear-engine.wasm (Fluids & Filters)

**Source**: `wasm/assembly/wear.ts`

#### Fluid Simulation
```
┌─────────────────────────────────────────────────────────────┐
│                    FLUID PARTICLE SYSTEM                     │
│                                                              │
│  Particle Types:                                             │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐                      │
│  │  Fluid  │  │Sediment │  │ Bubble  │                      │
│  │  (0.0)  │  │  (1.0)  │  │  (2.0)  │                      │
│  └────┬────┘  └────┬────┘  └────┬────┘                      │
│       │            │            │                            │
│  ┌────▼────────────▼────────────▼────┐                      │
│  │         Physics Engine            │                      │
│  │  - Gravity (varies by type)       │                      │
│  │  - Viscosity drag                 │                      │
│  │  - Turbulence (when engine on)    │                      │
│  │  - Boundary collisions            │                      │
│  └───────────────────────────────────┘                      │
│                                                              │
│  Memory Layout (per particle - 64 bytes):                    │
│  [x, y, vx, vy, size, opacity, type, age]                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

#### Filter Clogging Simulation
```
┌─────────────────────────────────────────────────────────────┐
│                   FILTER GRID SYSTEM                         │
│                                                              │
│  32×32 Grid (1024 cells)                                    │
│  ┌────────────────────────────────┐                         │
│  │ ████████████████████████████  │ ← Inlet (more clogged)   │
│  │ ██████████████████████████    │                          │
│  │ ████████████████████████      │                          │
│  │ ██████████████████████        │                          │
│  │ ████████████████████          │                          │
│  │ ██████████████████            │                          │
│  │ ████████████████              │                          │
│  │ ██████████████                │ ← Outlet (less clogged)  │
│  └────────────────────────────────┘                         │
│                                                              │
│  Cell Data (32 bytes per cell):                             │
│  [clogging, particleCount, flowRate, pressure]              │
│                                                              │
│  Physics:                                                    │
│  - Particles trap based on clogging probability             │
│  - Flow rate decreases with clogging                        │
│  - Pressure differential increases                          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 2. risk-engine.wasm (Fleet Risk Analysis)

**Source**: `wasm/assembly/index.ts`

#### Risk Calculation
```
Formula: P(failure|stressors) = P(failure) × ∏(1 + (LR_i - 1) × I_i)

Where:
- P(failure) = 0.023 (2.3% base rate from Argonne study)
- LR_i = Likelihood ratio for stressor i
- I_i = Intensity of stressor i (0-1)

Stressor Likelihood Ratios:
┌────────────────┬───────┬─────────────────────────────────┐
│ Stressor       │  LR   │ Source                          │
├────────────────┼───────┼─────────────────────────────────┤
│ Weather        │ 3.5x  │ Argonne National Lab (2018)     │
│ Trip Pattern   │ 2.83x │ HL Mando Corporation (2021)     │
│ Cold Start     │ 6.5x  │ Varta Automotive (2020)         │
│ Altitude       │ 1.6x  │ Exide (2019)                    │
│ Corrosion      │ 2.1x  │ Battery Council Intl (2019)     │
└────────────────┴───────┴─────────────────────────────────┘
```

## Building WASM Modules

```bash
# Build all WASM modules
npm run build:wasm

# Build individually
npx asc wasm/assembly/wear.ts -o public/wear-engine.wasm --optimize
npx asc wasm/assembly/index.ts -o public/risk-engine.wasm --optimize
```

## Runtime Loading

```typescript
// Wear engine
import { initWearWASM, isWearWASMAvailable } from '@/lib/wasm/wearEngine';

useEffect(() => {
  initWearWASM().then(success => {
    console.log(success ? 'WASM loaded' : 'Using JS fallback');
  });
}, []);

// Risk engine
import { initWASM, isWASMAvailable } from '@/lib/wasm/riskEngine';

useEffect(() => {
  initWASM().then(success => {
    console.log(success ? 'WASM loaded' : 'Using JS fallback');
  });
}, []);
```

## JavaScript Fallbacks

Both engines include pure JavaScript fallback implementations that activate when:
1. WASM fails to load
2. Browser doesn't support WASM (rare, <1% of users)
3. Development/testing scenarios

The fallback implementations produce identical results but run slower:
- WASM: ~0.5ms per frame for 400 particles
- JS: ~2-3ms per frame for 400 particles

## Memory Management

WASM modules use `Float64Array` for all physics data to enable direct memory sharing:

```typescript
// Particle buffer: 400 particles × 8 floats × 8 bytes = 25.6 KB
const particles = new Float64Array(PARTICLE_COUNT * PARTICLE_STRIDE);

// Filter grid: 32 × 32 × 4 floats × 8 bytes = 32 KB
const grid = new Float64Array(GRID_SIZE * GRID_SIZE * CELL_STRIDE);
```

## Color Science

Fluid degradation uses linear interpolation between "new" and "worn" colors:

```typescript
// Oil degradation example
New:  rgb(217, 166, 64)  // Amber/gold
Worn: rgb(31, 20, 8)     // Dark brown/black

// Interpolation based on (age + contamination) / 2
color.r = newColor.r + (wornColor.r - newColor.r) * degradation;
```

## Performance Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Frame Rate | 60 FPS | 58-60 FPS |
| Frame Time | <16.67ms | ~8ms |
| WASM Physics | <1ms | ~0.5ms |
| Canvas Render | <10ms | ~7ms |
| Memory Usage | <5MB | ~2MB |

## API Routes with WASM

For server-side calculations, WASM can be loaded in API routes:

```typescript
// app/api/risk/route.ts
import { initWASM, calculateVehicleRisk } from '@/lib/wasm/riskEngine';

export async function POST(request: Request) {
  await initWASM(); // Load WASM on first request
  
  const body = await request.json();
  const result = calculateVehicleRisk(body);
  
  return Response.json(result);
}
```

## Future Enhancements

1. **WebGPU Compute**: Move particle physics to GPU for 10x performance
2. **Shared Array Buffers**: Enable true multi-threading with Web Workers
3. **SIMD Instructions**: Use WASM SIMD for vectorized math operations
4. **Streaming Compilation**: Load WASM in parallel with page render
