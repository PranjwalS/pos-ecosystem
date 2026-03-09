import { useState, useEffect } from "react";

export function useCart(bizSlug) {
  const key = `cart_${bizSlug}`;

  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(cart));
    } catch { /* empty */ }
  }, [cart, key]);

  const addToCart = (product, qty = 1) => {
    setCart(prev => {
      const existing = prev[product.id];
      return {
        ...prev,
        [product.id]: {
          id: product.id,
          title: product.title,
          price: product.price,
          image_url: product.image_url,
          inventory: product.inventory,
          quantity: Math.min((existing?.quantity ?? 0) + qty, product.inventory),
        },
      };
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => {
      const next = { ...prev };
      delete next[productId];
      return next;
    });
  };

  const setQuantity = (product, qty) => {
    if (qty <= 0) { removeFromCart(product.id); return; }
    setCart(prev => ({
      ...prev,
      [product.id]: {
        ...prev[product.id],
        id: product.id,
        title: product.title,
        price: product.price,
        image_url: product.image_url,
        inventory: product.inventory,
        quantity: Math.min(qty, product.inventory),
      },
    }));
  };

  const clearCart = () => {
    setCart({});
    try { localStorage.removeItem(key); } catch { /* empty */ }
  };

  const totalItems = Object.values(cart).reduce((s, i) => s + i.quantity, 0);
  const totalPrice = Object.values(cart).reduce((s, i) => s + i.price * i.quantity, 0);
  const cartList   = Object.values(cart);

  return { cart, addToCart, removeFromCart, setQuantity, clearCart, totalItems, totalPrice, cartList };
}