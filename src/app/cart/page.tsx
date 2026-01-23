"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCart, removeFromCart, updateCartQuantity, CartItem } from "@/lib/cart";
import { demoCustomer } from "@/lib/vehicles";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";

function CartContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];
  
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setCart(getCart());
    setLoading(false);

    const handleUpdate = () => setCart(getCart());
    window.addEventListener("cart-updated", handleUpdate);
    return () => window.removeEventListener("cart-updated", handleUpdate);
  }, []);

  // Cart not available in search mode
  if (!config.features.cart) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl font-extralight text-neutral-200 mb-6">Cart</div>
          <p className="text-neutral-500 mb-8">
            Shopping cart is only available in Commerce mode.
          </p>
          <Link 
            href="/?mode=commerce"
            className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Switch to Commerce Mode
          </Link>
        </div>
      </div>
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.dealer.webPrice * item.quantity, 0);
  const estimatedTax = subtotal * 0.0775;
  const total = subtotal + estimatedTax;

  const handleRemove = (partNumber: string, dealerId: string) => {
    removeFromCart(partNumber, dealerId);
  };

  const handleQuantityChange = (partNumber: string, dealerId: string, newQty: number) => {
    updateCartQuantity(partNumber, dealerId, newQty);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-14">
      {/* Customer Banner */}
      <div className="bg-neutral-900 text-white">
        <div className="max-w-3xl mx-auto px-8 py-3 flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-neutral-400">Fleet Account:</span>
            <span className="font-medium">{demoCustomer.customerId}</span>
            <span className="px-2 py-0.5 bg-amber-500 text-black text-xs font-medium rounded">
              {demoCustomer.tier.toUpperCase()}
            </span>
          </div>
          <div className="text-green-400">{demoCustomer.discountPercent}% Fleet Discount Applied</div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-8 py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-extralight text-neutral-900">Cart</h1>
            <p className="text-neutral-400 text-sm mt-1">
              {cart.length} {cart.length === 1 ? "item" : "items"}
            </p>
          </div>
          <Link 
            href="/?mode=commerce" 
            className="text-sm text-neutral-400 hover:text-neutral-900"
          >
            ← Continue shopping
          </Link>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl font-extralight text-neutral-200 mb-4">Empty</div>
            <p className="text-neutral-400 mb-8">Your cart is empty</p>
            <Link 
              href="/?mode=commerce"
              className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
            >
              Browse Parts
            </Link>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="divide-y divide-neutral-100">
              {cart.map((item, index) => (
                <div key={`${item.part.partNumber}-${item.dealer.dealerId}-${index}`} className="py-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium text-neutral-900">{item.part.name}</h3>
                      <p className="text-sm text-neutral-400 mt-1">
                        {item.part.partNumber} · {item.part.brand}
                      </p>
                      <p className="text-xs text-neutral-400 mt-2">
                        Ships from: {item.dealer.name}
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      {/* Quantity */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleQuantityChange(item.part.partNumber, item.dealer.dealerId, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50"
                        >
                          -
                        </button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <button
                          onClick={() => handleQuantityChange(item.part.partNumber, item.dealer.dealerId, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50"
                        >
                          +
                        </button>
                      </div>
                      
                      {/* Price */}
                      <div className="text-right w-24">
                        <div className="font-medium text-neutral-900">
                          ${(item.dealer.webPrice * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-xs text-neutral-400">
                          ${item.dealer.webPrice.toFixed(2)} each
                        </div>
                      </div>
                      
                      {/* Remove */}
                      <button
                        onClick={() => handleRemove(item.part.partNumber, item.dealer.dealerId)}
                        className="text-neutral-300 hover:text-red-500 transition-colors"
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="mt-8 pt-8 border-t border-neutral-200">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Subtotal</span>
                  <span className="text-neutral-900">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Fleet Discount</span>
                  <span className="text-green-600">Included</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-neutral-500">Estimated Tax</span>
                  <span className="text-neutral-900">${estimatedTax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-neutral-200">
                  <span className="font-medium text-neutral-900">Total</span>
                  <span className="font-medium text-neutral-900">${total.toFixed(2)}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full mt-8 py-4 bg-neutral-900 text-white text-center rounded-xl hover:bg-neutral-800 font-medium"
              >
                Proceed to Checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pt-14" />}>
      <CartContent />
    </Suspense>
  );
}
