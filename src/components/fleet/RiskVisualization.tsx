"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { VehicleRiskResult, CohortComparison } from "@/lib/wasm/riskEngine";

interface RiskVisualizationProps {
  vehicleRisk: VehicleRiskResult;
  cohortComparison: CohortComparison;
  className?: string;
}

interface CohortParticle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  score: number;
  size: number;
  isHighlighted: boolean;
}

// Fluid cell for risk liquid simulation
interface FluidCell {
  height: number;
  velocity: number;
}

export function RiskVisualization({
  vehicleRisk,
  cohortComparison,
  className = "",
}: RiskVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fluidRef = useRef<FluidCell[]>([]);
  const particlesRef = useRef<CohortParticle[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  const [isHovering, setIsHovering] = useState(false);

  // Initialize fluid grid
  const initFluid = useCallback((columns: number) => {
    const cells: FluidCell[] = [];
    for (let i = 0; i < columns; i++) {
      cells.push({
        height: vehicleRisk.priorityScore / 100,
        velocity: 0,
      });
    }
    return cells;
  }, [vehicleRisk.priorityScore]);

  // Initialize cohort particles
  const initCohortParticles = useCallback((count: number) => {
    const particles: CohortParticle[] = [];
    const distribution = cohortComparison.cohortDistribution;
    
    // Create particles based on distribution
    distribution.forEach((count, bucket) => {
      const bucketScore = bucket * 10 + 5;
      for (let i = 0; i < Math.min(count, 50); i++) { // Limit per bucket
        particles.push({
          x: Math.random(),
          y: Math.random(),
          targetX: 0.1 + Math.random() * 0.8,
          targetY: 0.3 + (bucketScore / 100) * 0.5, // Y position based on score
          score: bucketScore + (Math.random() - 0.5) * 10,
          size: 2 + Math.random() * 2,
          isHighlighted: false,
        });
      }
    });

    // Add highlighted vehicle particle
    particles.push({
      x: 0.5,
      y: 0.5,
      targetX: 0.5,
      targetY: 0.3 + (vehicleRisk.priorityScore / 100) * 0.5,
      score: vehicleRisk.priorityScore,
      size: 8,
      isHighlighted: true,
    });

    return particles;
  }, [cohortComparison, vehicleRisk.priorityScore]);

  // Get risk color
  const getRiskColor = useCallback((score: number, alpha: number = 1): string => {
    if (score < 30) {
      // Green
      return `rgba(34, 197, 94, ${alpha})`;
    } else if (score < 50) {
      // Yellow
      return `rgba(234, 179, 8, ${alpha})`;
    } else if (score < 70) {
      // Orange
      return `rgba(249, 115, 22, ${alpha})`;
    } else {
      // Red
      return `rgba(239, 68, 68, ${alpha})`;
    }
  }, []);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    // Initialize
    const columns = 64;
    fluidRef.current = initFluid(columns);
    particlesRef.current = initCohortParticles(cohortComparison.vehiclesInCohort);

    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - timeRef.current) / 1000, 0.05);
      timeRef.current = timestamp;

      const width = canvas.width / (window.devicePixelRatio || 1);
      const height = canvas.height / (window.devicePixelRatio || 1);

      // Clear
      ctx.fillStyle = "white";
      ctx.fillRect(0, 0, width, height);

      // Update and draw fluid
      const targetHeight = vehicleRisk.priorityScore / 100;
      const fluid = fluidRef.current;
      const columnWidth = width / columns;

      // Fluid physics
      for (let i = 0; i < columns; i++) {
        const cell = fluid[i];
        
        // Wave dynamics
        const wave = Math.sin(timestamp * 0.002 + i * 0.15) * 0.03;
        const target = targetHeight + wave;
        
        // Spring physics
        const spring = (target - cell.height) * 8;
        cell.velocity += spring * deltaTime;
        cell.velocity *= 0.92; // Damping
        cell.height += cell.velocity * deltaTime;
        cell.height = Math.max(0, Math.min(1, cell.height));
      }

      // Draw fluid gradient
      const fluidTop = height * 0.6; // Top of fluid container
      const fluidBottom = height * 0.95; // Bottom of fluid container
      const fluidHeight = fluidBottom - fluidTop;

      // Draw fluid path
      ctx.beginPath();
      ctx.moveTo(0, fluidBottom);
      
      for (let i = 0; i < columns; i++) {
        const x = i * columnWidth + columnWidth / 2;
        const y = fluidBottom - (fluid[i].height * fluidHeight);
        
        if (i === 0) {
          ctx.lineTo(x, y);
        } else {
          // Smooth curve
          const prevX = (i - 1) * columnWidth + columnWidth / 2;
          const prevY = fluidBottom - (fluid[i - 1].height * fluidHeight);
          const cpX = (prevX + x) / 2;
          ctx.quadraticCurveTo(prevX, prevY, cpX, (prevY + y) / 2);
        }
      }
      
      ctx.lineTo(width, fluidBottom);
      ctx.closePath();

      // Gradient fill
      const gradient = ctx.createLinearGradient(0, fluidTop, 0, fluidBottom);
      const baseColor = getRiskColor(vehicleRisk.priorityScore);
      gradient.addColorStop(0, getRiskColor(vehicleRisk.priorityScore, 0.8));
      gradient.addColorStop(1, getRiskColor(vehicleRisk.priorityScore, 0.4));
      ctx.fillStyle = gradient;
      ctx.fill();

      // Draw cohort particles (above fluid)
      const particleArea = { x: 20, y: 20, width: width - 40, height: fluidTop - 40 };
      
      ctx.save();
      ctx.beginPath();
      ctx.rect(particleArea.x, particleArea.y, particleArea.width, particleArea.height);
      ctx.clip();

      particlesRef.current.forEach((p) => {
        // Move toward target
        p.x += (p.targetX - p.x) * deltaTime * 2;
        p.y += (p.targetY - p.y) * deltaTime * 2;
        
        // Add gentle drift
        p.targetX += (Math.random() - 0.5) * 0.01;
        p.targetX = Math.max(0.05, Math.min(0.95, p.targetX));

        const screenX = particleArea.x + p.x * particleArea.width;
        const screenY = particleArea.y + p.y * particleArea.height;

        if (p.isHighlighted) {
          // Highlighted vehicle - pulsing
          const pulse = 1 + Math.sin(timestamp * 0.005) * 0.2;
          const size = p.size * pulse;
          
          // Glow
          const glowGradient = ctx.createRadialGradient(
            screenX, screenY, 0,
            screenX, screenY, size * 3
          );
          glowGradient.addColorStop(0, getRiskColor(p.score, 0.5));
          glowGradient.addColorStop(1, getRiskColor(p.score, 0));
          ctx.fillStyle = glowGradient;
          ctx.beginPath();
          ctx.arc(screenX, screenY, size * 3, 0, Math.PI * 2);
          ctx.fill();
          
          // Core
          ctx.fillStyle = getRiskColor(p.score);
          ctx.beginPath();
          ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
          ctx.fill();
          
          // Border
          ctx.strokeStyle = "white";
          ctx.lineWidth = 2;
          ctx.stroke();
        } else {
          // Regular cohort particle
          ctx.fillStyle = getRiskColor(p.score, 0.3);
          ctx.beginPath();
          ctx.arc(screenX, screenY, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });
      
      ctx.restore();

      // Draw labels
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "#666";
      
      // Score label
      ctx.fillText("Low Risk", particleArea.x, particleArea.y + particleArea.height - 5);
      ctx.fillText("High Risk", particleArea.x, particleArea.y + 15);
      
      // Cohort info
      ctx.fillStyle = "#999";
      ctx.font = "10px -apple-system, BlinkMacSystemFont, sans-serif";
      const cohortText = `${cohortComparison.vehiclesInCohort.toLocaleString()} vehicles in cohort`;
      ctx.fillText(cohortText, particleArea.x + particleArea.width - ctx.measureText(cohortText).width, particleArea.y + 15);
      
      // Percentile
      ctx.font = "bold 12px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = getRiskColor(vehicleRisk.priorityScore);
      const percentileText = `${cohortComparison.cohortPercentile}th percentile`;
      ctx.fillText(percentileText, particleArea.x + particleArea.width - ctx.measureText(percentileText).width, particleArea.y + 30);

      // Risk level label on fluid
      ctx.font = "bold 24px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillStyle = "white";
      ctx.textAlign = "center";
      ctx.fillText(`${vehicleRisk.priorityScore}`, width / 2, fluidBottom - 20);
      
      ctx.font = "11px -apple-system, BlinkMacSystemFont, sans-serif";
      ctx.fillText("PRIORITY SCORE", width / 2, fluidBottom - 5);
      ctx.textAlign = "left";

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [vehicleRisk, cohortComparison, initFluid, initCohortParticles, getRiskColor]);

  return (
    <div 
      className={`relative ${className}`}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <canvas
        ref={canvasRef}
        className="w-full h-full rounded-xl"
        style={{ minHeight: "300px" }}
      />
      
      {/* Factor breakdown overlay */}
      {isHovering && (
        <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 text-xs space-y-1 shadow-lg">
          <div className="font-medium text-neutral-900 mb-2">Risk Factors</div>
          <div className="flex justify-between gap-8">
            <span className="text-neutral-500">Weather</span>
            <span className="font-mono">{vehicleRisk.factors.weather.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-neutral-500">DTCs</span>
            <span className="font-mono">{vehicleRisk.factors.dtc.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-neutral-500">Mileage</span>
            <span className="font-mono">{vehicleRisk.factors.mileage.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-neutral-500">Environment</span>
            <span className="font-mono">{vehicleRisk.factors.environment.toFixed(2)}x</span>
          </div>
          <div className="flex justify-between gap-8">
            <span className="text-neutral-500">Recalls</span>
            <span className="font-mono">{vehicleRisk.factors.recalls.toFixed(2)}x</span>
          </div>
          <div className="border-t border-neutral-200 mt-2 pt-2 flex justify-between gap-8 font-medium">
            <span className="text-neutral-700">Combined</span>
            <span className="font-mono">{vehicleRisk.likelihood.toFixed(2)}x</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Simplified mini version for dashboard
export function RiskMeter({ score, size = 60 }: { score: number; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    let currentHeight = 0;
    const targetHeight = score / 100;

    const animate = (timestamp: number) => {
      // Smooth interpolation
      currentHeight += (targetHeight - currentHeight) * 0.05;

      ctx.clearRect(0, 0, size, size);

      // Background circle
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 2, 0, Math.PI * 2);
      ctx.fillStyle = "#f5f5f5";
      ctx.fill();

      // Risk fill (from bottom)
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2 - 3, 0, Math.PI * 2);
      ctx.clip();

      const fillY = size - (currentHeight * size);
      
      // Wave effect
      ctx.beginPath();
      ctx.moveTo(0, size);
      
      for (let x = 0; x <= size; x++) {
        const wave = Math.sin(timestamp * 0.003 + x * 0.1) * 2;
        const y = fillY + wave;
        ctx.lineTo(x, y);
      }
      
      ctx.lineTo(size, size);
      ctx.closePath();

      // Color based on score
      let color: string;
      if (score < 30) color = "rgba(34, 197, 94, 0.8)";
      else if (score < 50) color = "rgba(234, 179, 8, 0.8)";
      else if (score < 70) color = "rgba(249, 115, 22, 0.8)";
      else color = "rgba(239, 68, 68, 0.8)";
      
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();

      // Score text
      ctx.font = `bold ${size / 3}px -apple-system, BlinkMacSystemFont, sans-serif`;
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(score.toString(), size / 2, size / 2);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(animationRef.current);
  }, [score, size]);

  return <canvas ref={canvasRef} style={{ width: size, height: size }} />;
}
