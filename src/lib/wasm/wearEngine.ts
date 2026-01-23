/**
 * WASM Wear Engine - Fluid dynamics, filter physics, and wear simulations
 * 
 * This module provides WASM-accelerated physics for:
 * - Fluid visualization (oil, coolant, brake fluid, transmission fluid)
 * - Filter clogging simulation (air filter, oil filter, cabin filter)
 * - Wear particle effects (brake dust, rotor wear)
 * - Wave/surface dynamics for realistic fluid behavior
 */

// ============================================================================
// TYPES
// ============================================================================

export interface FluidState {
  viscosity: number;      // 1.0 = new, 0.3 = degraded
  contamination: number;  // 0 = clean, 1 = contaminated
  level: number;          // 0-1 fill level
  temperature: number;    // °F
  age: number;            // 0-1 normalized age
  color: { r: number; g: number; b: number };
}

export interface FilterState {
  efficiency: number;     // 1.0 = new, 0 = clogged
  particleLoad: number;   // 0-1 debris accumulation
  pressureDrop: number;   // PSI differential
  flowRate: number;       // 0-1 normalized
}

export interface WearState {
  remaining: number;      // 0-1 material remaining
  rate: number;           // Wear rate
  particleCount: number;  // Active wear particles
}

export type FluidType = 'oil' | 'coolant' | 'brake' | 'transmission' | 'washer';
export type FilterType = 'air' | 'oil' | 'cabin' | 'fuel';

// ============================================================================
// FLUID PRESETS
// ============================================================================

export const FLUID_PRESETS: Record<FluidType, {
  name: string;
  newColor: { r: number; g: number; b: number };
  oldColor: { r: number; g: number; b: number };
  maxTemp: number;
  changeInterval: string;
}> = {
  oil: {
    name: 'Engine Oil',
    newColor: { r: 0.85, g: 0.65, b: 0.25 },  // Amber/gold
    oldColor: { r: 0.12, g: 0.08, b: 0.03 },   // Dark brown/black
    maxTemp: 250,
    changeInterval: '5,000-7,500 mi',
  },
  coolant: {
    name: 'Coolant',
    newColor: { r: 0.2, g: 0.8, b: 0.3 },      // Bright green
    oldColor: { r: 0.35, g: 0.4, b: 0.25 },    // Murky brown-green
    maxTemp: 220,
    changeInterval: '30,000 mi',
  },
  brake: {
    name: 'Brake Fluid',
    newColor: { r: 0.95, g: 0.9, b: 0.7 },     // Clear/light amber
    oldColor: { r: 0.45, g: 0.35, b: 0.2 },    // Dark amber
    maxTemp: 400,
    changeInterval: '2 years',
  },
  transmission: {
    name: 'Transmission Fluid',
    newColor: { r: 0.9, g: 0.2, b: 0.25 },     // Red
    oldColor: { r: 0.35, g: 0.15, b: 0.1 },    // Dark brown-red
    maxTemp: 300,
    changeInterval: '60,000 mi',
  },
  washer: {
    name: 'Washer Fluid',
    newColor: { r: 0.3, g: 0.5, b: 0.9 },      // Blue
    oldColor: { r: 0.25, g: 0.4, b: 0.7 },     // Slightly murky blue
    maxTemp: 200,
    changeInterval: 'As needed',
  },
};

// ============================================================================
// FILTER PRESETS
// ============================================================================

export const FILTER_PRESETS: Record<FilterType, {
  name: string;
  cleanColor: string;
  dirtyColor: string;
  changeInterval: string;
  pressureMax: number;
}> = {
  air: {
    name: 'Air Filter',
    cleanColor: '#f5f5f0',
    dirtyColor: '#3d3528',
    changeInterval: '15,000-30,000 mi',
    pressureMax: 3,
  },
  oil: {
    name: 'Oil Filter',
    cleanColor: '#e8e4d9',
    dirtyColor: '#1a1612',
    changeInterval: '5,000-7,500 mi',
    pressureMax: 15,
  },
  cabin: {
    name: 'Cabin Air Filter',
    cleanColor: '#fafaf8',
    dirtyColor: '#4a4538',
    changeInterval: '15,000-25,000 mi',
    pressureMax: 2,
  },
  fuel: {
    name: 'Fuel Filter',
    cleanColor: '#f0ece0',
    dirtyColor: '#2a2520',
    changeInterval: '30,000-40,000 mi',
    pressureMax: 10,
  },
};

// ============================================================================
// WASM MODULE
// ============================================================================

