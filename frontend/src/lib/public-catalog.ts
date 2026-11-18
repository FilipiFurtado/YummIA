/** Consultas públicas ao NestJS. Não altera o BFF de autenticação existente. */
export type Restaurant = {
  id: number;
  name: string;
  description?: string | null;
  active?: boolean;
};

export type ProductVariant = {
  id: number;
  name: string;
  price: string | number;
  available: boolean;
};

export type Product = {
  id: number;
  name: string;
  description?: string | null;
  restaurantId?: number;
  variants: ProductVariant[];
};

const API_BASE = (process.env.BACKEND_API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000').replace(/\/$/, '');

function getItems<T>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>;
    for (const key of ['data', 'items', 'restaurants', 'products']) {
      if (Array.isArray(obj[key])) return obj[key] as T[];
    }
  }
  return [];
}

async function publicGet(path: string): Promise<unknown> {
  const response = await fetch(`${API_BASE}${path}`, { next: { revalidate: 30 } });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Falha ao consultar o catálogo (${response.status}).`);
  return response.json() as Promise<unknown>;
}

export async function listRestaurants(): Promise<Restaurant[]> {
  const result = await publicGet('/restaurants');
  return getItems<Restaurant>(result).filter((restaurant) => restaurant.active !== false);
}

export async function readRestaurant(id: number): Promise<Restaurant | null> {
  const result = await publicGet(`/restaurants/${id}`);
  if (!result || typeof result !== 'object') return null;
  const row = result as Record<string, unknown>;
  const data = row.restaurant && typeof row.restaurant === 'object' ? row.restaurant : row;
  return data as Restaurant;
}

export async function listRestaurantProducts(restaurantId: number): Promise<Product[]> {
  const source = await publicGet(`/restaurants/${restaurantId}`);
  if (source && typeof source === 'object' && !Array.isArray(source)) {
    const row = source as Record<string, unknown>;
    const inner = row.restaurant && typeof row.restaurant === 'object'
      ? row.restaurant as Record<string, unknown>
      : row;
    if (Array.isArray(inner.products)) return inner.products as Product[];
  }
  // Funciona também se o endpoint /products ignorar o filtro, pois filtramos localmente.
  const result = await publicGet(`/products?restaurantId=${restaurantId}`);
  return getItems<Product>(result).filter((product) =>
    product.restaurantId === restaurantId ||
    (product as Product & { restaurant?: { id?: number } }).restaurant?.id === restaurantId,
  );
}

export { money } from './format';
