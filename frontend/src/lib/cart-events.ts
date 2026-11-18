/** Invalidação de cache entre componentes e entre abas (não armazena dados do carrinho). */
export const CART_UPDATED_EVENT = 'yummia:cart-updated';
export const CART_UPDATED_STORAGE_KEY = 'yummia:cart-updated-at';

export function broadcastCartChange(sameTab = true): void {
  if (typeof window === 'undefined') return;
  if (sameTab) window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  try {
    localStorage.setItem(
      CART_UPDATED_STORAGE_KEY,
      `${Date.now()}-${crypto.randomUUID()}`,
    );
  } catch {
    // Sincronização no navegador atual continua disponível.
  }
}
