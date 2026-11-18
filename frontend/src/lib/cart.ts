import { API_URL } from './api';
import type { Cart } from '@/types/marketplace';

const CART_TOKEN_KEY = 'marketplace_guest_cart_token';

async function requestCart(
  path: string,
  method: string,
  token: string,
  body?: object
): Promise<Cart> {
  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Cart-Token': token,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(`Erro ao atualizar carrinho: ${response.status}`);
  }

  return response.json() as Promise<Cart>;
}

async function getOrCreateCartToken(): Promise<string> {
  const existing = localStorage.getItem(CART_TOKEN_KEY);

  if (existing) {
    return existing;
  }

  const response = await fetch(`${API_URL}/cart`, {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Não foi possível criar o carrinho');
  }

  const data = (await response.json()) as {
    cartToken: string;
  };

  localStorage.setItem(CART_TOKEN_KEY, data.cartToken);

  return data.cartToken;
}

export async function addGuestCartItem(
  variantId: number,
  quantity: number = 1
): Promise<Cart> {
  const token = await getOrCreateCartToken();

  return requestCart('/cart/items', 'POST', token, {
    variantId,
    quantity,
  });
}

export async function getGuestCart(): Promise<Cart | null> {
  const token = localStorage.getItem(CART_TOKEN_KEY);

  if (!token) {
    return null;
  }

  try {
    return await requestCart('/cart', 'GET', token);
  } catch {
    throw new Error('Não foi possível consultar o carrinho');
  }
}

export async function updateGuestCartItem(
  itemId: number,
  quantity: number
): Promise<Cart> {
  const token = localStorage.getItem(CART_TOKEN_KEY);

  if (!token) {
    throw new Error('Carrinho não encontrado');
  }

  return requestCart(
    `/cart/items/${itemId}`,
    'PATCH',
    token,
    { quantity }
  );
}

export async function removeGuestCartItem(
  itemId: number
): Promise<Cart> {
  const token = localStorage.getItem(CART_TOKEN_KEY);

  if (!token) {
    throw new Error('Carrinho não encontrado');
  }

  return requestCart(`/cart/items/${itemId}`, 'DELETE', token);
}

async function isAuthenticated(): Promise<boolean> {
  const response = await fetch('/api/auth/me', {
    cache: 'no-store',
  });

  return response.ok;
}

async function authenticatedCartRequest(
  path: string,
  method: string,
  body?: object,
): Promise<Cart> {
  const response = await fetch(path, {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    throw new Error(
      `Erro no carrinho autenticado: ${response.status}`,
    );
  }

  return response.json() as Promise<Cart>;
}

export async function getCurrentCart() {
  if (await isAuthenticated()) {
    return authenticatedCartRequest(
      '/api/cart/me',
      'GET',
    );
  }

  return getGuestCart();
}

export async function addCurrentCartItem(
  variantId: number,
  quantity = 1,
) {
  if (await isAuthenticated()) {
    return authenticatedCartRequest(
      '/api/cart/me/items',
      'POST',
      { variantId, quantity },
    );
  }

  return addGuestCartItem(variantId, quantity);
}

export async function updateCurrentCartItem(
  itemId: number,
  quantity: number,
) {
  if (await isAuthenticated()) {
    return authenticatedCartRequest(
      `/api/cart/me/items/${itemId}`,
      'PATCH',
      { quantity },
    );
  }

  return updateGuestCartItem(itemId, quantity);
}

export async function removeCurrentCartItem(itemId: number) {
  if (await isAuthenticated()) {
    return authenticatedCartRequest(
      `/api/cart/me/items/${itemId}`,
      'DELETE',
    );
  }

  return removeGuestCartItem(itemId);
}

export async function clearCurrentCart(): Promise<Cart | null> {
  // Usuário autenticado
  if (await isAuthenticated()) {
    return authenticatedCartRequest(
      '/api/cart/me/items',
      'DELETE',
    );
  }

  // Visitante
  const token = localStorage.getItem(CART_TOKEN_KEY);

  if (!token) {
    return null;
  }

  return requestCart(
    '/cart/items',
    'DELETE',
    token,
  );
}