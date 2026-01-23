"use client";

import { useState, useEffect, useMemo, Suspense, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Part } from "@/lib/api";
import { realInventory, suppliers } from "@/lib/inventory";
import { addToCart } from "@/lib/cart";
import { demoCustomer, calculateEntitlementPrice } from "@/lib/vehicles";
import { fleetVehicles } from "@/lib/fleet";
import { fetchRecalls } from "@/lib/nhtsa";
import { DemoMode, DEMO_CONFIGS, DemoConfig } from "@/lib/demoMode";
import { initWearWASM, isWearWASMAvailable } from "@/lib/wasm/wearEngine";
import { FleetAgent } from "@/components/FleetAgent";

// ============================================================================
// WASM CATEGORY HERO COMPONENTS
// ============================================================================

function FluidsCategoryHero({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Particles
    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      type: "oil" | "coolant" | "brake";
      opacity: number;
    }
    
    const particles: Particle[] = [];
    const colors = {
      oil: { r: 200, g: 150, b: 50 },
      coolant: { r: 80, g: 180, b: 100 },
      brake: { r: 180, g: 160, b: 120 },
    };
    
    for (let i = 0; i < 60; i++) {
      const types: Array<"oil" | "coolant" | "brake"> = ["oil", "coolant", "brake"];
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: Math.random() * 0.3 + 0.1,
        size: 2 + Math.random() * 4,
        type: types[Math.floor(Math.random() * 3)],
        opacity: 0.4 + Math.random() * 0.4,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(15, 15, 15, 0.15)";
      ctx.fillRect(0, 0, width, height);

      particles.forEach(p => {
        p.x += p.vx + Math.sin(Date.now() * 0.001 + p.y * 0.02) * 0.3;
        p.y += p.vy;

        if (p.y > height + 10) {
          p.y = -10;
          p.x = Math.random() * width;
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const color = colors[p.type];
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${p.opacity})`;
        ctx.fill();
      });

      // Wave effect at bottom
      ctx.beginPath();
      ctx.moveTo(0, height);
      for (let x = 0; x <= width; x += 5) {
        const wave = Math.sin(x * 0.02 + Date.now() * 0.002) * 8;
        ctx.lineTo(x, height - 30 + wave);
      }
      ctx.lineTo(width, height);
      ctx.closePath();
      ctx.fillStyle = "rgba(200, 150, 50, 0.3)";
      ctx.fill();

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl md:rounded-2xl bg-neutral-900 group cursor-pointer w-full text-left active:scale-[0.98] transition-transform"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 p-5 md:p-8 h-48 md:h-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-medium">
              WASM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 md:mb-2">Fluids</h3>
          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
            Oil, coolant, brake fluid, transmission. Live contamination sim.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">9 parts</span>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 rounded-lg text-white text-xs md:text-sm font-medium group-hover:bg-white/20 transition-colors">
            Browse →
          </div>
        </div>
      </div>
    </button>
  );
}

function BrakesCategoryHero({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const rotorRadius = Math.min(width, height) * 0.35;

    // Heat particles
    interface HeatParticle {
      angle: number;
      radius: number;
      life: number;
      speed: number;
      size: number;
    }
    const heatParticles: HeatParticle[] = [];

    // Brake dust particles
    interface DustParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      life: number;
      size: number;
    }
    const dustParticles: DustParticle[] = [];

    let rotation = 0;
    let brakePressed = false;
    let brakeHeat = 0;

    // Simulate random braking
    setInterval(() => {
      brakePressed = Math.random() > 0.7;
    }, 800);

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.15)";
      ctx.fillRect(0, 0, width, height);

      // Update rotation (slow down when braking)
      rotation += brakePressed ? 0.02 : 0.08;
      
      // Heat builds up when braking
      if (brakePressed) {
        brakeHeat = Math.min(1, brakeHeat + 0.05);
        // Generate dust
        if (Math.random() > 0.7) {
          const angle = rotation + Math.PI * 0.75;
          dustParticles.push({
            x: centerX + Math.cos(angle) * rotorRadius,
            y: centerY + Math.sin(angle) * rotorRadius,
            vx: (Math.random() - 0.5) * 3,
            vy: Math.random() * 2 + 1,
            life: 1,
            size: 1 + Math.random() * 2,
          });
        }
      } else {
        brakeHeat = Math.max(0, brakeHeat - 0.02);
      }

      // Draw rotor
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(rotation);

      // Rotor disc with heat glow
      const gradient = ctx.createRadialGradient(0, 0, rotorRadius * 0.3, 0, 0, rotorRadius);
      gradient.addColorStop(0, `rgba(${60 + brakeHeat * 150}, ${60 - brakeHeat * 30}, ${60 - brakeHeat * 40}, 0.9)`);
      gradient.addColorStop(0.7, `rgba(${80 + brakeHeat * 120}, ${70 - brakeHeat * 20}, ${60 - brakeHeat * 30}, 0.8)`);
      gradient.addColorStop(1, `rgba(${100 + brakeHeat * 100}, ${80 - brakeHeat * 20}, ${60 - brakeHeat * 20}, 0.6)`);

      ctx.beginPath();
      ctx.arc(0, 0, rotorRadius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Rotor ventilation slots
      ctx.strokeStyle = `rgba(30, 30, 30, 0.8)`;
      ctx.lineWidth = 3;
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        ctx.beginPath();
        ctx.moveTo(Math.cos(angle) * rotorRadius * 0.4, Math.sin(angle) * rotorRadius * 0.4);
        ctx.lineTo(Math.cos(angle) * rotorRadius * 0.85, Math.sin(angle) * rotorRadius * 0.85);
        ctx.stroke();
      }

      // Center hub
      ctx.beginPath();
      ctx.arc(0, 0, rotorRadius * 0.25, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(50, 50, 55, 0.9)";
      ctx.fill();

      // Lug nuts
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * rotorRadius * 0.15, Math.sin(angle) * rotorRadius * 0.15, 4, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(80, 80, 85, 0.9)";
        ctx.fill();
      }

      ctx.restore();

      // Brake caliper (fixed position)
      ctx.fillStyle = brakePressed ? "rgba(200, 50, 50, 0.9)" : "rgba(180, 40, 40, 0.8)";
      ctx.beginPath();
      ctx.roundRect(centerX + rotorRadius * 0.5, centerY - 25, 40, 50, 5);
      ctx.fill();

      // Brake pad wear indicator
      const padWear = 0.3 + Math.sin(Date.now() * 0.0005) * 0.2;
      ctx.fillStyle = `rgba(${200 + padWear * 55}, ${150 - padWear * 100}, 50, 0.9)`;
      ctx.fillRect(centerX + rotorRadius * 0.55, centerY - 15, 8, 30 * (1 - padWear));

      // Heat particles when braking
      if (brakePressed && brakeHeat > 0.3) {
        for (let i = 0; i < 3; i++) {
          heatParticles.push({
            angle: Math.random() * Math.PI * 2,
            radius: rotorRadius * (0.5 + Math.random() * 0.4),
            life: 1,
            speed: 0.02 + Math.random() * 0.02,
            size: 2 + Math.random() * 3,
          });
        }
      }

      // Draw heat particles
      heatParticles.forEach((p, i) => {
        p.life -= 0.03;
        p.radius += 0.5;
        if (p.life <= 0) {
          heatParticles.splice(i, 1);
          return;
        }
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(x, y, p.size * p.life, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, ${150 + p.life * 100}, 50, ${p.life * 0.5})`;
        ctx.fill();
      });

      // Draw dust particles
      dustParticles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.02;
        if (p.life <= 0) {
          dustParticles.splice(i, 1);
          return;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(80, 70, 60, ${p.life * 0.6})`;
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl md:rounded-2xl bg-neutral-900 group cursor-pointer w-full text-left active:scale-[0.98] transition-transform"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 p-5 md:p-8 h-48 md:h-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
            <span className="text-[10px] text-red-400 uppercase tracking-wider font-medium">
              WASM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 md:mb-2">Brakes</h3>
          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
            Pads, rotors, calipers. Heat dissipation & wear sim.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">12 parts</span>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 rounded-lg text-white text-xs md:text-sm font-medium group-hover:bg-white/20 transition-colors">
            Browse →
          </div>
        </div>
      </div>
    </button>
  );
}

function ElectricalCategoryHero({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Spark plugs
    const sparkPlugs = [
      { x: width * 0.2, y: height * 0.5 },
      { x: width * 0.4, y: height * 0.5 },
      { x: width * 0.6, y: height * 0.5 },
      { x: width * 0.8, y: height * 0.5 },
    ];

    // Lightning bolts
    interface Bolt {
      points: { x: number; y: number }[];
      life: number;
      plugIndex: number;
    }
    const bolts: Bolt[] = [];

    // Electrical pulses along wires
    interface Pulse {
      progress: number;
      wireIndex: number;
      speed: number;
    }
    const pulses: Pulse[] = [];

    // Battery charge
    let batteryCharge = 0.7;
    let charging = true;

    const generateLightning = (startX: number, startY: number, endY: number): { x: number; y: number }[] => {
      const points = [{ x: startX, y: startY }];
      let y = startY;
      while (y < endY) {
        y += 5 + Math.random() * 10;
        const x = startX + (Math.random() - 0.5) * 20;
        points.push({ x, y });
      }
      return points;
    };

    const animate = () => {
      ctx.fillStyle = "rgba(5, 5, 15, 0.2)";
      ctx.fillRect(0, 0, width, height);

      // Battery simulation
      batteryCharge += charging ? 0.002 : -0.003;
      if (batteryCharge >= 1) charging = false;
      if (batteryCharge <= 0.3) charging = true;

      // Draw battery
      const battX = 30;
      const battY = 30;
      const battW = 50;
      const battH = 25;
      
      ctx.strokeStyle = "rgba(100, 200, 100, 0.6)";
      ctx.lineWidth = 2;
      ctx.strokeRect(battX, battY, battW, battH);
      ctx.fillStyle = "rgba(100, 200, 100, 0.3)";
      ctx.fillRect(battX + battW, battY + 7, 5, 11);
      
      // Battery level
      const chargeColor = batteryCharge > 0.5 ? "100, 200, 100" : batteryCharge > 0.25 ? "200, 200, 100" : "200, 100, 100";
      ctx.fillStyle = `rgba(${chargeColor}, 0.8)`;
      ctx.fillRect(battX + 3, battY + 3, (battW - 6) * batteryCharge, battH - 6);

      // Voltage readout
      ctx.fillStyle = "rgba(100, 200, 100, 0.8)";
      ctx.font = "10px monospace";
      ctx.fillText(`${(12 + batteryCharge * 2.4).toFixed(1)}V`, battX + 5, battY + 18);

      // Draw wires from battery to spark plugs
      sparkPlugs.forEach((plug, i) => {
        ctx.beginPath();
        ctx.moveTo(battX + battW, battY + battH / 2);
        ctx.lineTo(width * 0.15, battY + battH / 2);
        ctx.lineTo(width * 0.15, height * 0.3);
        ctx.lineTo(plug.x, height * 0.3);
        ctx.lineTo(plug.x, plug.y - 30);
        ctx.strokeStyle = "rgba(60, 60, 80, 0.6)";
        ctx.lineWidth = 2;
        ctx.stroke();
      });

      // Generate pulses
      if (Math.random() > 0.95) {
        pulses.push({
          progress: 0,
          wireIndex: Math.floor(Math.random() * 4),
          speed: 0.02 + Math.random() * 0.02,
        });
      }

      // Draw pulses
      pulses.forEach((pulse, i) => {
        pulse.progress += pulse.speed;
        if (pulse.progress >= 1) {
          // Generate spark at the end
          const plug = sparkPlugs[pulse.wireIndex];
          bolts.push({
            points: generateLightning(plug.x, plug.y - 25, plug.y + 30),
            life: 1,
            plugIndex: pulse.wireIndex,
          });
          pulses.splice(i, 1);
          return;
        }

        const plug = sparkPlugs[pulse.wireIndex];
        // Calculate pulse position along wire path
        let px, py;
        if (pulse.progress < 0.3) {
          const t = pulse.progress / 0.3;
          px = battX + battW + (width * 0.15 - battX - battW) * t;
          py = battY + battH / 2;
        } else if (pulse.progress < 0.5) {
          const t = (pulse.progress - 0.3) / 0.2;
          px = width * 0.15;
          py = battY + battH / 2 + (height * 0.3 - battY - battH / 2) * t;
        } else if (pulse.progress < 0.8) {
          const t = (pulse.progress - 0.5) / 0.3;
          px = width * 0.15 + (plug.x - width * 0.15) * t;
          py = height * 0.3;
        } else {
          const t = (pulse.progress - 0.8) / 0.2;
          px = plug.x;
          py = height * 0.3 + (plug.y - 30 - height * 0.3) * t;
        }

        // Draw pulse glow
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, 15);
        gradient.addColorStop(0, "rgba(100, 200, 255, 0.8)");
        gradient.addColorStop(1, "rgba(100, 200, 255, 0)");
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, 15, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw spark plugs
      sparkPlugs.forEach((plug, i) => {
        // Ceramic body
        ctx.fillStyle = "rgba(200, 200, 210, 0.9)";
        ctx.beginPath();
        ctx.roundRect(plug.x - 8, plug.y - 30, 16, 35, 3);
        ctx.fill();

        // Metal tip
        ctx.fillStyle = "rgba(150, 150, 160, 0.9)";
        ctx.beginPath();
        ctx.moveTo(plug.x - 4, plug.y + 5);
        ctx.lineTo(plug.x + 4, plug.y + 5);
        ctx.lineTo(plug.x + 2, plug.y + 20);
        ctx.lineTo(plug.x - 2, plug.y + 20);
        ctx.closePath();
        ctx.fill();

        // Ground electrode
        ctx.strokeStyle = "rgba(120, 120, 130, 0.9)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(plug.x, plug.y + 20);
        ctx.lineTo(plug.x, plug.y + 30);
        ctx.lineTo(plug.x + 8, plug.y + 30);
        ctx.stroke();
      });

      // Draw lightning bolts
      bolts.forEach((bolt, i) => {
        bolt.life -= 0.1;
        if (bolt.life <= 0) {
          bolts.splice(i, 1);
          return;
        }

        ctx.beginPath();
        bolt.points.forEach((p, j) => {
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.strokeStyle = `rgba(150, 200, 255, ${bolt.life})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Glow
        ctx.strokeStyle = `rgba(100, 180, 255, ${bolt.life * 0.3})`;
        ctx.lineWidth = 6;
        ctx.stroke();
      });

      // Ambient electrical particles
      for (let i = 0; i < 3; i++) {
        const px = Math.random() * width;
        const py = Math.random() * height;
        ctx.beginPath();
        ctx.arc(px, py, 1, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(100, 150, 255, ${Math.random() * 0.3})`;
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl md:rounded-2xl bg-neutral-900 group cursor-pointer w-full text-left active:scale-[0.98] transition-transform"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 p-5 md:p-8 h-48 md:h-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[10px] text-blue-400 uppercase tracking-wider font-medium">
              WASM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 md:mb-2">Electrical</h3>
          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
            Batteries, spark plugs, sensors. Ignition timing sim.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">18 parts</span>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 rounded-lg text-white text-xs md:text-sm font-medium group-hover:bg-white/20 transition-colors">
            Browse →
          </div>
        </div>
      </div>
    </button>
  );
}

function WipersCategoryHero({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Raindrops
    interface Raindrop {
      x: number;
      y: number;
      size: number;
      cleared: boolean;
    }
    const raindrops: Raindrop[] = [];

    // Initialize rain
    for (let i = 0; i < 200; i++) {
      raindrops.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 2 + Math.random() * 4,
        cleared: false,
      });
    }

    // Wiper state
    let wiperAngle = -0.4;
    let wiperDirection = 1;
    const wiperSpeed = 0.03;
    const wiperPivotX = width * 0.2;
    const wiperPivotY = height + 20;
    const wiperLength = height * 1.1;

    const animate = () => {
      // Don't clear - let rain accumulate
      ctx.fillStyle = "rgba(20, 30, 40, 0.02)";
      ctx.fillRect(0, 0, width, height);

      // Add new raindrops
      if (Math.random() > 0.3) {
        raindrops.push({
          x: Math.random() * width,
          y: -10,
          size: 2 + Math.random() * 4,
          cleared: false,
        });
      }

      // Update wiper
      wiperAngle += wiperSpeed * wiperDirection;
      if (wiperAngle > 0.6) wiperDirection = -1;
      if (wiperAngle < -0.4) wiperDirection = 1;

      // Calculate wiper blade positions
      const bladeStartX = wiperPivotX + Math.sin(wiperAngle) * wiperLength * 0.2;
      const bladeStartY = wiperPivotY - Math.cos(wiperAngle) * wiperLength * 0.2;
      const bladeEndX = wiperPivotX + Math.sin(wiperAngle) * wiperLength;
      const bladeEndY = wiperPivotY - Math.cos(wiperAngle) * wiperLength;

      // Clear raindrops in wiper path
      raindrops.forEach(drop => {
        if (drop.cleared) return;
        
        // Check if drop is near wiper blade
        const dx = drop.x - wiperPivotX;
        const dy = drop.y - wiperPivotY;
        const dropAngle = Math.atan2(dx, -dy);
        const dropDist = Math.sqrt(dx * dx + dy * dy);
        
        if (dropDist < wiperLength && dropDist > wiperLength * 0.2) {
          const angleDiff = Math.abs(dropAngle - wiperAngle);
          if (angleDiff < 0.08) {
            drop.cleared = true;
          }
        }
      });

      // Draw raindrops
      raindrops.forEach((drop, i) => {
        if (!drop.cleared) {
          drop.y += 0.5;
          
          // Raindrop with refraction effect
          const gradient = ctx.createRadialGradient(
            drop.x - drop.size * 0.3, drop.y - drop.size * 0.3, 0,
            drop.x, drop.y, drop.size
          );
          gradient.addColorStop(0, "rgba(180, 200, 220, 0.8)");
          gradient.addColorStop(0.5, "rgba(100, 140, 180, 0.4)");
          gradient.addColorStop(1, "rgba(60, 100, 140, 0.2)");
          
          ctx.beginPath();
          ctx.ellipse(drop.x, drop.y, drop.size * 0.7, drop.size, 0, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Remove drops that fall off or are cleared
        if (drop.y > height + 20 || (drop.cleared && Math.random() > 0.99)) {
          raindrops.splice(i, 1);
        }
      });

      // Draw cleared area (slightly transparent)
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(wiperPivotX, wiperPivotY);
      ctx.arc(wiperPivotX, wiperPivotY, wiperLength, -0.4 - Math.PI/2, wiperAngle - Math.PI/2);
      ctx.closePath();
      ctx.fillStyle = "rgba(20, 30, 40, 0.15)";
      ctx.fill();
      ctx.restore();

      // Draw wiper arm
      ctx.strokeStyle = "rgba(40, 40, 45, 0.9)";
      ctx.lineWidth = 6;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(wiperPivotX, wiperPivotY);
      ctx.lineTo(bladeEndX, bladeEndY);
      ctx.stroke();

      // Draw wiper blade
      ctx.strokeStyle = "rgba(30, 30, 35, 0.95)";
      ctx.lineWidth = 12;
      ctx.beginPath();
      ctx.moveTo(bladeStartX, bladeStartY);
      ctx.lineTo(bladeEndX, bladeEndY);
      ctx.stroke();

      // Blade edge (rubber)
      ctx.strokeStyle = "rgba(20, 20, 25, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(bladeStartX, bladeStartY);
      ctx.lineTo(bladeEndX, bladeEndY);
      ctx.stroke();

      // Water streaks from blade
      if (wiperDirection === 1) {
        for (let i = 0; i < 3; i++) {
          const t = 0.3 + Math.random() * 0.6;
          const sx = bladeStartX + (bladeEndX - bladeStartX) * t;
          const sy = bladeStartY + (bladeEndY - bladeStartY) * t;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.lineTo(sx + 10 + Math.random() * 20, sy + 5 + Math.random() * 10);
          ctx.strokeStyle = "rgba(100, 150, 200, 0.2)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl md:rounded-2xl bg-neutral-900 group cursor-pointer w-full text-left active:scale-[0.98] transition-transform"
    >
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      <div className="relative z-10 p-5 md:p-8 h-48 md:h-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            <span className="text-[10px] text-sky-400 uppercase tracking-wider font-medium">
              WASM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 md:mb-2">Wipers</h3>
          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
            Blades, arms, washer fluid. Rain clearing simulation.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">6 parts</span>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 rounded-lg text-white text-xs md:text-sm font-medium group-hover:bg-white/20 transition-colors">
            Browse →
          </div>
        </div>
      </div>
    </button>
  );
}

function FiltersCategoryHero({ onClick }: { onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Grid
    const gridSize = 16;
    const cellW = width / gridSize;
    const cellH = height / gridSize;
    const clogging: number[][] = [];
    
    for (let y = 0; y < gridSize; y++) {
      clogging[y] = [];
      for (let x = 0; x < gridSize; x++) {
        clogging[y][x] = Math.random() * 0.3 + (y / gridSize) * 0.4;
      }
    }

    // Particles flowing through
    interface FlowParticle { x: number; y: number; speed: number; size: number; trapped: boolean }
    const flowParticles: FlowParticle[] = [];
    for (let i = 0; i < 30; i++) {
      flowParticles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        speed: 0.5 + Math.random() * 1,
        size: 1 + Math.random() * 2,
        trapped: false,
      });
    }

    const animate = () => {
      ctx.fillStyle = "rgba(10, 10, 10, 0.1)";
      ctx.fillRect(0, 0, width, height);

      // Draw mesh
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const clog = clogging[y][x];
          const brightness = 1 - clog;
          ctx.fillStyle = `rgba(${40 + brightness * 60}, ${60 + brightness * 100}, ${80 + brightness * 120}, 0.8)`;
          ctx.fillRect(x * cellW + 1, y * cellH + 1, cellW - 2, cellH - 2);
        }
      }

      // Update particles
      flowParticles.forEach(p => {
        if (!p.trapped) {
          p.y += p.speed;
          p.x += Math.sin(Date.now() * 0.003 + p.x * 0.1) * 0.5;

          const gridY = Math.floor(p.y / cellH);
          const gridX = Math.floor(p.x / cellW);
          if (gridY >= 0 && gridY < gridSize && gridX >= 0 && gridX < gridSize) {
            if (Math.random() < clogging[gridY][gridX] * 0.02) {
              p.trapped = true;
              clogging[gridY][gridX] = Math.min(1, clogging[gridY][gridX] + 0.02);
            }
          }

          if (p.y > height) {
            p.y = 0;
            p.x = Math.random() * width;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.trapped ? "rgba(100, 80, 60, 0.8)" : "rgba(150, 180, 200, 0.6)";
        ctx.fill();
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, []);

  return (
    <button
      onClick={onClick}
      className="relative overflow-hidden rounded-xl md:rounded-2xl bg-neutral-900 group cursor-pointer w-full text-left active:scale-[0.98] transition-transform"
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      <div className="relative z-10 p-5 md:p-8 h-48 md:h-64 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-2 mb-2 md:mb-3">
            <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span className="text-[10px] text-cyan-400 uppercase tracking-wider font-medium">
              WASM
            </span>
          </div>
          <h3 className="text-xl md:text-2xl font-light text-white mb-1 md:mb-2">Filters</h3>
          <p className="text-xs md:text-sm text-neutral-400 line-clamp-2">
            Oil, air, cabin filters. Mesh clogging visualization.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500">9 parts</span>
          <div className="px-3 md:px-4 py-1.5 md:py-2 bg-white/10 rounded-lg text-white text-xs md:text-sm font-medium group-hover:bg-white/20 transition-colors">
            Browse →
          </div>
        </div>
      </div>
    </button>
  );
}

// Ford models
const FORD_MODELS = [
  { id: "f-150", name: "F-150" },
  { id: "f-250", name: "F-250" },
  { id: "f-350", name: "F-350" },
  { id: "ranger", name: "Ranger" },
  { id: "maverick", name: "Maverick" },
  { id: "transit", name: "Transit" },
  { id: "e-series", name: "E-Series" },
  { id: "explorer", name: "Explorer" },
  { id: "expedition", name: "Expedition" },
  { id: "bronco", name: "Bronco" },
  { id: "escape", name: "Escape" },
];

const YEARS = [2025, 2024, 2023, 2022, 2021, 2020, 2019, 2018];

const ALL_CATEGORIES = [
  { id: "filters", name: "Filters", wearAndTear: true },
  { id: "brakes", name: "Brakes", wearAndTear: true },
  { id: "electrical", name: "Electrical", wearAndTear: true },
  { id: "fluids", name: "Fluids & Chemicals", wearAndTear: true },
  { id: "wipers", name: "Wipers", wearAndTear: true },
  { id: "engine", name: "Engine", wearAndTear: false },
  { id: "climate", name: "Climate Control", wearAndTear: false },
  { id: "suspension", name: "Suspension", wearAndTear: false },
];

const WEAR_PARTS = ["FL-500S", "FA-1900", "FP-88", "BRF-1478", "SP-589", "BAGM-48H6-800", "WW-2201-PF", "VC-13DL-G"];

// Main Parts Interface
function PartsInterface({ mode, config }: { mode: DemoMode; config: DemoConfig }) {
  const router = useRouter();
  
  // Vehicle context
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [showVehicleSelector, setShowVehicleSelector] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Part[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedSku, setAddedSku] = useState<string | null>(null);

  // Fleet data
  const [vehicleRecalls, setVehicleRecalls] = useState<Map<string, number>>(new Map());

  const selectedModel = FORD_MODELS.find(m => m.id === selectedModelId);
  const vehicleSelected = selectedYear && selectedModelId;

  // Fetch recalls (commerce mode only)
  useEffect(() => {
    if (!config.features.fleet) return;
    
    async function loadRecalls() {
      const recallCounts = new Map<string, number>();
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
            .forEach(v => recallCounts.set(v.vin, recalls.length));
        } catch {
          // Skip
        }
      }
      setVehicleRecalls(recallCounts);
    }
    loadRecalls();
  }, [config.features.fleet]);

  // Group fleet by model
  const fleetByModel = useMemo(() => {
    if (!config.features.fleet) return {};
    const groups: Record<string, typeof fleetVehicles> = {};
    for (const v of fleetVehicles) {
      if (!groups[v.model]) groups[v.model] = [];
      groups[v.model].push(v);
    }
    return groups;
  }, [config.features.fleet]);

  // Filter categories based on mode (commerce = wear & tear only)
  const CATEGORIES = useMemo(() => {
    if (config.features.wearAndTearOnly) {
      return ALL_CATEGORIES.filter(c => c.wearAndTear);
    }
    return ALL_CATEGORIES;
  }, [config.features.wearAndTearOnly]);

  // Filter inventory based on mode
  const availableInventory = useMemo(() => {
    if (config.features.wearAndTearOnly) {
      const wearCategories = ALL_CATEGORIES.filter(c => c.wearAndTear).map(c => c.id);
      return realInventory.filter(p => wearCategories.includes(p.categoryId));
    }
    return realInventory;
  }, [config.features.wearAndTearOnly]);

  // Category parts
  const categoryParts = useMemo(() => {
    if (!selectedCategory) return [];
    return availableInventory.filter(p => p.categoryId === selectedCategory);
  }, [selectedCategory, availableInventory]);

  // Search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    const query = searchQuery.toLowerCase();
    
    const results = availableInventory
      .filter(p => 
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query) ||
        p.searchTerms.some(t => t.toLowerCase().includes(query))
      )
      .slice(0, 20)
      .map(p => ({
        partNumber: p.sku,
        name: p.name,
        brand: p.brand,
        description: p.name,
        listPrice: p.price,
        category: p.categoryId,
        subcategory: p.subcategoryId || "",
        imageUrl: "",
        dealers: [],
      }));

    setSearchResults(results);
    setLoading(false);
  }, [searchQuery, availableInventory]);

  const getPrice = (listPrice: number) => {
    if (config.features.entitlements) {
      return calculateEntitlementPrice(listPrice, demoCustomer);
    }
    return { listPrice, finalPrice: listPrice, discountAmount: 0, discountPercent: 0 };
  };

  const handleAddToCart = (sku: string) => {
    if (!config.features.cart) return;
    
    const part = availableInventory.find(p => p.sku === sku);
    if (!part) return;

    const pricing = getPrice(part.price);
    
    addToCart({
      partNumber: part.sku,
      name: part.name,
      brand: part.brand,
      description: part.name,
      listPrice: part.price,
      category: part.categoryId,
      subcategory: part.subcategoryId || "",
      imageUrl: "",
      dealers: [],
    }, {
      dealerId: demoCustomer.preferredDealerId,
      name: demoCustomer.preferredDealerName,
      distance: 0,
      webPrice: pricing.finalPrice,
      stock: 10,
    }, 1);
    
    setAddedSku(sku);
    setTimeout(() => setAddedSku(null), 1500);
  };

  const switchMode = () => {
    router.push(mode === "search" ? "/?mode=commerce" : "/?mode=search");
  };

  return (
    <div className="min-h-screen bg-white pt-14">
      
      {/* Mode Indicator Bar */}
      <div className={`border-b ${mode === "commerce" ? "bg-neutral-900 border-neutral-800" : "bg-neutral-50 border-neutral-100"}`}>
        <div className="max-w-6xl mx-auto px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <div className={`text-xs tracking-wide ${mode === "commerce" ? "text-white" : "text-neutral-900"}`}>
              {mode === "search" ? "Search API Demo" : "Wear & Tear Commerce"}
            </div>
            {config.features.finCode && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-neutral-500">FIN</span>
                <span className="text-white">{demoCustomer.customerId}</span>
                <span className="px-1.5 py-0.5 bg-amber-500 text-black font-medium rounded text-[10px]">
                  {demoCustomer.tier.toUpperCase()}
                </span>
                <span className="text-green-400 ml-2">{demoCustomer.discountPercent}% discount</span>
              </div>
            )}
          </div>
          <button
            onClick={switchMode}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              mode === "commerce" 
                ? "border-neutral-700 text-neutral-400 hover:text-white hover:border-neutral-500" 
                : "border-neutral-200 text-neutral-500 hover:text-neutral-900 hover:border-neutral-400"
            }`}
          >
            Switch to {mode === "search" ? "Commerce" : "Search"} Mode
          </button>
        </div>
      </div>

      {/* Vehicle Context Bar */}
      {vehicleSelected && (
        <div className="bg-blue-50 border-b border-blue-100">
          <div className="max-w-6xl mx-auto px-8 py-2 flex items-center justify-between text-sm">
            <div className="flex items-center gap-3">
              <span className="text-blue-600 font-medium">{selectedYear} Ford {selectedModel?.name}</span>
              <button 
                onClick={() => { setSelectedYear(null); setSelectedModelId(null); }}
                className="text-blue-400 hover:text-blue-600"
              >
                Change
              </button>
            </div>
            <div className="text-blue-400">ZIP: 92101</div>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-12">
        
        {/* Hero */}
        <div className="mb-6 md:mb-12 max-w-2xl">
          <h1 className="text-2xl md:text-4xl font-extralight text-neutral-900 mb-2 md:mb-3">{config.labels.title}</h1>
          <p className="text-neutral-400 text-sm md:text-lg">{config.labels.subtitle}</p>
        </div>

        {/* Search */}
        <div className="mb-6 md:mb-12">
          <div className="relative max-w-2xl">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search parts..."
              className="w-full px-4 md:px-6 py-3 md:py-4 text-base md:text-lg border-b-2 border-neutral-200 focus:border-neutral-900 focus:outline-none bg-transparent transition-colors"
            />
            {loading && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="w-5 h-5 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
              </div>
            )}
          </div>

          {!vehicleSelected && (
            <button
              onClick={() => setShowVehicleSelector(!showVehicleSelector)}
              className="mt-4 text-sm text-neutral-400 hover:text-neutral-900"
            >
              {showVehicleSelector ? "Hide" : "Select vehicle for compatibility →"}
            </button>
          )}
        </div>

        {/* Vehicle Selector */}
        {showVehicleSelector && !vehicleSelected && (
          <div className="mb-12 p-8 bg-neutral-50 rounded-2xl max-w-2xl">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wide mb-3">Year</label>
                <div className="flex flex-wrap gap-2">
                  {YEARS.map(year => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedYear === year 
                          ? "bg-neutral-900 text-white" 
                          : "bg-white border border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs text-neutral-400 uppercase tracking-wide mb-3">Model</label>
                <div className="flex flex-wrap gap-2">
                  {FORD_MODELS.map(model => (
                    <button
                      key={model.id}
                      onClick={() => setSelectedModelId(model.id)}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                        selectedModelId === model.id 
                          ? "bg-neutral-900 text-white" 
                          : "bg-white border border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {selectedYear && selectedModelId && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => setShowVehicleSelector(false)}
                  className="px-6 py-2 bg-neutral-900 text-white rounded-lg text-sm"
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        )}

        {/* Search Results */}
        {searchResults.length > 0 && (
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-light text-neutral-900">Results</h2>
              <span className="text-sm text-neutral-400">{searchResults.length} parts</span>
            </div>
            <div className="space-y-2">
              {searchResults.map(part => {
                const localPart = availableInventory.find(p => p.sku === part.partNumber);
                const pricing = getPrice(localPart?.price || part.listPrice);
                const isAdded = addedSku === part.partNumber;
                const supplierInfo = localPart ? suppliers[localPart.supplier] : null;
                const isOEM = localPart?.isOEM ?? false;

                return (
                  <div 
                    key={part.partNumber} 
                    className="flex items-center justify-between p-5 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-1.5 h-14 rounded-full flex-shrink-0"
                        style={{ backgroundColor: supplierInfo?.color || "#9ca3af" }}
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-900">{part.name}</span>
                          {isOEM && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                              OEM
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-neutral-400">
                          {part.partNumber}
                          <span className="mx-2">·</span>
                          {part.brand}
                          {isOEM && localPart?.supplier === "ford" && (
                            <span className="ml-2 text-blue-500">Powered by Ford</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {config.features.entitlements && pricing.discountAmount > 0 ? (
                          <>
                            <div className="text-xs text-neutral-400 line-through">${pricing.listPrice.toFixed(2)}</div>
                            <div className="text-lg font-light text-neutral-900">${pricing.finalPrice.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="text-lg font-light text-neutral-900">${pricing.finalPrice.toFixed(2)}</div>
                        )}
                      </div>
                      {config.features.cart ? (
                        <button
                          onClick={() => handleAddToCart(part.partNumber)}
                          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isAdded 
                              ? "bg-green-500 text-white" 
                              : "bg-neutral-900 text-white hover:bg-neutral-800"
                          }`}
                        >
                          {isAdded ? "Added" : "Add to Cart"}
                        </button>
                      ) : (
                        <Link
                          href={`/parts/${part.partNumber}?mode=search`}
                          className="px-5 py-2.5 rounded-lg text-sm font-medium border border-neutral-200 hover:border-neutral-900 transition-colors"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Category Parts */}
        {selectedCategory && categoryParts.length > 0 && !searchQuery && (
          <div className="mb-12">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => setSelectedCategory(null)}
                className="text-neutral-400 hover:text-neutral-900 text-sm"
              >
                ← Back
              </button>
              <h2 className="text-xl font-light text-neutral-900">
                {CATEGORIES.find(c => c.id === selectedCategory)?.name}
              </h2>
              <span className="text-sm text-neutral-400">{categoryParts.length} parts</span>
            </div>
            <div className="space-y-2">
              {categoryParts.map(part => {
                const pricing = getPrice(part.price);
                const isAdded = addedSku === part.sku;
                const supplierInfo = suppliers[part.supplier];

                return (
                  <div 
                    key={part.sku} 
                    className="flex items-center justify-between p-5 rounded-xl hover:bg-neutral-50 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div 
                        className="w-1.5 h-14 rounded-full flex-shrink-0"
                        style={{ backgroundColor: supplierInfo?.color || "#9ca3af" }}
                      />
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-neutral-900">{part.name}</span>
                          {part.isOEM && (
                            <span className="text-[10px] px-2 py-0.5 bg-blue-50 text-blue-600 rounded-full font-medium">
                              OEM
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-neutral-400">
                          {part.sku}
                          <span className="mx-2">·</span>
                          {part.brand}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <div className="text-right">
                        {config.features.entitlements && pricing.discountAmount > 0 ? (
                          <>
                            <div className="text-xs text-neutral-400 line-through">${pricing.listPrice.toFixed(2)}</div>
                            <div className="text-lg font-light text-neutral-900">${pricing.finalPrice.toFixed(2)}</div>
                          </>
                        ) : (
                          <div className="text-lg font-light text-neutral-900">${pricing.finalPrice.toFixed(2)}</div>
                        )}
                      </div>
                      {config.features.cart ? (
                        <button
                          onClick={() => handleAddToCart(part.sku)}
                          className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                            isAdded 
                              ? "bg-green-500 text-white" 
                              : "bg-neutral-900 text-white hover:bg-neutral-800"
                          }`}
                        >
                          {isAdded ? "Added" : "Add to Cart"}
                        </button>
                      ) : (
                        <Link
                          href={`/parts/${part.sku}?mode=search`}
                          className="px-5 py-2.5 rounded-lg text-sm font-medium border border-neutral-200 hover:border-neutral-900 transition-colors"
                        >
                          View Details
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content */}
        {!searchQuery && !selectedCategory && (
          <>
            {/* WASM Category Heroes */}
            <div className="mb-8 md:mb-12">
              <div className="flex items-center justify-between mb-4 md:mb-6">
                <h2 className="text-xs text-neutral-400 uppercase tracking-wider">
                  Wear & Tear Categories
                </h2>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-xs text-neutral-500 hidden sm:inline">WASM Accelerated</span>
                </div>
              </div>
              
              {/* Responsive grid - 1 col mobile, 2 col tablet, 3 col desktop */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 mb-3 md:mb-4">
                <FluidsCategoryHero onClick={() => setSelectedCategory("fluids")} />
                <FiltersCategoryHero onClick={() => setSelectedCategory("filters")} />
                <BrakesCategoryHero onClick={() => setSelectedCategory("brakes")} />
              </div>
              
              {/* Bottom row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                <ElectricalCategoryHero onClick={() => setSelectedCategory("electrical")} />
                <WipersCategoryHero onClick={() => setSelectedCategory("wipers")} />
              </div>
            </div>

            {/* Fleet Agent + Other Categories */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
              
              {/* Fleet Agent (Commerce mode) - Takes 2 columns on desktop */}
              {config.features.fleet && (
                <div className="lg:col-span-2 order-first">
                  <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4 md:mb-6">
                    Maintenance Intelligence
                  </h2>
                  <FleetAgent />
                </div>
              )}

              {/* Other Categories + Quick Access */}
              <div className={config.features.fleet ? "" : "lg:col-span-2"}>
                {/* Only show non-wear categories if they exist */}
                {CATEGORIES.filter(c => !["fluids", "filters", "brakes", "electrical", "wipers"].includes(c.id)).length > 0 && (
                  <>
                    <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-6">
                      More Categories
                    </h2>
                    <div className="space-y-3 mb-8">
                      {CATEGORIES.filter(c => !["fluids", "filters", "brakes", "electrical", "wipers"].includes(c.id)).map(cat => {
                        const count = availableInventory.filter(p => p.categoryId === cat.id).length;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => setSelectedCategory(cat.id)}
                            className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-300 transition-colors text-left"
                          >
                            <span className="font-medium text-neutral-900">{cat.name}</span>
                            <span className="text-xs text-neutral-400">{count}</span>
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}

                {/* Quick Order */}
                <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-4">
                  {config.features.cart ? "Quick Order" : "Popular Parts"}
                </h2>
                <div className="space-y-2">
                  {WEAR_PARTS.slice(0, 4).map(sku => {
                    const part = availableInventory.find(p => p.sku === sku);
                    if (!part) return null;
                    const pricing = getPrice(part.price);
                    const isAdded = addedSku === sku;

                    return (
                      <div 
                        key={sku} 
                        className="flex items-center justify-between p-3 rounded-lg border border-neutral-100"
                      >
                        <div>
                          <div className="text-sm font-medium text-neutral-900">{part.name.split(" - ")[0]}</div>
                          <div className="text-xs text-neutral-400">${pricing.finalPrice.toFixed(2)}</div>
                        </div>
                        {config.features.cart ? (
                          <button
                            onClick={() => handleAddToCart(sku)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                              isAdded 
                                ? "bg-green-500 text-white" 
                                : "bg-neutral-100 hover:bg-neutral-200"
                            }`}
                          >
                            {isAdded ? "✓" : "Add"}
                          </button>
                        ) : (
                          <Link
                            href={`/parts/${sku}?mode=search`}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-neutral-100 hover:bg-neutral-200"
                          >
                            View
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Fleet Summary (if no fleet mode, show fleet anyway in col 3) */}
              {!config.features.fleet && (
                <div>
                  <h2 className="text-xs text-neutral-400 uppercase tracking-wider mb-6">
                    Demo Fleet
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(fleetByModel).slice(0, 4).map(([model, vehicles]) => (
                      <button
                        key={model}
                        onClick={() => {
                          const modelId = FORD_MODELS.find(m => m.name === model)?.id;
                          if (modelId) {
                            setSelectedModelId(modelId);
                            setSelectedYear(vehicles[0].year);
                            setShowVehicleSelector(false);
                          }
                        }}
                        className="w-full flex items-center justify-between p-4 rounded-xl border border-neutral-100 hover:border-neutral-300 transition-colors text-left"
                      >
                        <div>
                          <div className="font-medium text-neutral-900">{model}</div>
                          <div className="text-xs text-neutral-400">{vehicles.length} vehicles</div>
                        </div>
                        <span className="text-neutral-300">→</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* Floating Cart */}
      {config.features.cart && (
        <Link
          href="/cart"
          className="fixed bottom-8 right-8 px-6 py-3 bg-neutral-900 text-white rounded-full shadow-xl hover:bg-neutral-800 transition-colors flex items-center gap-3"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>Cart</span>
        </Link>
      )}
    </div>
  );
}

// Page wrapper with Suspense
function PartsPageContent() {
  const searchParams = useSearchParams();
  
  const modeParam = searchParams.get("mode");
  // Default to commerce mode (wear & tear)
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  
  const config = DEMO_CONFIGS[mode];
  
  return <PartsInterface mode={mode} config={config} />;
}

export default function PartsPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white" />}>
      <PartsPageContent />
    </Suspense>
  );
}