interface WearWASMExports {
  // Fluid functions
  setFluidProperties: (viscosity: number, contamination: number, level: number, temperature: number, age: number) => void;
  updateFluidParticles: (particles: number, count: number, deltaTime: number, width: number, height: number, agitation: number) => number;
  initFluidParticles: (particles: number, count: number, width: number, height: number) => void;
  getFluidColorR: () => number;
  getFluidColorG: () => number;
  getFluidColorB: () => number;
  
  // Filter functions
  setFilterProperties: (efficiency: number, particleLoad: number) => void;
  updateFilterGrid: (grid: number, gridSize: number, deltaTime: number, flowRate: number) => void;
  initFilterGrid: (grid: number, gridSize: number, initialClogging: number) => void;
  getFilterPressureDrop: () => number;
  
  // Wear functions
  updateWearParticles: (particles: number, count: number, deltaTime: number, wearRate: number, surfaceY: number) => number;
  
  // Surface functions
  updateFluidSurface: (surface: number, width: number, deltaTime: number, agitation: number) => void;
  
  // Memory
  memory: WebAssembly.Memory;
}

let wasmModule: WebAssembly.Instance | null = null;
let wasmExports: WearWASMExports | null = null;
let wasmMemory: WebAssembly.Memory | null = null;

export async function initWearWASM(): Promise<boolean> {
  try {
    const response = await fetch('/wear-engine.wasm');
    const buffer = await response.arrayBuffer();
    
    // Create memory (16 pages = 1MB, can grow to 256 pages = 16MB)
    wasmMemory = new WebAssembly.Memory({ initial: 16, maximum: 256 });
    
    const imports = {
      env: {
        memory: wasmMemory,
        abort: () => console.error('[WearEngine] WASM abort'),
        'Math.random': Math.random,
        'Math.sin': Math.sin,
        'Math.cos': Math.cos,
      },
    };
    
    const module = await WebAssembly.instantiate(buffer, imports);
    wasmModule = module.instance;
    wasmExports = module.instance.exports as unknown as WearWASMExports;
    
    console.log('[WearEngine] WASM loaded successfully');
    return true;
  } catch (e) {
    console.warn('[WearEngine] WASM not available, using JS fallback:', e);
    return false;
  }
}

export function isWearWASMAvailable(): boolean {
  return wasmModule !== null && wasmExports !== null;
}

export function getWearWASMExports(): WearWASMExports | null {
  return wasmExports;
}

// ============================================================================
// JAVASCRIPT FALLBACK IMPLEMENTATIONS
// ============================================================================

const PARTICLE_STRIDE = 8;

export function updateFluidParticlesJS(
  particles: Float64Array,
  count: number,
  deltaTime: number,
  containerWidth: number,
  containerHeight: number,
  agitation: number,
  fluidState: FluidState
): number {
  let activeCount = 0;
  const gravity = 150;
  const viscosityDrag = 0.85 + (fluidState.viscosity * 0.14);
  const turbulenceX = agitation * 50;
  const turbulenceY = agitation * 30;
  const fluidTop = containerHeight * (1 - fluidState.level);
  
  for (let i = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    
    let x = particles[offset + 0];
    let y = particles[offset + 1];
    let vx = particles[offset + 2];
    let vy = particles[offset + 3];
    let size = particles[offset + 4];
    let opacity = particles[offset + 5];
    const pType = particles[offset + 6];
    let age = particles[offset + 7];
    
    if (opacity <= 0) continue;
    
    age += deltaTime;
    
    // Physics based on particle type
    if (pType < 0.5) {
      // Fluid particle
      vy += gravity * deltaTime * (1 - fluidState.viscosity * 0.5);
      vx += Math.sin(age * 3 + i * 0.1) * turbulenceX * deltaTime;
      vy += Math.cos(age * 2 + i * 0.15) * turbulenceY * deltaTime;
    } else if (pType < 1.5) {
      // Sediment
      vy += gravity * 1.5 * deltaTime;
      vx *= viscosityDrag;
      vy *= viscosityDrag * 0.98;
    } else {
      // Bubble
      vy -= gravity * 0.8 * deltaTime;
      vx += Math.sin(age * 5) * 20 * deltaTime;
      size *= 0.998;
      if (size < 1) opacity = 0;
    }
    
    // Drag
    vx *= viscosityDrag;
    vy *= viscosityDrag;
    
    // Position update
    x += vx * deltaTime;
    y += vy * deltaTime;
    
    // Boundaries
    if (y > containerHeight - size) {
      y = containerHeight - size;
      vy *= -0.3;
      vx *= 0.8;
    }
    if (y < fluidTop + size) {
      if (pType > 1.5) {
        opacity -= 0.1;
      } else {
        y = fluidTop + size;
        vy *= -0.2;
      }
    }
    if (x < size) { x = size; vx *= -0.5; }
    if (x > containerWidth - size) { x = containerWidth - size; vx *= -0.5; }
    
    particles[offset + 0] = x;
    particles[offset + 1] = y;
    particles[offset + 2] = vx;
    particles[offset + 3] = vy;
    particles[offset + 4] = size;
    particles[offset + 5] = opacity;
    particles[offset + 7] = age;
    
    if (opacity > 0) activeCount++;
  }
  
  return activeCount;
}

