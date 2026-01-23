// WASM Wear & Tear Physics Engine
// Compile: npx asc wasm/assembly/wear.ts -o public/wear-engine.wasm --optimize

// ============================================================================
// FLUID SIMULATION - Oil, Coolant, Brake Fluid, Transmission
// ============================================================================

const MAX_PARTICLES: i32 = 2000;
const PARTICLE_STRIDE: i32 = 8; // x, y, vx, vy, size, opacity, type, age

// Fluid properties
let fluidViscosity: f64 = 1.0;      // 1.0 = new, 0.3 = degraded
let fluidContamination: f64 = 0.0;  // 0 = clean, 1 = fully contaminated
let fluidLevel: f64 = 1.0;          // 0-1 fill level
let fluidTemperature: f64 = 180.0;  // °F operating temp
let fluidAge: f64 = 0.0;            // Normalized age 0-1

// Fluid colors (RGBA as packed f64 for simplicity)
let fluidBaseR: f64 = 0.8;  // Amber/gold for new oil
let fluidBaseG: f64 = 0.6;
let fluidBaseB: f64 = 0.2;

// ============================================================================
// FILTER SIMULATION
// ============================================================================

const FILTER_GRID_SIZE: i32 = 64;
const FILTER_CELL_STRIDE: i32 = 4; // clogging, particleCount, flowRate, pressure

let filterEfficiency: f64 = 1.0;    // 1.0 = new, 0 = fully clogged
let filterPressureDrop: f64 = 0.0;  // Pressure differential
let filterParticleLoad: f64 = 0.0;  // Total trapped particles

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

@inline
function clamp(v: f64, min: f64, max: f64): f64 {
  if (v < min) return min;
  if (v > max) return max;
  return v;
}

@inline
function lerp(a: f64, b: f64, t: f64): f64 {
  return a + (b - a) * t;
}

@inline
function random(): f64 {
  // Simple PRNG using global state
  return Math.random();
}

// ============================================================================
// FLUID PHYSICS EXPORTS
// ============================================================================

export function setFluidProperties(
  viscosity: f64,
  contamination: f64,
  level: f64,
  temperature: f64,
  age: f64
): void {
  fluidViscosity = clamp(viscosity, 0.1, 1.0);
  fluidContamination = clamp(contamination, 0.0, 1.0);
  fluidLevel = clamp(level, 0.0, 1.0);
  fluidTemperature = temperature;
  fluidAge = clamp(age, 0.0, 1.0);
  
  // Calculate derived color based on contamination and age
  // New oil: amber (0.8, 0.6, 0.2)
  // Old oil: dark brown/black (0.15, 0.1, 0.05)
  const degradation = (contamination + age) / 2.0;
  fluidBaseR = lerp(0.85, 0.12, degradation);
  fluidBaseG = lerp(0.65, 0.08, degradation);
  fluidBaseB = lerp(0.25, 0.03, degradation);
}

export function updateFluidParticles(
  particles: Float64Array,
  count: i32,
  deltaTime: f64,
  containerWidth: f64,
  containerHeight: f64,
  agitation: f64  // 0 = still, 1 = turbulent (engine running)
): i32 {
  let activeCount: i32 = 0;
  const gravity: f64 = 150.0;
  const viscosityDrag = 0.85 + (fluidViscosity * 0.14); // Higher viscosity = more drag
  
  // Turbulence based on agitation
  const turbulenceX = agitation * 50.0;
  const turbulenceY = agitation * 30.0;
  
  for (let i: i32 = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    
    let x = unchecked(particles[offset + 0]);
    let y = unchecked(particles[offset + 1]);
    let vx = unchecked(particles[offset + 2]);
    let vy = unchecked(particles[offset + 3]);
    let size = unchecked(particles[offset + 4]);
    let opacity = unchecked(particles[offset + 5]);
    const pType = unchecked(particles[offset + 6]); // 0=fluid, 1=sediment, 2=bubble
    let age = unchecked(particles[offset + 7]);
    
    if (opacity <= 0.0) continue;
    
    age += deltaTime;
    
    // Apply physics based on particle type
    if (pType < 0.5) {
      // Fluid particle - follows flow
      vy += gravity * deltaTime * (1.0 - fluidViscosity * 0.5);
      vx += (Math.sin(age * 3.0 + <f64>i * 0.1) * turbulenceX) * deltaTime;
      vy += (Math.cos(age * 2.0 + <f64>i * 0.15) * turbulenceY) * deltaTime;
    } else if (pType < 1.5) {
      // Sediment - sinks faster, affected by viscosity
      vy += gravity * 1.5 * deltaTime;
      // Sediment moves slower in viscous fluid
      vx *= viscosityDrag;
      vy *= viscosityDrag * 0.98;
    } else {
      // Bubble - rises
      vy -= gravity * 0.8 * deltaTime;
      vx += Math.sin(age * 5.0) * 20.0 * deltaTime;
      // Bubbles shrink over time
      size *= 0.998;
      if (size < 1.0) opacity = 0.0;
    }
    
    // Apply drag
    vx *= viscosityDrag;
    vy *= viscosityDrag;
    
    // Update position
    x += vx * deltaTime;
    y += vy * deltaTime;
    
    // Boundary collisions
    const fluidTop = containerHeight * (1.0 - fluidLevel);
    
    if (y > containerHeight - size) {
      y = containerHeight - size;
      vy *= -0.3;
      vx *= 0.8;
    }
    if (y < fluidTop + size) {
      if (pType > 1.5) {
        // Bubble pops at surface
        opacity -= 0.1;
      } else {
        y = fluidTop + size;
        vy *= -0.2;
      }
    }
    if (x < size) {
      x = size;
      vx *= -0.5;
    }
    if (x > containerWidth - size) {
      x = containerWidth - size;
      vx *= -0.5;
    }
    
    // Write back
    unchecked(particles[offset + 0] = x);
    unchecked(particles[offset + 1] = y);
    unchecked(particles[offset + 2] = vx);
    unchecked(particles[offset + 3] = vy);
    unchecked(particles[offset + 4] = size);
    unchecked(particles[offset + 5] = opacity);
    unchecked(particles[offset + 7] = age);
    
    if (opacity > 0.0) activeCount++;
  }
  
  return activeCount;
}

