"use client";

import { useEffect, useRef, useCallback } from "react";

export type WeatherType = "clear" | "cloudy" | "rain" | "snow" | "heat" | "cold";

interface WeatherCanvasProps {
  weatherType: WeatherType;
  temperature?: number;
  intensity?: number; // 0-1
  className?: string;
}

interface RainDrop {
  x: number;
  y: number;
  length: number;
  speed: number;
  opacity: number;
  thickness: number;
}

interface SnowFlake {
  x: number;
  y: number;
  size: number;
  speed: number;
  wobble: number;
  wobbleSpeed: number;
  opacity: number;
}

interface HeatWave {
  x: number;
  y: number;
  width: number;
  phase: number;
  speed: number;
  opacity: number;
}

export function WeatherCanvas({
  weatherType,
  temperature = 70,
  intensity = 0.5,
  className = "",
}: WeatherCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const raindropsRef = useRef<RainDrop[]>([]);
  const snowflakesRef = useRef<SnowFlake[]>([]);
  const heatwavesRef = useRef<HeatWave[]>([]);
  const animationRef = useRef<number>(0);
  const timeRef = useRef<number>(0);

  // Initialize rain
  const initRain = useCallback((count: number, width: number, height: number) => {
    const drops: RainDrop[] = [];
    for (let i = 0; i < count; i++) {
      drops.push({
        x: Math.random() * width * 1.5 - width * 0.25,
        y: Math.random() * height,
        length: 15 + Math.random() * 25,
        speed: 800 + Math.random() * 400,
        opacity: 0.1 + Math.random() * 0.3,
        thickness: 1 + Math.random() * 1.5,
      });
    }
    return drops;
  }, []);

  // Initialize snow
  const initSnow = useCallback((count: number, width: number, height: number) => {
    const flakes: SnowFlake[] = [];
    for (let i = 0; i < count; i++) {
      flakes.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        speed: 30 + Math.random() * 50,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 1 + Math.random() * 2,
        opacity: 0.4 + Math.random() * 0.5,
      });
    }
    return flakes;
  }, []);

  // Initialize heat waves
  const initHeatWaves = useCallback((count: number, width: number, height: number) => {
    const waves: HeatWave[] = [];
    for (let i = 0; i < count; i++) {
      waves.push({
        x: Math.random() * width,
        y: height * 0.6 + Math.random() * height * 0.4,
        width: 50 + Math.random() * 150,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1.5,
        opacity: 0.02 + Math.random() * 0.04,
      });
    }
    return waves;
  }, []);

  // Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
    };
    resize();
    window.addEventListener("resize", resize);

    const width = canvas.width / (window.devicePixelRatio || 1);
    const height = canvas.height / (window.devicePixelRatio || 1);

    // Initialize based on weather type
    const particleCount = Math.floor(200 * intensity);
    if (weatherType === "rain") {
      raindropsRef.current = initRain(particleCount * 2, width, height);
    } else if (weatherType === "snow") {
      snowflakesRef.current = initSnow(particleCount, width, height);
    } else if (weatherType === "heat") {
      heatwavesRef.current = initHeatWaves(30, width, height);
    }

    const animate = (timestamp: number) => {
      const deltaTime = Math.min((timestamp - timeRef.current) / 1000, 0.05);
      timeRef.current = timestamp;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Background gradient based on weather
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      
      switch (weatherType) {
        case "rain":
          gradient.addColorStop(0, "rgba(70, 80, 95, 0.08)");
          gradient.addColorStop(0.5, "rgba(60, 70, 85, 0.06)");
          gradient.addColorStop(1, "rgba(50, 60, 75, 0.04)");
          break;
        case "snow":
          gradient.addColorStop(0, "rgba(200, 210, 230, 0.12)");
          gradient.addColorStop(1, "rgba(180, 190, 210, 0.08)");
          break;
        case "heat":
          gradient.addColorStop(0, "rgba(255, 200, 150, 0.08)");
          gradient.addColorStop(1, "rgba(255, 180, 130, 0.04)");
          break;
        case "cold":
          gradient.addColorStop(0, "rgba(180, 200, 240, 0.1)");
          gradient.addColorStop(1, "rgba(160, 180, 220, 0.06)");
          break;
        default:
          gradient.addColorStop(0, "rgba(250, 252, 255, 0.02)");
          gradient.addColorStop(1, "rgba(245, 248, 250, 0.01)");
      }
      
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      // RAIN ANIMATION
      if (weatherType === "rain") {
        const windAngle = 0.15; // Slight angle
        
        raindropsRef.current.forEach((drop) => {
          // Update position
          drop.y += drop.speed * deltaTime;
          drop.x += drop.speed * windAngle * deltaTime;

          // Reset when off screen
          if (drop.y > height + drop.length) {
            drop.y = -drop.length;
            drop.x = Math.random() * width * 1.5 - width * 0.25;
            drop.speed = 800 + Math.random() * 400;
            drop.opacity = 0.1 + Math.random() * 0.3;
          }

          // Draw raindrop as gradient line
          const endX = drop.x + drop.length * windAngle;
          const endY = drop.y + drop.length;
          
          const dropGradient = ctx.createLinearGradient(drop.x, drop.y, endX, endY);
          dropGradient.addColorStop(0, `rgba(180, 200, 220, 0)`);
          dropGradient.addColorStop(0.3, `rgba(180, 200, 220, ${drop.opacity * 0.5})`);
          dropGradient.addColorStop(1, `rgba(200, 220, 240, ${drop.opacity})`);
          
          ctx.beginPath();
          ctx.strokeStyle = dropGradient;
          ctx.lineWidth = drop.thickness;
          ctx.lineCap = "round";
          ctx.moveTo(drop.x, drop.y);
          ctx.lineTo(endX, endY);
          ctx.stroke();
        });

        // Draw splash effects at bottom
        const splashY = height - 20;
        for (let i = 0; i < 10; i++) {
          const splashX = (timestamp * 0.1 + i * 137) % width;
          const splashPhase = (timestamp * 0.01 + i) % 1;
          
          if (splashPhase < 0.3) {
            const splashSize = splashPhase * 15;
            const splashOpacity = (0.3 - splashPhase) * 0.3;
            
            ctx.beginPath();
            ctx.strokeStyle = `rgba(200, 220, 240, ${splashOpacity})`;
            ctx.lineWidth = 1;
            ctx.arc(splashX, splashY, splashSize, Math.PI, 0);
            ctx.stroke();
          }
        }
      }

      // SNOW ANIMATION
      if (weatherType === "snow") {
        snowflakesRef.current.forEach((flake) => {
          flake.y += flake.speed * deltaTime;
          flake.wobble += flake.wobbleSpeed * deltaTime;
          flake.x += Math.sin(flake.wobble) * 0.5;

          if (flake.y > height + flake.size) {
            flake.y = -flake.size;
            flake.x = Math.random() * width;
          }
          if (flake.x > width) flake.x = 0;
          if (flake.x < 0) flake.x = width;

          // Draw snowflake with glow
          const gradient = ctx.createRadialGradient(
            flake.x, flake.y, 0,
            flake.x, flake.y, flake.size * 2
          );
          gradient.addColorStop(0, `rgba(255, 255, 255, ${flake.opacity})`);
          gradient.addColorStop(0.5, `rgba(240, 245, 255, ${flake.opacity * 0.5})`);
          gradient.addColorStop(1, "rgba(255, 255, 255, 0)");
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size * 2, 0, Math.PI * 2);
          ctx.fill();

          // Core
          ctx.fillStyle = `rgba(255, 255, 255, ${flake.opacity})`;
          ctx.beginPath();
          ctx.arc(flake.x, flake.y, flake.size * 0.5, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // HEAT WAVE ANIMATION
      if (weatherType === "heat") {
        heatwavesRef.current.forEach((wave) => {
          wave.phase += wave.speed * deltaTime;
          wave.y -= 15 * deltaTime; // Rise slowly

          if (wave.y < height * 0.3) {
            wave.y = height + 20;
            wave.x = Math.random() * width;
          }

          // Draw wavy distortion line
          ctx.beginPath();
          ctx.strokeStyle = `rgba(255, 200, 100, ${wave.opacity})`;
          ctx.lineWidth = 30;
          ctx.lineCap = "round";
          
          for (let x = 0; x < wave.width; x += 5) {
            const waveY = wave.y + Math.sin(wave.phase + x * 0.05) * 8;
            if (x === 0) {
              ctx.moveTo(wave.x + x, waveY);
            } else {
              ctx.lineTo(wave.x + x, waveY);
            }
          }
          ctx.stroke();
        });

        // Add shimmer effect
        for (let i = 0; i < 20; i++) {
          const shimmerX = (timestamp * 0.02 + i * 73) % width;
          const shimmerY = height * 0.7 + Math.sin(timestamp * 0.003 + i) * 50;
          const shimmerOpacity = 0.02 + Math.sin(timestamp * 0.005 + i * 0.5) * 0.02;
          
          const shimmerGrad = ctx.createRadialGradient(
            shimmerX, shimmerY, 0,
            shimmerX, shimmerY, 40
          );
          shimmerGrad.addColorStop(0, `rgba(255, 220, 150, ${shimmerOpacity})`);
          shimmerGrad.addColorStop(1, "rgba(255, 220, 150, 0)");
          
          ctx.fillStyle = shimmerGrad;
          ctx.fillRect(shimmerX - 40, shimmerY - 40, 80, 80);
        }
      }

      // COLD ANIMATION
      if (weatherType === "cold") {
        // Frost crystals at edges
        const frostOpacity = 0.05 + Math.sin(timestamp * 0.001) * 0.02;
        
        // Top frost
        const topFrost = ctx.createLinearGradient(0, 0, 0, 100);
        topFrost.addColorStop(0, `rgba(200, 220, 255, ${frostOpacity * 2})`);
        topFrost.addColorStop(1, "rgba(200, 220, 255, 0)");
        ctx.fillStyle = topFrost;
        ctx.fillRect(0, 0, width, 100);

        // Ice crystal particles
        for (let i = 0; i < 30; i++) {
          const crystalX = (timestamp * 0.01 + i * 47) % width;
          const crystalY = 20 + Math.sin(timestamp * 0.002 + i) * 10;
          const crystalSize = 2 + Math.sin(i) * 1;
          
          ctx.fillStyle = `rgba(200, 230, 255, ${0.3 + Math.sin(timestamp * 0.003 + i) * 0.2})`;
          
          // Draw 6-pointed crystal
          ctx.beginPath();
          for (let j = 0; j < 6; j++) {
            const angle = (j / 6) * Math.PI * 2;
            const px = crystalX + Math.cos(angle) * crystalSize;
            const py = crystalY + Math.sin(angle) * crystalSize;
            if (j === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.closePath();
          ctx.fill();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [weatherType, temperature, intensity, initRain, initSnow, initHeatWaves]);

  return (
    <canvas
      ref={canvasRef}
      className={`fixed inset-0 pointer-events-none ${className}`}
      style={{ zIndex: 0 }}
    />
  );
}

// Helper to determine weather type from conditions
export function getWeatherType(
  temperature: number,
  precipitation: number,
  humidity: number
): WeatherType {
  if (precipitation > 0.5) {
    return temperature < 32 ? "snow" : "rain";
  }
  if (precipitation > 0.2) {
    return temperature < 32 ? "snow" : "rain";
  }
  if (temperature > 95) return "heat";
  if (temperature < 25) return "cold";
  if (humidity > 80 || precipitation > 0.1) return "cloudy";
  return "clear";
}
