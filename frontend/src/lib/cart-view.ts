// Normaliza a resposta da API do carrinho em um formato único para a tela e o cabeçalho.
export type CartItem = {
  cartItemId: number;
  variantId: number;
  productName: string;
  variantName: string;
  restaurantId?: number;
  restaurantName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};
export type CartGroup = { restaurantId?: number; restaurantName: string; items: CartItem[] };
function recordOf(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
}
function num(data: unknown, fallback = 0) { const value = Number(data); return Number.isFinite(value) ? value : fallback; }
function str(data: unknown, fallback: string) { return typeof data === 'string' && data.trim() ? data : fallback; }

/** Aceita a resposta agrupada por restaurantes ou uma lista direta de itens. */
export function normalizeCart(input: unknown): { groups: CartGroup[]; subtotal: number; itemCount: number } {
  const cart = recordOf(input);
  const groupSource = Array.isArray(cart.groups) ? cart.groups : Array.isArray(cart.restaurants) ? cart.restaurants : null;
  const directItems = Array.isArray(cart.items) ? cart.items : [];
  const normalizedGroups: CartGroup[] = [];
  const seenIds = new Set<number>();

  function appendGroup(raw: unknown, fallbackName: string, fallbackId?: number) {
    const group = recordOf(raw);
    const rawItems = Array.isArray(group.items) ? group.items : [];
    const items: CartItem[] = [];
    for (const rawItem of rawItems) {
      const item = recordOf(rawItem);
      const variant = recordOf(item.variant);
      const product = recordOf(variant.product);
      const restaurant = recordOf(product.restaurant);
      const cartItemId = num(item.cartItemId ?? item.id, -1);
      if (cartItemId < 0 || seenIds.has(cartItemId)) continue;
      seenIds.add(cartItemId);
      const quantity = num(item.quantity);
      const unitPrice = num(item.unitPrice ?? item.price ?? variant.price);
      items.push({
        cartItemId,
        variantId: num(item.variantId ?? variant.id),
        restaurantId: num(item.restaurantId ?? group.restaurantId ?? restaurant.id ?? fallbackId, 0),
        restaurantName: str(item.restaurantName ?? group.restaurantName ?? restaurant.name, fallbackName),
        productName: str(item.productName ?? product.name, 'Produto'),
        variantName: str(item.variantName ?? variant.name, 'Padrão'),
        quantity,
        unitPrice,
        lineTotal: num(item.lineTotal, quantity * unitPrice),
      });
    }
    if (items.length > 0) normalizedGroups.push({ restaurantId: fallbackId, restaurantName: str(group.restaurantName, fallbackName), items });
  }

  if (groupSource) {
    for (const group of groupSource) {
      const item = recordOf(group);
      appendGroup(group, str(item.restaurantName, 'Restaurante'), num(item.restaurantId, 0));
    }
  } else if (directItems.length > 0) {
    // Agrupamento local apenas quando a API enviar itens diretamente.
    const buckets = new Map<string, Record<string, unknown>[]>();
    for (const raw of directItems) {
      const item = recordOf(raw);
      const variant = recordOf(item.variant);
      const product = recordOf(variant.product);
      const restaurant = recordOf(product.restaurant);
      const name = str(item.restaurantName ?? restaurant.name, 'Restaurante');
      const key = String(item.restaurantId ?? restaurant.id ?? name);
      buckets.set(key, [...(buckets.get(key) ?? []), item]);
    }
    for (const items of buckets.values()) appendGroup({ restaurantName: str(items[0]?.restaurantName, 'Restaurante'), items }, str(items[0]?.restaurantName, 'Restaurante'));
  }
  const sum = normalizedGroups.flatMap((group) => group.items).reduce((acc, item) => acc + item.lineTotal, 0);
  const subtotal = typeof cart.subtotal === 'string' || typeof cart.subtotal === 'number' ? num(cart.subtotal, sum) : sum;
  const itemCount = normalizedGroups.reduce((total, group) => total + group.items.reduce((acc, item) => acc + item.quantity, 0), 0);
  return { groups: normalizedGroups, subtotal, itemCount };
}

