'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Plus, ShoppingCart } from 'lucide-react';
import { addCurrentCartItem } from '@/lib/cart';
import { broadcastCartChange } from '@/lib/cart-events';

/** Reutiliza a camada de carrinho já implementada (usuário ou convidado). */
export function AddItemButton({ variantId, disabled = false }: { variantId: number; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState('');

  async function add() {
    if (busy || disabled) return;
    setBusy(true);
    setError('');
    try {
      await addCurrentCartItem(variantId, 1);
      broadcastCartChange();
      setAdded(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível adicionar o item.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button type="button" disabled={busy || disabled} onClick={() => void add()} className="market-btn market-btn-primary !px-3 !py-2 !text-xs" aria-label="Adicionar uma unidade ao carrinho">
        {busy ? <ShoppingCart size={15} /> : <Plus size={15} />}
        {disabled ? 'Indisponível' : busy ? 'Adicionando...' : added ? 'Adicionar mais' : 'Adicionar'}
      </button>
      {added && <Link href="/cart" className="inline-flex items-center gap-1 text-xs font-bold text-[#ad1927] hover:underline"><Check size={13} /> Ver carrinho</Link>}
      {error && <span role="alert" className="max-w-52 text-right text-xs text-red-700">{error}</span>}
    </div>
  );
}