// Initialize fluid particles for visualization
export function initFluidParticles(
  particles: Float64Array,
  count: i32,
  containerWidth: f64,
  containerHeight: f64
): void {
  const fluidTop = containerHeight * (1.0 - fluidLevel);
  const fluidHeight = containerHeight - fluidTop;
  
  for (let i: i32 = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    
    // Random position within fluid
    const x = Math.random() * containerWidth;
    const y = fluidTop + Math.random() * fluidHeight;
    
    // Determine particle type based on contamination
    let pType: f64 = 0.0;
    const roll = Math.random();
    if (roll < fluidContamination * 0.4) {
      pType = 1.0; // Sediment
    } else if (roll < fluidContamination * 0.4 + 0.05) {
      pType = 2.0; // Bubble
    }
    
    // Size based on type
    let size: f64 = 2.0 + Math.random() * 3.0;
    if (pType > 0.5 && pType < 1.5) {
      size = 1.0 + Math.random() * 2.0; // Sediment smaller
    } else if (pType > 1.5) {
      size = 3.0 + Math.random() * 5.0; // Bubbles larger
    }
    
    unchecked(particles[offset + 0] = x);
    unchecked(particles[offset + 1] = y);
    unchecked(particles[offset + 2] = (Math.random() - 0.5) * 20.0);
    unchecked(particles[offset + 3] = (Math.random() - 0.5) * 10.0);
    unchecked(particles[offset + 4] = size);
    unchecked(particles[offset + 5] = 0.3 + Math.random() * 0.5);
    unchecked(particles[offset + 6] = pType);
    unchecked(particles[offset + 7] = Math.random() * 10.0);
  }
}

// Get current fluid color (RGB 0-1)
export function getFluidColorR(): f64 { return fluidBaseR; }
export function getFluidColorG(): f64 { return fluidBaseG; }
export function getFluidColorB(): f64 { return fluidBaseB; }

// ============================================================================
// FILTER PHYSICS EXPORTS
// ============================================================================

export function setFilterProperties(
  efficiency: f64,
  particleLoad: f64
): void {
  filterEfficiency = clamp(efficiency, 0.0, 1.0);
  filterParticleLoad = clamp(particleLoad, 0.0, 1.0);
  
  // Calculate pressure drop based on clogging
  filterPressureDrop = (1.0 - filterEfficiency) * 15.0; // 0-15 PSI
}

export function updateFilterGrid(
  grid: Float64Array,
  gridSize: i32,
  deltaTime: f64,
  flowRate: f64  // 0-1 normalized flow
): void {
  const clogRate = (1.0 - filterEfficiency) * flowRate * deltaTime * 0.1;
  
  for (let y: i32 = 0; y < gridSize; y++) {
    for (let x: i32 = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * FILTER_CELL_STRIDE;
      
      let clogging = unchecked(grid[idx + 0]);
      let particles = unchecked(grid[idx + 1]);
      let cellFlow = unchecked(grid[idx + 2]);
      let pressure = unchecked(grid[idx + 3]);
      
      // Particles accumulate based on position (more at inlet)
      const positionFactor = 1.0 - (<f64>y / <f64>gridSize) * 0.5;
      
      // Random clogging with spatial coherence
      if (Math.random() < clogRate * positionFactor) {
        const addParticles = Math.random() * 0.02;
        particles += addParticles;
        clogging = clamp(clogging + addParticles * 0.5, 0.0, 1.0);
      }
      
      // Flow decreases as clogging increases
      cellFlow = flowRate * (1.0 - clogging * 0.8);
      
      // Pressure builds up behind clogged areas
      pressure = clogging * 15.0 * flowRate;
      
      unchecked(grid[idx + 0] = clogging);
      unchecked(grid[idx + 1] = clamp(particles, 0.0, 1.0));
      unchecked(grid[idx + 2] = cellFlow);
      unchecked(grid[idx + 3] = pressure);
    }
  }
}

