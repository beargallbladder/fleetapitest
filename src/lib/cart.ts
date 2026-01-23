"use client";

import { Part, Dealer } from "./api";

export interface CartItem {
  part: Part;
  dealer: Dealer;
  quantity: number;
}

const CART_KEY = "ford-parts-cart";

export function getCart(): CartItem[] {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem(CART_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function addToCart(part: Part, dealer: Dealer, quantity = 1): void {
  const cart = getCart();
  const existingIndex = cart.findIndex(
    (item) =>
      item.part.partNumber === part.partNumber &&
      item.dealer.dealerId === dealer.dealerId
  );

  if (existingIndex >= 0) {
    cart[existingIndex].quantity += quantity;
  } else {
    cart.push({ part, dealer, quantity });
  }

  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  window.dispatchEvent(new Event("cart-updated"));
}

export function updateCartQuantity(
  partNumber: string,
  dealerId: string,
  quantity: number
): void {
  const cart = getCart();
  const index = cart.findIndex(
    (item) =>
      item.part.partNumber === partNumber && item.dealer.dealerId === dealerId
  );

  if (index >= 0) {
    if (quantity <= 0) {
      cart.splice(index, 1);
    } else {
      cart[index].quantity = quantity;
    }
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
  }
}

export function removeFromCart(partNumber: string, dealerId: string): void {
  updateCartQuantity(partNumber, dealerId, 0);
}

export function clearCart(): void {
  localStorage.removeItem(CART_KEY);
  window.dispatchEvent(new Event("cart-updated"));
}

export function getCartTotal(cart: CartItem[]): number {
  return cart.reduce(
    (sum, item) => sum + item.dealer.webPrice * item.quantity,
    0
  );
}

export function getCartItemCount(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