export function initFluidParticlesJS(
  particles: Float64Array,
  count: number,
  containerWidth: number,
  containerHeight: number,
  fluidState: FluidState
): void {
  const fluidTop = containerHeight * (1 - fluidState.level);
  const fluidHeight = containerHeight - fluidTop;
  
  for (let i = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    
    const x = Math.random() * containerWidth;
    const y = fluidTop + Math.random() * fluidHeight;
    
    let pType = 0;
    const roll = Math.random();
    if (roll < fluidState.contamination * 0.4) {
      pType = 1; // Sediment
    } else if (roll < fluidState.contamination * 0.4 + 0.05) {
      pType = 2; // Bubble
    }
    
    let size = 2 + Math.random() * 3;
    if (pType === 1) size = 1 + Math.random() * 2;
    else if (pType === 2) size = 3 + Math.random() * 5;
    
    particles[offset + 0] = x;
    particles[offset + 1] = y;
    particles[offset + 2] = (Math.random() - 0.5) * 20;
    particles[offset + 3] = (Math.random() - 0.5) * 10;
    particles[offset + 4] = size;
    particles[offset + 5] = 0.3 + Math.random() * 0.5;
    particles[offset + 6] = pType;
    particles[offset + 7] = Math.random() * 10;
  }
}

// ============================================================================
// UTILITY: Calculate fluid color based on degradation
// ============================================================================

export function calculateFluidColor(
  fluidType: FluidType,
  age: number,
  contamination: number
): { r: number; g: number; b: number } {
  const preset = FLUID_PRESETS[fluidType];
  const degradation = (age + contamination) / 2;
  
  return {
    r: preset.newColor.r + (preset.oldColor.r - preset.newColor.r) * degradation,
    g: preset.newColor.g + (preset.oldColor.g - preset.newColor.g) * degradation,
    b: preset.newColor.b + (preset.oldColor.b - preset.newColor.b) * degradation,
  };
}

// ============================================================================
// UTILITY: Estimate wear from mileage/age
// ============================================================================

export function estimateFluidWear(
  fluidType: FluidType,
  milesSinceChange: number,
  daysSinceChange: number
): FluidState {
  // Typical change intervals
  const intervals: Record<FluidType, { miles: number; days: number }> = {
    oil: { miles: 6000, days: 180 },
    coolant: { miles: 30000, days: 730 },
    brake: { miles: 50000, days: 730 },
    transmission: { miles: 60000, days: 1095 },
    washer: { miles: 999999, days: 999999 },
  };
  
  const interval = intervals[fluidType];
  const mileageWear = Math.min(milesSinceChange / interval.miles, 1);
  const timeWear = Math.min(daysSinceChange / interval.days, 1);
  
  const overallWear = Math.max(mileageWear, timeWear);
  
  // Calculate derived properties
  const viscosity = 1 - overallWear * 0.7;  // Viscosity degrades
  const contamination = overallWear * 0.8;   // Contamination increases
  const level = 1 - overallWear * 0.15;      // Level drops slightly
  
  const color = calculateFluidColor(fluidType, overallWear, contamination);
  
  return {
    viscosity,
    contamination,
    level,
    temperature: 180, // Default operating temp
    age: overallWear,
    color,
  };
}

export function estimateFilterWear(
  filterType: FilterType,
  milesSinceChange: number
): FilterState {
  const intervals: Record<FilterType, number> = {
    air: 20000,
    oil: 6000,
    cabin: 20000,
    fuel: 35000,
  };
  
  const wear = Math.min(milesSinceChange / intervals[filterType], 1);
  
  return {
    efficiency: 1 - wear * 0.9,
    particleLoad: wear,
    pressureDrop: wear * FILTER_PRESETS[filterType].pressureMax,
    flowRate: 1 - wear * 0.6,
  };
}
