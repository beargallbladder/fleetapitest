"use client";

import { useState, useEffect, useRef } from "react";
import { fleetVehicles } from "@/lib/fleet";
import { realInventory } from "@/lib/inventory";
import { addToCart } from "@/lib/cart";
import { demoCustomer, calculateEntitlementPrice } from "@/lib/vehicles";

interface WearPrediction {
  vehicleId: string;
  vehicleName: string;
  partSku: string;
  partName: string;
  urgency: "critical" | "due" | "upcoming";
  reason: string;
  dueIn: string;
  price: number;
  confidence: number;
}

interface AgentMessage {
  id: string;
  type: "thinking" | "recommendation" | "action" | "summary";
  content: string;
  timestamp: Date;
  predictions?: WearPrediction[];
}

// Wear thresholds based on mileage/time
const WEAR_RULES = [
  { part: "XO-5W30-Q1SP", name: "Engine Oil", interval: 7500, category: "fluids" },
  { part: "FL-500S", name: "Oil Filter", interval: 7500, category: "filters" },
  { part: "FA-1900", name: "Air Filter", interval: 30000, category: "filters" },
  { part: "FP-88", name: "Cabin Air Filter", interval: 20000, category: "filters" },
  { part: "BRF-1478", name: "Front Brake Pads", interval: 50000, category: "brakes" },
  { part: "BRF-1934", name: "Rear Brake Pads", interval: 60000, category: "brakes" },
  { part: "VC-13DL-G", name: "Coolant", interval: 100000, category: "fluids" },
  { part: "PM-20", name: "Brake Fluid", interval: 45000, category: "fluids" },
  { part: "SP-589", name: "Spark Plugs", interval: 60000, category: "electrical" },
];