export function initFilterGrid(
  grid: Float64Array,
  gridSize: i32,
  initialClogging: f64
): void {
  for (let y: i32 = 0; y < gridSize; y++) {
    for (let x: i32 = 0; x < gridSize; x++) {
      const idx = (y * gridSize + x) * FILTER_CELL_STRIDE;
      
      // More clogging toward the inlet (top)
      const positionBias = 1.0 - (<f64>y / <f64>gridSize) * 0.3;
      const baseClog = initialClogging * positionBias;
      
      // Add some random variation
      const noise = (Math.random() - 0.5) * 0.2;
      const clogging = clamp(baseClog + noise, 0.0, 1.0);
      
      unchecked(grid[idx + 0] = clogging);
      unchecked(grid[idx + 1] = clogging * 0.8); // Particle accumulation
      unchecked(grid[idx + 2] = 1.0 - clogging * 0.8); // Flow rate
      unchecked(grid[idx + 3] = clogging * 10.0); // Pressure
    }
  }
}

export function getFilterPressureDrop(): f64 {
  return filterPressureDrop;
}

// ============================================================================
// WEAR PARTICLE SYSTEM - For brake pads, rotors, etc.
// ============================================================================

export function updateWearParticles(
  particles: Float64Array,
  count: i32,
  deltaTime: f64,
  wearRate: f64,  // 0-1 how fast material is wearing
  surfaceY: f64   // Y position of the wearing surface
): i32 {
  let activeCount: i32 = 0;
  const gravity: f64 = 200.0;
  
  for (let i: i32 = 0; i < count; i++) {
    const offset = i * PARTICLE_STRIDE;
    
    let x = unchecked(particles[offset + 0]);
    let y = unchecked(particles[offset + 1]);
    let vx = unchecked(particles[offset + 2]);
    let vy = unchecked(particles[offset + 3]);
    let size = unchecked(particles[offset + 4]);
    let opacity = unchecked(particles[offset + 5]);
    let age = unchecked(particles[offset + 7]);
    
    if (opacity <= 0.0) {
      // Respawn particle if wear rate is high enough
      if (Math.random() < wearRate * deltaTime * 10.0) {
        x = Math.random() * 200.0;  // Along the surface
        y = surfaceY;
        vx = (Math.random() - 0.5) * 100.0;
        vy = -Math.random() * 50.0 - 20.0;  // Fly up initially
        size = 1.0 + Math.random() * 2.0;
        opacity = 0.8;
        age = 0.0;
      } else {
        continue;
      }
    }
    
    age += deltaTime;
    
    // Gravity
    vy += gravity * deltaTime;
    
    // Air resistance
    vx *= 0.99;
    vy *= 0.99;
    
    // Update position
    x += vx * deltaTime;
    y += vy * deltaTime;
    
    // Fade out over time
    opacity -= deltaTime * 0.3;
    
    // Ground collision
    if (y > surfaceY + 100.0) {
      opacity = 0.0;
    }
    
    unchecked(particles[offset + 0] = x);
    unchecked(particles[offset + 1] = y);
    unchecked(particles[offset + 2] = vx);
    unchecked(particles[offset + 3] = vy);
    unchecked(particles[offset + 4] = size);
    unchecked(particles[offset + 5] = opacity);
    unchecked(particles[offset + 7] = age);
    
    if (opacity > 0.0) activeCount++;
  }
  
  return activeCount;
}

// ============================================================================
// WAVE SIMULATION - For fluid surface
// ============================================================================

export function updateFluidSurface(
  surface: Float64Array,
  width: i32,
  deltaTime: f64,
  agitation: f64
): void {
  const speed: f64 = 3.0;
  const damping: f64 = 0.98;
  
  // Wave propagation
  for (let i: i32 = 1; i < width - 1; i++) {
    const left = unchecked(surface[i - 1]);
    const right = unchecked(surface[i + 1]);
    const current = unchecked(surface[i]);
    const velocity = unchecked(surface[width + i]);
    
    // Spring force from neighbors
    const force = (left + right - 2.0 * current) * speed;
    let newVel = (velocity + force) * damping;
    
    // Add random perturbation based on agitation
    if (Math.random() < agitation * 0.1) {
      newVel += (Math.random() - 0.5) * agitation * 5.0;
    }
    
    unchecked(surface[width + i] = newVel);
    unchecked(surface[i] = current + newVel * deltaTime);
  }
  
  // Boundary conditions
  unchecked(surface[0] = surface[1]);
  unchecked(surface[width - 1] = surface[width - 2]);
}
