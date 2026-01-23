"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { getCart, getCartItemCount } from "@/lib/cart";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";

function HeaderContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [cartCount, setCartCount] = useState(0);

  // Get current demo mode - default to commerce
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];

  // Always call hooks unconditionally
  useEffect(() => {
    if (!config.features.cart) return;
    const updateCount = () => setCartCount(getCartItemCount(getCart()));
    updateCount();
    window.addEventListener("cart-updated", updateCount);
    return () => window.removeEventListener("cart-updated", updateCount);
  }, [config.features.cart]);

  const isActive = (path: string) => pathname === path;

  // Preserve mode in links
  const withMode = (path: string) => `${path}?mode=${mode}`;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-neutral-100">
      <nav className="max-w-6xl mx-auto px-8 h-14 flex items-center justify-between">
        
        {/* Logo */}
        <Link 
          href={withMode("/")} 
          className="flex items-center gap-3"
        >
          <span className="text-sm font-medium text-neutral-900">
            {mode === "search" ? "Ford Parts API" : "Fleet Wear & Tear"}
          </span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
            mode === "search" 
              ? "bg-neutral-100 text-neutral-500" 
              : "bg-neutral-900 text-white"
          }`}>
            {mode === "search" ? "SEARCH" : "COMMERCE"}
          </span>
        </Link>

        {/* Nav */}
        <div className="flex items-center gap-8">
          <Link
            href={withMode("/")}
            className={`text-sm transition-colors ${
              isActive("/") 
                ? "text-neutral-900 font-medium" 
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            {mode === "search" ? "Search" : "Parts"}
          </Link>
          
          {config.features.fleet && (
            <>
              <Link
                href={withMode("/dashboard")}
                className={`text-sm transition-colors ${
                  isActive("/dashboard") 
                    ? "text-neutral-900 font-medium" 
                    : "text-neutral-400 hover:text-neutral-900"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href={withMode("/fleet")}
                className={`text-sm transition-colors ${
                  isActive("/fleet") 
                    ? "text-neutral-900 font-medium" 
                    : "text-neutral-400 hover:text-neutral-900"
                }`}
              >
                Risk Analysis
              </Link>
            </>
          )}
          
          <Link
            href={withMode("/api-explorer")}
            className={`text-sm transition-colors ${
              isActive("/api-explorer") 
                ? "text-neutral-900 font-medium" 
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            API
          </Link>
          
          <Link
            href={withMode("/docs")}
            className={`text-sm transition-colors ${
              isActive("/docs") 
                ? "text-neutral-900 font-medium" 
                : "text-neutral-400 hover:text-neutral-900"
            }`}
          >
            Docs
          </Link>
        </div>

        {/* Right */}
        <div className="flex items-center gap-6">
          {/* Mode indicator */}
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${
              mode === "commerce" ? "bg-green-500" : "bg-blue-500"
            }`} />
            <span className="text-xs text-neutral-400">
              {mode === "search" ? "Read-only" : "Live"}
            </span>
          </div>
          
          {/* Cart (commerce only) */}
          {config.features.cart && (
            <Link 
              href="/cart" 
              className="relative flex items-center gap-2 text-sm text-neutral-400 hover:text-neutral-900 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 left-3 w-4 h-4 bg-neutral-900 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </Link>
          )}
          
          {/* Mode switcher */}
          <Link
            href={mode === "search" ? "/?mode=commerce" : "/?mode=search"}
            className="text-xs text-neutral-400 hover:text-neutral-900 transition-colors"
          >
            Switch mode
          </Link>
        </div>
      </nav>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={null}>
      <HeaderContent />
    </Suspense>
  );
}
