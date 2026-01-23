"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  FluidState,
  FluidType,
  FLUID_PRESETS,
  updateFluidParticlesJS,
  initFluidParticlesJS,
  isWearWASMAvailable,
} from "@/lib/wasm/wearEngine";

interface FluidTankProps {
  fluidType: FluidType;
  fluidState: FluidState;
  isRunning?: boolean;  // Engine running = agitation
  width?: number;
  height?: number;
  className?: string;
  showStats?: boolean;
}

const PARTICLE_COUNT = 400;
const PARTICLE_STRIDE = 8;

export function FluidTank({
  fluidType,
  fluidState,
  isRunning = false,
  width = 200,
  height = 300,
  className = "",
  showStats = true,
}: FluidTankProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Float64Array | null>(null);
  const surfaceRef = useRef<Float64Array | null>(null);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [initialized, setInitialized] = useState(false);

  const preset = FLUID_PRESETS[fluidType];

  // Initialize particles
  useEffect(() => {
    particlesRef.current = new Float64Array(PARTICLE_COUNT * PARTICLE_STRIDE);
    surfaceRef.current = new Float64Array(width * 2); // Position + velocity for each column
    
    initFluidParticlesJS(
      particlesRef.current,
      PARTICLE_COUNT,
      width,
      height,
      fluidState
    );
    
    // Initialize surface
    for (let i = 0; i < width; i++) {
      surfaceRef.current[i] = 0;
      surfaceRef.current[width + i] = 0;
    }
    
    setInitialized(true);
  }, [width, height, fluidState.level]);

  // Animation loop
  useEffect(() => {
    if (!initialized) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size with DPR
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - timeRef.current) / 1000, 0.05);
      timeRef.current = timestamp;

      if (!particlesRef.current || !surfaceRef.current) return;

      // Clear canvas
      ctx.clearRect(0, 0, width, height);

      // Tank background
      const tankGradient = ctx.createLinearGradient(0, 0, 0, height);
      tankGradient.addColorStop(0, "rgba(30, 30, 35, 0.95)");
      tankGradient.addColorStop(1, "rgba(20, 20, 25, 0.98)");
      ctx.fillStyle = tankGradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 12);
      ctx.fill();

      // Inner tank area
      const margin = 8;
      const innerWidth = width - margin * 2;
      const innerHeight = height - margin * 2;
      
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(margin, margin, innerWidth, innerHeight, 8);
      ctx.clip();

      // Draw fluid
      const fluidTop = margin + innerHeight * (1 - fluidState.level);
      const agitation = isRunning ? 0.6 : 0.1;

      // Update surface waves
      const surface = surfaceRef.current;
      for (let i = 1; i < width - 1; i++) {
        const left = surface[i - 1];
        const right = surface[i + 1];
        const current = surface[i];
        const velocity = surface[width + i];
        
        const force = (left + right - 2 * current) * 3;
        let newVel = (velocity + force) * 0.98;
        
        if (Math.random() < agitation * 0.1) {
          newVel += (Math.random() - 0.5) * agitation * 5;
        }
        
        surface[width + i] = newVel;
        surface[i] = current + newVel * deltaTime;
      }
      surface[0] = surface[1];
      surface[width - 1] = surface[width - 2];

      // Draw fluid body with wave surface
      const { r, g, b } = fluidState.color;
      const fluidGradient = ctx.createLinearGradient(0, fluidTop, 0, height);
      fluidGradient.addColorStop(0, `rgba(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)}, 0.95)`);
      fluidGradient.addColorStop(0.5, `rgba(${Math.round(r * 255 * 0.8)}, ${Math.round(g * 255 * 0.8)}, ${Math.round(b * 255 * 0.8)}, 0.97)`);
      fluidGradient.addColorStop(1, `rgba(${Math.round(r * 255 * 0.5)}, ${Math.round(g * 255 * 0.5)}, ${Math.round(b * 255 * 0.5)}, 1)`);

      ctx.beginPath();
      ctx.moveTo(margin, height - margin);
      
      // Draw wavy surface
      for (let x = 0; x < innerWidth; x++) {
        const waveHeight = surface[Math.floor(x)] * 3;
        const y = fluidTop + waveHeight;
        if (x === 0) {
          ctx.lineTo(margin + x, y);
        } else {
          ctx.lineTo(margin + x, y);
        }
      }
      
      ctx.lineTo(width - margin, height - margin);
      ctx.closePath();
      ctx.fillStyle = fluidGradient;
      ctx.fill();

      // Surface shine
      ctx.beginPath();
      for (let x = 0; x < innerWidth; x++) {
        const waveHeight = surface[Math.floor(x)] * 3;
        const y = fluidTop + waveHeight;
        if (x === 0) {
          ctx.moveTo(margin + x, y);
        } else {
          ctx.lineTo(margin + x, y);
        }
      }
      ctx.strokeStyle = `rgba(255, 255, 255, ${0.1 + agitation * 0.2})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Update and draw particles
      updateFluidParticlesJS(
        particlesRef.current,
        PARTICLE_COUNT,
        deltaTime,
        innerWidth,
        innerHeight,
        agitation,
        fluidState
      );

      // Draw particles
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const offset = i * PARTICLE_STRIDE;
        const px = particlesRef.current[offset + 0];
        const py = particlesRef.current[offset + 1];
        const size = particlesRef.current[offset + 4];
        const opacity = particlesRef.current[offset + 5];
        const pType = particlesRef.current[offset + 6];

        if (opacity <= 0) continue;

        ctx.beginPath();
        ctx.arc(margin + px, margin + py, size, 0, Math.PI * 2);

        if (pType < 0.5) {
          // Fluid particle - slightly lighter than base
          ctx.fillStyle = `rgba(${Math.round(r * 255 * 1.2)}, ${Math.round(g * 255 * 1.2)}, ${Math.round(b * 255 * 1.2)}, ${opacity * 0.5})`;
        } else if (pType < 1.5) {
          // Sediment - dark particles
          ctx.fillStyle = `rgba(20, 15, 10, ${opacity * 0.8})`;
        } else {
          // Bubble - bright/white
          const bubbleGrad = ctx.createRadialGradient(
            margin + px, margin + py, 0,
            margin + px, margin + py, size
          );
          bubbleGrad.addColorStop(0, `rgba(255, 255, 255, ${opacity * 0.4})`);
          bubbleGrad.addColorStop(0.5, `rgba(255, 255, 255, ${opacity * 0.2})`);
          bubbleGrad.addColorStop(1, `rgba(255, 255, 255, 0)`);
          ctx.fillStyle = bubbleGrad;
        }
        ctx.fill();
      }

      ctx.restore();

      // Tank frame/glass effect
      ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 12);
      ctx.stroke();

      // Measurement lines
      ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
      ctx.lineWidth = 1;
      for (let i = 1; i <= 4; i++) {
        const y = margin + (innerHeight * i) / 5;
        ctx.beginPath();
        ctx.moveTo(margin, y);
        ctx.lineTo(margin + 8, y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(width - margin - 8, y);
        ctx.lineTo(width - margin, y);
        ctx.stroke();
      }

      // Level indicator
      const levelPercent = Math.round(fluidState.level * 100);
      ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.textAlign = "right";
      ctx.fillText(`${levelPercent}%`, width - margin - 4, fluidTop + 14);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [initialized, fluidState, isRunning, width, height]);

  // Get wear status
  const getWearStatus = () => {
    if (fluidState.age < 0.3) return { label: "GOOD", color: "#22c55e" };
    if (fluidState.age < 0.6) return { label: "FAIR", color: "#eab308" };
    if (fluidState.age < 0.85) return { label: "WORN", color: "#f97316" };
    return { label: "REPLACE", color: "#ef4444" };
  };

  const wearStatus = getWearStatus();

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded-xl"
      />
      
      {showStats && (
        <div className="absolute -bottom-2 left-0 right-0 bg-neutral-900/90 backdrop-blur rounded-lg p-3 translate-y-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">{preset.name}</span>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: wearStatus.color, color: wearStatus.color === "#eab308" ? "#000" : "#fff" }}
            >
              {wearStatus.label}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-neutral-400">Level</span>
              <span className="text-white font-mono">{Math.round(fluidState.level * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Viscosity</span>
              <span className="text-white font-mono">{Math.round(fluidState.viscosity * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Contam.</span>
              <span className="text-white font-mono">{Math.round(fluidState.contamination * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Change</span>
              <span className="text-neutral-300">{preset.changeInterval}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
