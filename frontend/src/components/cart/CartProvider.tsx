'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { getCurrentCart } from '@/lib/cart';
import { normalizeCart, type CartGroup } from '@/lib/cart-view';
import {
  broadcastCartChange,
  CART_UPDATED_EVENT,
  CART_UPDATED_STORAGE_KEY,
} from '@/lib/cart-events';
import { useAssistant } from '@/components/assistant/AssistantProvider';

type CartContextValue = {
  groups: CartGroup[];
  subtotal: number;
  itemCount: number;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  refreshCart: () => Promise<void>;
  notifyCartChanged: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { auth } = useAssistant();
  const [rawCart, setRawCart] = useState<unknown>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const revision = useRef(0);
  const normalized = useMemo(() => normalizeCart(rawCart), [rawCart]);

  const refreshCart = useCallback(async (): Promise<void> => {
    const currentRevision = ++revision.current;
    setRefreshing(true);
    try {
      const result: unknown = await getCurrentCart();
      // Uma resposta antiga não pode sobrescrever o carrinho mais recente.
      if (currentRevision !== revision.current) return;
      setRawCart(result);
      setError(null);
    } catch (cause) {
      if (currentRevision !== revision.current) return;
      const message = cause instanceof Error ? cause.message : 'Não foi possível atualizar o carrinho.';
      setError(message);
      throw cause;
    } finally {
      if (currentRevision === revision.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  // Ao entrar/sair da conta, descarta os dados do usuário anterior e atualiza.
  useEffect(() => {
    if (auth === 'checking') return;
    revision.current += 1;
    setRawCart(null);
    setLoading(true);
    void refreshCart().catch(() => {});
    return () => { revision.current += 1; };
  }, [auth, refreshCart]);

  // Confirmações da IA e adições no catálogo notificam o carrinho nesta aba.
  // Alterações em outras abas chegam pelo evento storage.
  useEffect(() => {
    const update = () => { if (auth !== 'checking') void refreshCart().catch(() => {}); };
    const onStorage = (event: StorageEvent) => {
      if (event.key === CART_UPDATED_STORAGE_KEY) update();
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') update();
    };
    window.addEventListener(CART_UPDATED_EVENT, update);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', update);
    document.addEventListener('visibilitychange', onVisibility);

    // Detecta alterações vindas de outras sessões/dispositivos sem reload.
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') update();
    }, 15_000);
    return () => {
      window.removeEventListener(CART_UPDATED_EVENT, update);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', update);
      document.removeEventListener('visibilitychange', onVisibility);
      window.clearInterval(timer);
    };
  }, [auth, refreshCart]);

  const notifyCartChanged = useCallback(async () => {
    // Esta aba será atualizada diretamente; as demais por storage.
    broadcastCartChange(false);
    await refreshCart();
  }, [refreshCart]);

  return (
    <CartContext.Provider value={{
      groups: normalized.groups,
      subtotal: normalized.subtotal,
      itemCount: normalized.itemCount,
      loading,
      refreshing,
      error,
      refreshCart,
      notifyCartChanged,
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve estar dentro de CartProvider.');
  return context;
}