export function FleetAgent() {
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [predictions, setPredictions] = useState<WearPrediction[]>([]);
  const [addedSkus, setAddedSkus] = useState<Set<string>>(new Set());
  const [totalSavings, setTotalSavings] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Analyze fleet on mount
  useEffect(() => {
    analyzeFleet();
  }, []);

  const addMessage = (type: AgentMessage["type"], content: string, preds?: WearPrediction[]) => {
    const msg: AgentMessage = {
      id: Date.now().toString(),
      type,
      content,
      timestamp: new Date(),
      predictions: preds,
    };
    setMessages(prev => [...prev, msg]);
    return msg;
  };

  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  const analyzeFleet = async () => {
    setIsAnalyzing(true);
    setMessages([]);
    setPredictions([]);

    // Thinking...
    addMessage("thinking", "Scanning fleet of " + fleetVehicles.length + " vehicles...");
    await delay(800);

    addMessage("thinking", "Analyzing mileage intervals and service history...");
    await delay(600);

    addMessage("thinking", "Cross-referencing with wear schedules and inventory...");
    await delay(700);

    // Generate predictions
    const allPredictions: WearPrediction[] = [];

    for (const vehicle of fleetVehicles) {
      for (const rule of WEAR_RULES) {
        const milesSinceService = vehicle.odometer % rule.interval;
        const milesUntilDue = rule.interval - milesSinceService;
        const percentUsed = milesSinceService / rule.interval;

        let urgency: WearPrediction["urgency"] | null = null;
        let reason = "";
        let dueIn = "";

        if (percentUsed >= 0.95) {
          urgency = "critical";
          reason = `${Math.round(milesSinceService).toLocaleString()} miles since last service`;
          dueIn = "NOW";
        } else if (percentUsed >= 0.85) {
          urgency = "due";
          reason = `${milesUntilDue.toLocaleString()} miles remaining`;
          dueIn = `${Math.round(milesUntilDue / 500) * 500} mi`;
        } else if (percentUsed >= 0.7) {
          urgency = "upcoming";
          reason = `${Math.round(percentUsed * 100)}% of interval used`;
          dueIn = `~${Math.round(milesUntilDue / 1000)}k mi`;
        }

        if (urgency) {
          const part = realInventory.find(p => p.sku === rule.part);
          if (part) {
            allPredictions.push({
              vehicleId: vehicle.vin,
              vehicleName: `${vehicle.year} ${vehicle.model}`,
              partSku: rule.part,
              partName: rule.name,
              urgency,
              reason,
              dueIn,
              price: part.price,
              confidence: 0.85 + Math.random() * 0.12,
            });
          }
        }
      }
    }

    // Sort by urgency
    allPredictions.sort((a, b) => {
      const order = { critical: 0, due: 1, upcoming: 2 };
      return order[a.urgency] - order[b.urgency];
    });

    setPredictions(allPredictions);

    // Group by urgency for summary
    const critical = allPredictions.filter(p => p.urgency === "critical");
    const due = allPredictions.filter(p => p.urgency === "due");
    const upcoming = allPredictions.filter(p => p.urgency === "upcoming");

    await delay(500);

    if (critical.length > 0) {
      addMessage("recommendation", 
        `⚠️ Found ${critical.length} CRITICAL items requiring immediate attention`,
        critical
      );
      await delay(400);
    }

    if (due.length > 0) {
      addMessage("recommendation",
        `📋 ${due.length} items due within next service interval`,
        due.slice(0, 5)
      );
      await delay(400);
    }

    if (upcoming.length > 0) {
      addMessage("recommendation",
        `📅 ${upcoming.length} items coming up (plan ahead)`,
        upcoming.slice(0, 3)
      );
    }

    // Calculate potential order
    const criticalTotal = critical.reduce((sum, p) => sum + p.price, 0);
    const dueTotal = due.reduce((sum, p) => sum + p.price, 0);
    const discountedTotal = (criticalTotal + dueTotal) * (1 - demoCustomer.discountPercent / 100);
    const savings = (criticalTotal + dueTotal) - discountedTotal;
    setTotalSavings(savings);

    await delay(600);

    addMessage("summary", 
      `Fleet analysis complete. Recommended order: $${discountedTotal.toFixed(2)} (saving $${savings.toFixed(2)} with fleet discount)`
    );

    setIsAnalyzing(false);
  };

  const handleAddToCart = (prediction: WearPrediction) => {
    const part = realInventory.find(p => p.sku === prediction.partSku);
    if (!part) return;

    const pricing = calculateEntitlementPrice(part.price, demoCustomer);
    
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

    setAddedSkus(prev => new Set([...prev, `${prediction.vehicleId}-${prediction.partSku}`]));
    
    addMessage("action", `Added ${prediction.partName} for ${prediction.vehicleName} to cart`);
  };

  const handleAddAllCritical = () => {
    const critical = predictions.filter(p => p.urgency === "critical");
    critical.forEach(p => handleAddToCart(p));
    addMessage("action", `Added all ${critical.length} critical items to cart`);
  };

  const getUrgencyStyle = (urgency: WearPrediction["urgency"]) => {
    switch (urgency) {
      case "critical":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      case "due":
        return "bg-amber-500/20 text-amber-400 border-amber-500/30";
      case "upcoming":
        return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="bg-neutral-900 rounded-xl md:rounded-2xl overflow-hidden border border-neutral-800">
      {/* Header */}
      <div className="px-4 md:px-6 py-3 md:py-4 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative">
            <div className={`w-2.5 md:w-3 h-2.5 md:h-3 rounded-full ${isAnalyzing ? "bg-amber-400" : "bg-green-400"}`} />
            {isAnalyzing && (
              <div className="absolute inset-0 w-2.5 md:w-3 h-2.5 md:h-3 rounded-full bg-amber-400 animate-ping" />
            )}
          </div>
          <div>
            <h3 className="text-white font-medium text-sm md:text-base">Fleet Agent</h3>
            <p className="text-[10px] md:text-xs text-neutral-500 hidden sm:block">AI maintenance orchestrator</p>
          </div>
        </div>
        <button
          onClick={analyzeFleet}
          disabled={isAnalyzing}
          className="px-3 md:px-4 py-1.5 md:py-2 text-[10px] md:text-xs font-medium rounded-lg bg-neutral-800 text-neutral-300 hover:bg-neutral-700 disabled:opacity-50 transition-colors active:scale-95"
        >
          {isAnalyzing ? "..." : "Re-scan"}
        </button>
      </div>

      {/* Messages */}
      <div className="h-64 md:h-80 overflow-y-auto p-3 md:p-4 space-y-2 md:space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className="animate-fadeIn">
            {msg.type === "thinking" && (
              <div className="flex items-center gap-2 text-sm text-neutral-500">
                <div className="w-1.5 h-1.5 rounded-full bg-neutral-500 animate-pulse" />
                {msg.content}
              </div>
            )}
            
            {msg.type === "recommendation" && (
              <div className="bg-neutral-800/50 rounded-lg md:rounded-xl p-3 md:p-4">
                <div className="text-xs md:text-sm text-white mb-2 md:mb-3">{msg.content}</div>
                {msg.predictions && (
                  <div className="space-y-2">
                    {msg.predictions.map((pred, i) => {
                      const isAdded = addedSkus.has(`${pred.vehicleId}-${pred.partSku}`);
                      return (
                        <div 
                          key={i}
                          className="flex items-center justify-between p-2 md:p-3 rounded-lg bg-neutral-900/50 border border-neutral-700/50 gap-2"
                        >
                          <div className="flex items-center gap-2 md:gap-3 min-w-0 flex-1">
                            <span className={`px-1.5 md:px-2 py-0.5 text-[9px] md:text-[10px] font-medium rounded border flex-shrink-0 ${getUrgencyStyle(pred.urgency)}`}>
                              {pred.dueIn}
                            </span>
                            <div className="min-w-0">
                              <div className="text-xs md:text-sm text-white truncate">{pred.partName}</div>
                              <div className="text-[10px] md:text-xs text-neutral-500 truncate">
                                {pred.vehicleName}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
                            <span className="text-xs md:text-sm text-neutral-400 hidden sm:inline">
                              ${(pred.price * (1 - demoCustomer.discountPercent / 100)).toFixed(2)}
                            </span>
                            <button
                              onClick={() => handleAddToCart(pred)}
                              disabled={isAdded}
                              className={`px-2 md:px-3 py-1 md:py-1.5 text-[10px] md:text-xs font-medium rounded-lg transition-all active:scale-95 ${
                                isAdded
                                  ? "bg-green-500/20 text-green-400"
                                  : "bg-white text-black hover:bg-neutral-200"
                              }`}
                            >
                              {isAdded ? "✓" : "Add"}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {msg.type === "action" && (
              <div className="flex items-center gap-2 text-sm text-green-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {msg.content}
              </div>
            )}

            {msg.type === "summary" && (
              <div className="bg-gradient-to-r from-green-900/30 to-emerald-900/30 border border-green-500/30 rounded-xl p-4">
                <div className="text-sm text-green-400">{msg.content}</div>
              </div>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Actions */}
      {predictions.filter(p => p.urgency === "critical").length > 0 && !isAnalyzing && (
        <div className="px-3 md:px-4 py-2 md:py-3 border-t border-neutral-800 bg-neutral-800/50">
          <button
            onClick={handleAddAllCritical}
            className="w-full py-2.5 md:py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg md:rounded-xl transition-colors flex items-center justify-center gap-2 active:scale-[0.98] text-sm md:text-base"
          >
            <span>Add All Critical</span>
            <span className="px-1.5 md:px-2 py-0.5 bg-white/20 rounded text-[10px] md:text-xs">
              {predictions.filter(p => p.urgency === "critical").length}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
