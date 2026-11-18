import type { Restaurant } from '@/types/marketplace';

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3000';

export async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(
      `Erro na API: ${response.status} ${response.statusText}`
    );
  }

  return response.json() as Promise<T>;
}

export async function getRestaurants() {
  return apiGet<Restaurant[]>('/restaurants');
}

export async function getRestaurant(id: number) {
  return apiGet<Restaurant>(`/restaurants/${id}`);
}