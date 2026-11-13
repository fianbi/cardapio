import { describe, expect, it } from "vitest";
import {
  addToCart,
  cartCount,
  cartKey,
  cartSubtotal,
  cartToOrderItems,
  formatAddress,
  formatPrice,
  isFinished,
  setCartQuantity,
  statusSteps,
  type Cart,
} from "@cardapio/shared";

const store = { slug: "lanchonete", name: "Lanchonete" };
const burger = { productId: "p1", name: "X-Burger", unitPriceCents: 2400, quantity: 1, optionIds: ["ponto", "bacon"], optionsLabel: "Ao ponto, Bacon", notes: "" };
const soda = { productId: "p2", name: "Refrigerante", unitPriceCents: 600, quantity: 2, optionIds: [], optionsLabel: "", notes: "" };

describe("carrinho do app", () => {
  it("soma quantidade quando o item é igual (mesmas opções, em qualquer ordem)", () => {
    let cart: Cart = addToCart(null, store, burger);
    cart = addToCart(cart, store, { ...burger, optionIds: ["bacon", "ponto"], quantity: 2 });
    expect(cart.items).toHaveLength(1);
    expect(cart.items[0].quantity).toBe(3);
    expect(cartSubtotal(cart)).toBe(7200);
  });

  it("opções ou observação diferentes viram outra linha", () => {
    let cart: Cart = addToCart(null, store, burger);
    cart = addToCart(cart, store, { ...burger, optionIds: ["ponto"], unitPriceCents: 2000 });
    cart = addToCart(cart, store, { ...burger, notes: "sem cebola" });
    expect(cart.items).toHaveLength(3);
    expect(cartCount(cart)).toBe(3);
  });

  it("adicionar de outra loja troca o carrinho", () => {
    const first = addToCart(null, store, burger);
    const second = addToCart(first, { slug: "pizzaria", name: "Pizzaria" }, soda);
    expect(second.storeSlug).toBe("pizzaria");
    expect(second.items.map((i) => i.name)).toEqual(["Refrigerante"]);
  });

  it("quantidade zero remove a linha e carrinho vazio vira null", () => {
    let cart: Cart = addToCart(addToCart(null, store, burger), store, soda);
    cart = setCartQuantity(cart, cartKey("p2"), 0);
    expect(cart?.items.map((i) => i.name)).toEqual(["X-Burger"]);
    expect(setCartQuantity(cart, cart!.items[0].key, 0)).toBeNull();
    expect(cartCount(null)).toBe(0);
    expect(cartSubtotal(null)).toBe(0);
  });

  it("limita a quantidade a 99", () => {
    const cart = addToCart(addToCart(null, store, { ...soda, quantity: 98 }), store, { ...soda, quantity: 5 });
    expect(cart.items[0].quantity).toBe(99);
    expect(setCartQuantity(cart, cart.items[0].key, 500)?.items[0].quantity).toBe(99);
  });

  it("monta os itens no formato da API de pedidos", () => {
    const cart = addToCart(addToCart(null, store, { ...burger, notes: " sem cebola " }), store, soda);
    expect(cartToOrderItems(cart)).toEqual([
      { productId: "p1", quantity: 1, optionIds: ["ponto", "bacon"], notes: " sem cebola " },
      { productId: "p2", quantity: 2, optionIds: [], notes: undefined },
    ]);
  });
});

describe("textos", () => {
  it("formata preços sem depender do Intl do aparelho", () => {
    expect(formatPrice(0)).toBe("R$ 0,00");
    expect(formatPrice(5)).toBe("R$ 0,05");
    expect(formatPrice(2250)).toBe("R$ 22,50");
    expect(formatPrice(123456789)).toBe("R$ 1.234.567,89");
    expect(formatPrice(-500)).toBe("-R$ 5,00");
  });

  it("endereço e etapas do pedido", () => {
    expect(formatAddress({ street: "Rua A", number: "10", district: "Centro" })).toBe("Rua A, 10 - Centro");
    expect(statusSteps("DELIVERY")).toHaveLength(5);
    expect(isFinished("CANCELED")).toBe(true);
    expect(isFinished("PREPARING")).toBe(false);
  });
});
