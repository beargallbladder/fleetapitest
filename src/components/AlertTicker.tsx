"use client";

import { useEffect, useState } from "react";
import { AlertItem } from "@/lib/nhtsa";

interface AlertTickerProps {
  alerts: AlertItem[];
}

function isValidDate(dateStr: string): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
}

export default function AlertTicker({ alerts }: AlertTickerProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Rotate through items - 8 seconds per item
  useEffect(() => {
    if (alerts.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % alerts.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [alerts.length]);

  if (alerts.length === 0) return null;

  const current = alerts[currentIndex];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-neutral-100">
      <div className="max-w-6xl mx-auto px-8">
        <div className="py-4 flex items-center justify-between">
          {/* Content */}
          <div className="flex items-center gap-4">
            <div className={`w-2 h-2 rounded-full ${
              current.severity === "critical" ? "bg-red-500" : "bg-orange-400"
            }`} />
            <span className="text-xs text-neutral-400 uppercase tracking-wide">
              {current.type === "recall" ? "Recall" : "Investigation"}
            </span>
            <span className="text-sm text-neutral-900">{current.subtitle}</span>
            {current.model && (
              <span className="text-sm text-neutral-400">{current.model}</span>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-300 tabular-nums">
              {currentIndex + 1} / {alerts.length}
            </span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentIndex((prev) => (prev - 1 + alerts.length) % alerts.length)}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button 
                onClick={() => setCurrentIndex((prev) => (prev + 1) % alerts.length)}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
