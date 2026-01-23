"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getCart, clearCart, CartItem } from "@/lib/cart";
import { demoCustomer } from "@/lib/vehicles";
import { DemoMode, DEMO_CONFIGS } from "@/lib/demoMode";

function CheckoutContent() {
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const mode: DemoMode = modeParam === "search" ? "search" : "commerce";
  const config = DEMO_CONFIGS[mode];

  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [orderNumber, setOrderNumber] = useState("");

  useEffect(() => {
    setCart(getCart());
    setLoading(false);
  }, []);

  // Checkout not available in search mode
  if (!config.features.checkout) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl font-extralight text-neutral-200 mb-6">Checkout</div>
          <p className="text-neutral-500 mb-8">
            Checkout is only available in Commerce mode.
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
  const tax = subtotal * 0.0775;
  const total = subtotal + tax;

  const handlePlaceOrder = () => {
    const ordNum = `ORD-${Date.now().toString(36).toUpperCase()}`;
    setOrderNumber(ordNum);
    setOrderPlaced(true);
    clearCart();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-neutral-300 border-t-neutral-900 rounded-full animate-spin" />
      </div>
    );
  }

  // Order Confirmation
  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-8">
          <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-8">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-4xl font-extralight text-neutral-900 mb-3">Order Placed</h1>
          <p className="text-neutral-400 mb-8">
            Your order has been submitted successfully
          </p>
          <div className="bg-neutral-50 rounded-2xl p-8 mb-8">
            <div className="text-xs text-neutral-400 uppercase tracking-wide mb-2">Order Number</div>
            <div className="text-2xl font-mono text-neutral-900">{orderNumber}</div>
          </div>
          <div className="space-y-3">
            <Link
              href="/dashboard?mode=commerce"
              className="block w-full py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800"
            >
              Back to Fleet Dashboard
            </Link>
            <Link
              href="/?mode=commerce"
              className="block w-full py-4 border border-neutral-200 text-neutral-600 rounded-xl hover:border-neutral-400"
            >
              Order More Parts
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Empty cart
  if (cart.length === 0) {
    return (
      <div className="min-h-screen bg-white pt-14 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-8">
          <div className="text-6xl font-extralight text-neutral-200 mb-6">Empty</div>
          <p className="text-neutral-400 mb-8">
            Your cart is empty. Add some parts before checking out.
          </p>
          <Link
            href="/?mode=commerce"
            className="inline-block px-6 py-3 bg-neutral-900 text-white rounded-lg hover:bg-neutral-800"
          >
            Browse Parts
          </Link>
        </div>
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
        <div className="mb-8">
          <h1 className="text-3xl font-extralight text-neutral-900">Checkout</h1>
          <p className="text-neutral-400 text-sm mt-1">Review and place your order</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-12">
          {/* Order Items */}
          <div className="lg:col-span-2">
            <h2 className="text-xs text-neutral-400 uppercase tracking-wide mb-4">Order Summary</h2>
            <div className="divide-y divide-neutral-100">
              {cart.map((item, index) => (
                <div key={`${item.part.partNumber}-${index}`} className="py-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-neutral-900">{item.part.name}</div>
                    <div className="text-sm text-neutral-400">
                      {item.part.partNumber} × {item.quantity}
                    </div>
                  </div>
                  <div className="font-medium text-neutral-900">
                    ${(item.dealer.webPrice * item.quantity).toFixed(2)}
                  </div>
                </div>
              ))}
            </div>

            {/* Shipping */}
            <div className="mt-8">
              <h2 className="text-xs text-neutral-400 uppercase tracking-wide mb-4">Ship To</h2>
              <div className="p-6 bg-neutral-50 rounded-xl">
                <div className="font-medium text-neutral-900">Fleet Headquarters</div>
                <div className="text-sm text-neutral-500 mt-1">
                  123 Fleet Drive<br />
                  San Diego, CA 92101
                </div>
              </div>
            </div>
          </div>

          {/* Payment Summary */}
          <div>
            <h2 className="text-xs text-neutral-400 uppercase tracking-wide mb-4">Payment</h2>
            <div className="p-6 bg-neutral-50 rounded-xl">
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
                  <span className="text-neutral-500">Tax (7.75%)</span>
                  <span className="text-neutral-900">${tax.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-lg pt-4 border-t border-neutral-200">
                  <span className="font-medium text-neutral-900">Total</span>
                  <span className="font-medium text-neutral-900">${total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 p-4 border border-neutral-200 rounded-xl">
              <div className="text-xs text-neutral-400 mb-2">Payment Terms</div>
              <div className="font-medium text-neutral-900">Net 30</div>
              <div className="text-xs text-neutral-500 mt-1">Invoice sent upon shipment</div>
            </div>

            <button
              onClick={handlePlaceOrder}
              className="w-full mt-6 py-4 bg-neutral-900 text-white rounded-xl font-medium hover:bg-neutral-800"
            >
              Place Order
            </button>

            <Link
              href="/cart"
              className="block text-center mt-4 text-sm text-neutral-400 hover:text-neutral-900"
            >
              ← Back to cart
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white pt-14" />}>
      <CheckoutContent />
    </Suspense>
  );
}
