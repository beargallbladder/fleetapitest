"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import {
  FilterState,
  FilterType,
  FILTER_PRESETS,
} from "@/lib/wasm/wearEngine";

interface FilterMeshProps {
  filterType: FilterType;
  filterState: FilterState;
  isFlowing?: boolean;  // Air/fluid flowing through
  width?: number;
  height?: number;
  className?: string;
  showStats?: boolean;
}

const GRID_SIZE = 32;
const PARTICLE_COUNT = 150;

interface FlowParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  trapped: boolean;
  trappedAt?: { x: number; y: number };
}

export function FilterMesh({
  filterType,
  filterState,
  isFlowing = true,
  width = 250,
  height = 200,
  className = "",
  showStats = true,
}: FilterMeshProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gridRef = useRef<Float64Array | null>(null);
  const particlesRef = useRef<FlowParticle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  const preset = FILTER_PRESETS[filterType];

  // Initialize grid and particles
  useEffect(() => {
    // Initialize clogging grid
    gridRef.current = new Float64Array(GRID_SIZE * GRID_SIZE);
    
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const idx = y * GRID_SIZE + x;
        // More clogging near the inlet (top), with some randomness
        const positionBias = 1 - (y / GRID_SIZE) * 0.3;
        const baseClog = filterState.particleLoad * positionBias;
        const noise = (Math.random() - 0.5) * 0.3;
        gridRef.current[idx] = Math.max(0, Math.min(1, baseClog + noise));
      }
    }

    // Initialize flow particles
    particlesRef.current = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particlesRef.current.push(createParticle(width, height));
    }
  }, [width, height, filterState.particleLoad]);

  const createParticle = useCallback((w: number, h: number): FlowParticle => ({
    x: Math.random() * w,
    y: -Math.random() * 50,
    vx: (Math.random() - 0.5) * 10,
    vy: 30 + Math.random() * 40,
    size: 1 + Math.random() * 2,
    opacity: 0.4 + Math.random() * 0.4,
    trapped: false,
  }), []);

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !gridRef.current) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const cellWidth = width / GRID_SIZE;
    const cellHeight = height / GRID_SIZE;

    // Parse colors
    const parseColor = (hex: string) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return { r, g, b };
    };

    const cleanColor = parseColor(preset.cleanColor);
    const dirtyColor = parseColor(preset.dirtyColor);

    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - timeRef.current) / 1000, 0.05);
      timeRef.current = timestamp;

      const grid = gridRef.current;
      if (!grid) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Background
      ctx.fillStyle = "#1a1a1f";
      ctx.beginPath();
      ctx.roundRect(0, 0, width, height, 8);
      ctx.fill();

      // Draw filter mesh grid
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
          const idx = y * GRID_SIZE + x;
          const clogging = grid[idx];
          
          // Interpolate color based on clogging
          const r = Math.round(cleanColor.r + (dirtyColor.r - cleanColor.r) * clogging);
          const g = Math.round(cleanColor.g + (dirtyColor.g - cleanColor.g) * clogging);
          const b = Math.round(cleanColor.b + (dirtyColor.b - cleanColor.b) * clogging);
          
          const px = x * cellWidth;
          const py = y * cellHeight;
          
          // Draw mesh cell
          ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
          ctx.fillRect(px + 0.5, py + 0.5, cellWidth - 1, cellHeight - 1);
          
          // Add texture for heavily clogged areas
          if (clogging > 0.5) {
            const particleCount = Math.floor(clogging * 5);
            for (let p = 0; p < particleCount; p++) {
              const offsetX = (Math.sin(timestamp * 0.001 + p + idx) * 0.3 + 0.5) * (cellWidth - 2);
              const offsetY = (Math.cos(timestamp * 0.001 + p * 2 + idx) * 0.3 + 0.5) * (cellHeight - 2);
              
              ctx.fillStyle = `rgba(${dirtyColor.r - 20}, ${dirtyColor.g - 15}, ${dirtyColor.b - 10}, ${clogging * 0.6})`;
              ctx.beginPath();
              ctx.arc(px + 1 + offsetX, py + 1 + offsetY, 1 + clogging, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }
      }

      // Mesh lines
      ctx.strokeStyle = "rgba(0, 0, 0, 0.3)";
      ctx.lineWidth = 0.5;
      for (let y = 0; y <= GRID_SIZE; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellHeight);
        ctx.lineTo(width, y * cellHeight);
        ctx.stroke();
      }
      for (let x = 0; x <= GRID_SIZE; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellWidth, 0);
        ctx.lineTo(x * cellWidth, height);
        ctx.stroke();
      }

      // Update and draw flow particles
      if (isFlowing) {
        particlesRef.current.forEach((p, i) => {
          if (p.trapped) {
            // Draw trapped particle at fixed position
            if (p.trappedAt) {
              ctx.fillStyle = `rgba(80, 70, 50, ${p.opacity})`;
              ctx.beginPath();
              ctx.arc(p.trappedAt.x, p.trappedAt.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
            return;
          }

          // Move particle
          p.y += p.vy * deltaTime * filterState.flowRate;
          p.x += p.vx * deltaTime;

          // Check for collision with clogged cells
          const gridX = Math.floor(p.x / cellWidth);
          const gridY = Math.floor(p.y / cellHeight);
          
          if (gridX >= 0 && gridX < GRID_SIZE && gridY >= 0 && gridY < GRID_SIZE) {
            const idx = gridY * GRID_SIZE + gridX;
            const clogging = grid[idx];
            
            // Higher chance of getting trapped in clogged areas
            if (Math.random() < clogging * 0.05 * deltaTime * 60) {
              p.trapped = true;
              p.trappedAt = { x: p.x, y: p.y };
              // Increase clogging in this cell
              grid[idx] = Math.min(1, clogging + 0.001);
            }
          }

          // Wrap/reset particle if it exits
          if (p.y > height + 10) {
            Object.assign(p, createParticle(width, height));
          }
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;

          // Draw flowing particle
          const particleAlpha = p.opacity * (1 - filterState.particleLoad * 0.5);
          ctx.fillStyle = `rgba(120, 100, 70, ${particleAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Flow direction indicator
      if (isFlowing) {
        ctx.save();
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < 3; i++) {
          const arrowY = ((timestamp * 0.05 + i * 80) % (height + 40)) - 20;
          const arrowX = width / 2;
          
          ctx.strokeStyle = "#4a90d9";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(arrowX, arrowY - 10);
          ctx.lineTo(arrowX, arrowY + 10);
          ctx.lineTo(arrowX - 5, arrowY + 5);
          ctx.moveTo(arrowX, arrowY + 10);
          ctx.lineTo(arrowX + 5, arrowY + 5);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Pressure warning
      if (filterState.pressureDrop > preset.pressureMax * 0.7) {
        ctx.fillStyle = `rgba(239, 68, 68, ${0.3 + Math.sin(timestamp * 0.01) * 0.2})`;
        ctx.font = "bold 10px -apple-system, BlinkMacSystemFont, sans-serif";
        ctx.fillText("⚠ HIGH PRESSURE", 8, height - 8);
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [filterState, isFlowing, width, height, preset, createParticle]);

  // Get status
  const getStatus = () => {
    if (filterState.efficiency > 0.7) return { label: "GOOD", color: "#22c55e" };
    if (filterState.efficiency > 0.4) return { label: "FAIR", color: "#eab308" };
    if (filterState.efficiency > 0.15) return { label: "WORN", color: "#f97316" };
    return { label: "REPLACE", color: "#ef4444" };
  };

  const status = getStatus();

  return (
    <div className={`relative ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width, height }}
        className="rounded-lg"
      />
      
      {showStats && (
        <div className="absolute -bottom-2 left-0 right-0 bg-neutral-900/90 backdrop-blur rounded-lg p-3 translate-y-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-white">{preset.name}</span>
            <span 
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: status.color, color: status.color === "#eab308" ? "#000" : "#fff" }}
            >
              {status.label}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="flex justify-between">
              <span className="text-neutral-400">Efficiency</span>
              <span className="text-white font-mono">{Math.round(filterState.efficiency * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">Flow Rate</span>
              <span className="text-white font-mono">{Math.round(filterState.flowRate * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-neutral-400">ΔP</span>
              <span className={`font-mono ${filterState.pressureDrop > preset.pressureMax * 0.7 ? 'text-red-400' : 'text-white'}`}>
                {filterState.pressureDrop.toFixed(1)} PSI
              </span>
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
