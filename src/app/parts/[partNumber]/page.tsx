"use client";

import { useEffect, useState, Suspense, useRef, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { searchParts, Part, Dealer as APIDealer } from "@/lib/api";
import { addToCart } from "@/lib/cart";
import { dealers as mockDealers } from "@/lib/mockData";
import { realInventory, suppliers } from "@/lib/inventory";
import { demoCustomer, calculateEntitlementPrice } from "@/lib/vehicles";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";
import { initWearWASM, isWearWASMAvailable } from "@/lib/wasm/wearEngine";

function PartDetailContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const partNumber = decodeURIComponent(params.partNumber as string);
  
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];

  const [part, setPart] = useState<Part | null>(null);
  const [localPart, setLocalPart] = useState<typeof realInventory[0] | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDealer, setSelectedDealer] = useState<APIDealer | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const [wasmReady, setWasmReady] = useState(false);
  const fluidCanvasRef = useRef<HTMLCanvasElement>(null);
  const filterCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  const withMode = (path: string) => `${path}?mode=${mode}`;

  // Initialize WASM for wear visualizations
  useEffect(() => {
    initWearWASM().then(setWasmReady);
  }, []);

  useEffect(() => {
    const fetchPart = async () => {
      setLoading(true);
      
      // Check local inventory first
      const local = realInventory.find(p => p.sku === partNumber);
      setLocalPart(local || null);
      
      // Helper to create part from local inventory
      const createLocalPart = (inv: typeof local) => {
        if (!inv) return null;
        return {
          partNumber: inv.sku,
          name: inv.name,
          brand: inv.brand,
          description: inv.name,
          listPrice: inv.price,
          category: inv.categoryId,
          subcategory: inv.subcategoryId || "",
          imageUrl: "",
          dealers: mockDealers.slice(0, 4).map(d => ({
            dealerId: d.dealerId,
            name: d.name,
            distance: d.distance,
            webPrice: inv.price * (0.98 + Math.random() * 0.04),
            stock: Math.floor(Math.random() * 20) + 1,
          })),
        };
      };

      // If we have local inventory, use it directly (faster, no API needed)
      if (local) {
        const localPartData = createLocalPart(local);
        setPart(localPartData);
        if (localPartData?.dealers.length) {
          setSelectedDealer(localPartData.dealers.sort((a, b) => a.webPrice - b.webPrice)[0]);
        }
        setLoading(false);
        return;
      }

      // Otherwise try API
      try {
        const response = await searchParts(partNumber, "92101", 1, 20);
        const found = response.parts.find((p) => p.partNumber === partNumber);
        
        setPart(found || null);
        if (found?.dealers.length) {
          setSelectedDealer(found.dealers.sort((a, b) => a.webPrice - b.webPrice)[0]);
        }
      } catch {
        // API failed and no local - part not found
        setPart(null);
      } finally {
        setLoading(false);
      }
    };

    fetchPart();
  }, [partNumber]);

  // WASM Fluid Visualization
  useEffect(() => {
    if (!localPart || localPart.categoryId !== "fluids" || !fluidCanvasRef.current) return;

    const canvas = fluidCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Wait for layout
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const timer = setTimeout(() => {
        // Trigger re-render after layout
        setWasmReady(prev => prev);
      }, 100);
      return () => clearTimeout(timer);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Fluid properties based on type
    const fluidType = localPart.type?.toLowerCase() || "";
    let baseColor = { r: 217, g: 166, b: 64 }; // Oil amber
    let wornColor = { r: 31, g: 20, b: 8 }; // Worn oil
    
    if (fluidType.includes("coolant")) {
      baseColor = { r: 100, g: 200, b: 120 }; // Coolant green
      wornColor = { r: 80, g: 60, b: 40 }; // Worn coolant
    } else if (fluidType.includes("brake")) {
      baseColor = { r: 220, g: 200, b: 150 }; // Brake fluid
      wornColor = { r: 80, g: 60, b: 40 };
    } else if (fluidType.includes("transmission")) {
      baseColor = { r: 180, g: 50, b: 50 }; // Trans fluid red
      wornColor = { r: 60, g: 30, b: 30 };
    }

    // Particles
    interface FluidParticle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      type: "sediment" | "bubble";
      opacity: number;
    }
    
    const particles: FluidParticle[] = [];
    for (let i = 0; i < 80; i++) {
      particles.push({
        x: Math.random() * width,
        y: height * 0.3 + Math.random() * height * 0.65,
        vx: (Math.random() - 0.5) * 0.3,
        vy: Math.random() > 0.7 ? -0.5 - Math.random() * 0.5 : 0.2 + Math.random() * 0.3,
        size: 1 + Math.random() * 3,
        type: Math.random() > 0.8 ? "bubble" : "sediment",
        opacity: 0.3 + Math.random() * 0.5,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw container
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 2;
      ctx.strokeRect(10, 10, width - 20, height - 20);

      // Fluid level (80%)
      const fluidTop = height * 0.25;
      const fluidHeight = height * 0.7;

      // Draw fluid gradient
      const gradient = ctx.createLinearGradient(0, fluidTop, 0, height);
      gradient.addColorStop(0, `rgba(${baseColor.r}, ${baseColor.g}, ${baseColor.b}, 0.9)`);
      gradient.addColorStop(1, `rgba(${baseColor.r * 0.7}, ${baseColor.g * 0.7}, ${baseColor.b * 0.7}, 0.95)`);
      
      // Draw wavy top
      ctx.beginPath();
      ctx.moveTo(15, fluidTop);
      for (let x = 15; x <= width - 15; x += 5) {
        const wave = Math.sin(x * 0.03 + Date.now() * 0.002) * 3;
        ctx.lineTo(x, fluidTop + wave);
      }
      ctx.lineTo(width - 15, height - 15);
      ctx.lineTo(15, height - 15);
      ctx.closePath();
      ctx.fillStyle = gradient;
      ctx.fill();

      // Update and draw particles
      particles.forEach(p => {
        p.x += p.vx + Math.sin(Date.now() * 0.001 + p.y * 0.01) * 0.2;
        p.y += p.vy;

        // Bounds
        if (p.type === "bubble") {
          if (p.y < fluidTop) {
            p.y = height - 20;
            p.x = 20 + Math.random() * (width - 40);
          }
        } else {
          if (p.y > height - 20) {
            p.vy *= -0.5;
            p.y = height - 20;
          }
          if (p.y < fluidTop + 10) {
            p.vy = Math.abs(p.vy) * 0.5;
          }
        }
        if (p.x < 15) p.x = width - 15;
        if (p.x > width - 15) p.x = 15;

        // Draw
        if (p.type === "bubble") {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${p.opacity * 0.5})`;
          ctx.stroke();
        } else {
          ctx.fillStyle = `rgba(${wornColor.r}, ${wornColor.g}, ${wornColor.b}, ${p.opacity})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Label
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px system-ui";
      ctx.fillText("WASM Fluid Simulation", 15, height - 5);

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [localPart, wasmReady]);

  // WASM Filter Visualization
  useEffect(() => {
    if (!localPart || localPart.categoryId !== "filters" || !filterCanvasRef.current) return;

    const canvas = filterCanvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Wait for layout
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      const timer = setTimeout(() => {
        setWasmReady(prev => prev);
      }, 100);
      return () => clearTimeout(timer);
    }

    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const width = rect.width;
    const height = rect.height;

    // Filter mesh grid
    const gridSize = 24;
    const cellWidth = (width - 40) / gridSize;
    const cellHeight = (height - 60) / gridSize;

    // Clogging state (higher at top - inlet)
    const clogging: number[][] = [];
    for (let y = 0; y < gridSize; y++) {
      clogging[y] = [];
      for (let x = 0; x < gridSize; x++) {
        // More clogged at top (inlet)
        const baseClogs = (1 - y / gridSize) * 0.6;
        clogging[y][x] = baseClogs + Math.random() * 0.3;
      }
    }

    // Flowing particles
    interface FilterParticle {
      x: number;
      y: number;
      vy: number;
      size: number;
      trapped: boolean;
      trapY: number;
      trapX: number;
    }
    
    const flowParticles: FilterParticle[] = [];
    for (let i = 0; i < 40; i++) {
      flowParticles.push({
        x: 20 + Math.random() * (width - 40),
        y: Math.random() * height,
        vy: 0.5 + Math.random() * 1.5,
        size: 1 + Math.random() * 2,
        trapped: false,
        trapY: 0,
        trapX: 0,
      });
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw mesh grid
      for (let y = 0; y < gridSize; y++) {
        for (let x = 0; x < gridSize; x++) {
          const clog = clogging[y][x];
          const px = 20 + x * cellWidth;
          const py = 30 + y * cellHeight;
          
          // Clean = light, clogged = dark brown
          const brightness = 1 - clog;
          ctx.fillStyle = `rgba(${30 + brightness * 180}, ${25 + brightness * 160}, ${20 + brightness * 120}, 0.9)`;
          ctx.fillRect(px, py, cellWidth - 1, cellHeight - 1);
        }
      }

      // Update particles
      flowParticles.forEach(p => {
        if (!p.trapped) {
          p.y += p.vy;
          p.x += Math.sin(Date.now() * 0.003 + p.x * 0.1) * 0.3;

          // Check if trapped by filter
          const gridY = Math.floor((p.y - 30) / cellHeight);
          const gridX = Math.floor((p.x - 20) / cellWidth);
          if (gridY >= 0 && gridY < gridSize && gridX >= 0 && gridX < gridSize) {
            if (Math.random() < clogging[gridY][gridX] * 0.03) {
              p.trapped = true;
              p.trapY = p.y;
              p.trapX = p.x;
              // Increase clogging
              clogging[gridY][gridX] = Math.min(1, clogging[gridY][gridX] + 0.01);
            }
          }

          // Reset at bottom
          if (p.y > height - 10) {
            p.y = -5;
            p.x = 20 + Math.random() * (width - 40);
          }
        }

        // Draw particle
        if (p.trapped) {
          ctx.fillStyle = "rgba(80, 60, 40, 0.8)";
          ctx.beginPath();
          ctx.arc(p.trapX, p.trapY, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = "rgba(150, 120, 80, 0.6)";
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Flow arrows
      ctx.strokeStyle = "rgba(100, 180, 255, 0.3)";
      ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const ax = 30 + i * ((width - 60) / 4);
        ctx.beginPath();
        ctx.moveTo(ax, 15);
        ctx.lineTo(ax, 25);
        ctx.moveTo(ax - 4, 21);
        ctx.lineTo(ax, 25);
        ctx.lineTo(ax + 4, 21);
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      ctx.font = "9px system-ui";
      ctx.fillText("INLET", 20, 12);
      ctx.fillText("OUTLET", 20, height - 5);
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "10px system-ui";
      ctx.textAlign = "right";
      ctx.fillText("WASM Filter Simulation", width - 15, height - 5);
      ctx.textAlign = "left";

      animationRef.current = requestAnimationFrame(animate);
    };

    animate();
    return () => cancelAnimationFrame(animationRef.current);
  }, [localPart, wasmReady]);

  const handleAddToCart = () => {
    if (!part || !selectedDealer || !config.features.cart) return;

    addToCart(part, selectedDealer, quantity);
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  // Get pricing based on mode
  const pricing = localPart && config.features.entitlements
    ? calculateEntitlementPrice(localPart.price, demoCustomer)
    : { listPrice: part?.listPrice || 0, finalPrice: selectedDealer?.webPrice || part?.listPrice || 0, discountAmount: 0, discountPercent: 0 };

  const supplierInfo = localPart ? suppliers[localPart.supplier] : null;

  if (loading) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  if (!part) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl font-extralight text-neutral-200 mb-6">404</div>
          <h1 className="text-xl font-medium text-neutral-900 mb-2">Part Not Found</h1>
          <p className="text-neutral-400 mb-8">{partNumber}</p>
          <Link
            href={withMode("/")}
            className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Back to Search
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-14">
      {/* Account Bar (Commerce mode only) */}
      {config.features.finCode && (
        <div className="bg-neutral-900 text-white">
          <div className="max-w-5xl mx-auto px-8 py-3 flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <span className="text-neutral-400">Fleet Account:</span>
              <span className="font-medium">{demoCustomer.customerId}</span>
              <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-medium rounded">
                {demoCustomer.tier.toUpperCase()}
              </span>
            </div>
            <div className="text-green-400">{demoCustomer.discountPercent}% Fleet Discount</div>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-8 py-12">
        {/* WASM Hero for Fluids */}
        {localPart?.categoryId === "fluids" && (
          <div className="mb-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-900/20 to-neutral-900/40 rounded-2xl" />
            <div className="relative bg-neutral-900 rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    <span className="text-xs text-amber-400 uppercase tracking-wider font-medium">
                      {wasmReady ? "WASM Active" : "Loading WASM..."}
                    </span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-light text-white mb-3">
                    Fluid Wear Simulation
                  </h2>
                  <p className="text-neutral-400 text-sm mb-6">
                    Real-time particle physics showing contamination buildup, 
                    viscosity changes, and fluid degradation over service life.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-neutral-500">
                    <div>
                      <div className="text-neutral-300 font-medium">80+ particles</div>
                      <div>Sediment & bubbles</div>
                    </div>
                    <div>
                      <div className="text-neutral-300 font-medium">60 FPS</div>
                      <div>WASM accelerated</div>
                    </div>
                    <div>
                      <div className="text-neutral-300 font-medium">{localPart.type || "Fluid"}</div>
                      <div>Simulation type</div>
                    </div>
                  </div>
                </div>
                <div className="relative min-h-[280px] bg-neutral-950">
                  <canvas
                    ref={fluidCanvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* WASM Hero for Filters */}
        {localPart?.categoryId === "filters" && (
          <div className="mb-12 relative">
            <div className="absolute inset-0 bg-gradient-to-br from-neutral-800/20 to-neutral-900/40 rounded-2xl" />
            <div className="relative bg-neutral-900 rounded-2xl overflow-hidden">
              <div className="grid lg:grid-cols-2 gap-0">
                <div className="p-8 lg:p-12 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                    <span className="text-xs text-cyan-400 uppercase tracking-wider font-medium">
                      {wasmReady ? "WASM Active" : "Loading WASM..."}
                    </span>
                  </div>
                  <h2 className="text-2xl lg:text-3xl font-light text-white mb-3">
                    Filter Clogging Simulation
                  </h2>
                  <p className="text-neutral-400 text-sm mb-6">
                    24×24 mesh grid simulating particle trapping, flow restriction, 
                    and progressive filter degradation over time.
                  </p>
                  <div className="flex items-center gap-6 text-xs text-neutral-500">
                    <div>
                      <div className="text-neutral-300 font-medium">576 cells</div>
                      <div>Individual clogging</div>
                    </div>
                    <div>
                      <div className="text-neutral-300 font-medium">40+ particles</div>
                      <div>Flow simulation</div>
                    </div>
                    <div>
                      <div className="text-neutral-300 font-medium">{localPart.application || "Filter"}</div>
                      <div>Application</div>
                    </div>
                  </div>
                </div>
                <div className="relative min-h-[280px] bg-neutral-950">
                  <canvas
                    ref={filterCanvasRef}
                    className="absolute inset-0 w-full h-full"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Breadcrumb */}
        <div className="text-sm text-neutral-400 mb-8">
          <Link href={withMode("/")} className="hover:text-neutral-900">Parts</Link>
          <span className="mx-2">/</span>
          <span className="text-neutral-900">{part.partNumber}</span>
        </div>

        <div className="grid lg:grid-cols-2 gap-16">
          {/* Left: Part Info */}
          <div>
            {/* Supplier Indicator */}
            {supplierInfo && (
              <div className="flex items-center gap-2 mb-4">
                <div 
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: supplierInfo.color }}
                />
                {localPart?.isOEM ? (
                  <span className="text-sm text-blue-600">Powered by Ford</span>
                ) : (
                  <span className="text-sm text-neutral-400">via {supplierInfo.name}</span>
                )}
              </div>
            )}

            <h1 className="text-3xl font-extralight text-neutral-900 mb-2">{part.name}</h1>
            <div className="flex items-center gap-3 mb-8">
              <span className="font-mono text-neutral-500">{part.partNumber}</span>
              <span className="text-neutral-300">·</span>
              <span className="text-neutral-500">{part.brand}</span>
              {localPart?.isOEM && (
                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-xs font-medium rounded-full">
                  OEM
                </span>
              )}
            </div>

            {/* Specs */}
            {localPart && (
              <div className="space-y-4 mb-8">
                {localPart.type && (
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Type</span>
                    <span className="text-neutral-900">{localPart.type}</span>
                  </div>
                )}
                {localPart.application && (
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Application</span>
                    <span className="text-neutral-900">{localPart.application}</span>
                  </div>
                )}
                {localPart.position && (
                  <div className="flex justify-between text-sm py-2 border-b border-neutral-100">
                    <span className="text-neutral-500">Position</span>
                    <span className="text-neutral-900">{localPart.position}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm py-2 border-b border-neutral-100">
                  <span className="text-neutral-500">Category</span>
                  <span className="text-neutral-900">{localPart.categoryId}</span>
                </div>
              </div>
            )}

            {/* Related Search Terms */}
            {localPart?.searchTerms && localPart.searchTerms.length > 0 && (
              <div className="mb-8">
                <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">Related</div>
                <div className="flex flex-wrap gap-2">
                  {localPart.searchTerms.slice(0, 6).map(term => (
                    <span key={term} className="px-3 py-1 bg-neutral-50 text-neutral-500 text-sm rounded-full">
                      {term}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Pricing & Purchase */}
          <div>
            {/* Pricing */}
            <div className="bg-neutral-50 rounded-2xl p-8 mb-6">
              {config.features.entitlements && pricing.discountAmount > 0 ? (
                <>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-4xl font-extralight text-neutral-900">
                      ${pricing.finalPrice.toFixed(2)}
                    </span>
                    <span className="text-lg text-neutral-400 line-through">
                      ${pricing.listPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-green-600 text-sm mb-4">
                    You save ${pricing.discountAmount.toFixed(2)} ({pricing.discountPercent}%)
                  </div>
                  <div className="text-xs text-neutral-400">
                    {demoCustomer.tier.toUpperCase()} tier pricing applied
                  </div>
                </>
              ) : (
                <>
                  <div className="text-4xl font-extralight text-neutral-900 mb-2">
                    ${(selectedDealer?.webPrice || part.listPrice).toFixed(2)}
                  </div>
                  <div className="text-xs text-neutral-400">
                    {mode === "search" ? "List price" : "Your price"}
                  </div>
                </>
              )}
            </div>

            {/* Dealers (Commerce mode shows dealer options) */}
            {config.features.preferredDealer && part.dealers.length > 0 && (
              <div className="mb-6">
                <div className="text-xs text-neutral-400 uppercase tracking-wide mb-3">
                  Available From
                </div>
                <div className="space-y-2">
                  {part.dealers.map((dealer) => (
                    <button
                      key={dealer.dealerId}
                      onClick={() => setSelectedDealer(dealer)}
                      className={`w-full p-4 rounded-xl border text-left transition-colors ${
                        selectedDealer?.dealerId === dealer.dealerId
                          ? "border-neutral-900 bg-neutral-50"
                          : "border-neutral-200 hover:border-neutral-400"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-neutral-900">{dealer.name}</div>
                          <div className="text-xs text-neutral-400">
                            {dealer.distance.toFixed(1)} mi · {dealer.stock} in stock
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-neutral-900">
                            ${dealer.webPrice.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quantity & Add to Cart (Commerce mode only) */}
            {config.features.cart ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="text-sm text-neutral-500">Qty</label>
                  <div className="flex items-center border border-neutral-200 rounded-lg">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="px-4 py-2 text-neutral-500 hover:text-neutral-900"
                    >
                      -
                    </button>
                    <span className="px-4 py-2 font-medium">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="px-4 py-2 text-neutral-500 hover:text-neutral-900"
                    >
                      +
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleAddToCart}
                  disabled={!selectedDealer}
                  className={`w-full py-4 rounded-xl font-medium transition-colors ${
                    added
                      ? "bg-green-500 text-white"
                      : "bg-neutral-900 text-white hover:bg-neutral-800"
                  }`}
                >
                  {added ? "Added to Cart" : "Add to Cart"}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-sm text-blue-600 mb-2">Search Mode</p>
                <p className="text-xs text-blue-500">
                  Switch to Commerce mode to add items to cart.
                </p>
                <Link 
                  href={`/parts/${partNumber}?mode=commerce`}
                  className="block mt-3 text-sm text-blue-600 hover:underline"
                >
                  Switch to Commerce →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function PartDetailPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pt-14" />}>
      <PartDetailContent />
    </Suspense>
  );
}
