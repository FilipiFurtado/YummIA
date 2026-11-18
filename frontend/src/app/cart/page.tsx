'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Bot, ChevronRight, Minus, Plus, RefreshCw, ShoppingBag, Trash2 } from 'lucide-react';
import { clearCurrentCart, removeCurrentCartItem, updateCurrentCartItem } from '@/lib/cart';
import { useCart } from '@/components/cart/CartProvider';
import type { CartItem } from '@/lib/cart-view';
import { money } from '@/lib/format';

export default function CartPage() {
  const { groups, subtotal, itemCount: count, loading, refreshing, error: cartError, refreshCart, notifyCartChanged } = useCart();
  const [busyId, setBusyId] = useState<number | 'all' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function changeQuantity(item: CartItem, next: number) {
    if (next < 1 || next > 20 || busyId !== null) return;
    setBusyId(item.cartItemId); setError(''); setNotice('');
    try { await updateCurrentCartItem(item.cartItemId, next); await notifyCartChanged(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao alterar quantidade.'); }
    finally { setBusyId(null); }
  }
  async function remove(item: CartItem) {
    if (busyId !== null) return;
    setBusyId(item.cartItemId); setError(''); setNotice('');
    try { await removeCurrentCartItem(item.cartItemId); await notifyCartChanged(); setNotice('Produto removido do carrinho.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao remover produto.'); }
    finally { setBusyId(null); }
  }
  async function clear() {
    if (busyId !== null || !window.confirm('Deseja remover todos os itens do carrinho?')) return;
    setBusyId('all'); setError(''); setNotice('');
    try { await clearCurrentCart(); await notifyCartChanged(); setNotice('Carrinho esvaziado.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Erro ao esvaziar o carrinho.'); }
    finally { setBusyId(null); }
  }

  return (
    <main className="market-container pb-20">
      <nav aria-label="Breadcrumb" className="market-breadcrumbs"><Link href="/">Início</Link><ChevronRight size={14} /><span>Meu carrinho</span></nav>
      <div className="market-page-header flex flex-wrap justify-between gap-4 items-end"><div><span className="market-eyebrow">Seu pedido</span><h1 className="market-h1 mt-2">Meu <span className="text-[#bc1d2b]">carrinho.</span></h1><p className="market-lead mt-2">Revise seus produtos antes de seguir para o checkout.</p></div><Link href="/assistant" className="market-btn market-btn-outline"><Bot size={17} /> Ajustar com IA</Link></div>
      {(error || cartError) && <div className="market-alert-error mb-5" role="alert">{error || cartError}</div>}
      {notice && <div className="market-alert-success mb-5" role="status">{notice}</div>}
      {loading ? <div className="market-card p-8">Carregando carrinho...</div> : count === 0 ? (
        <div className="market-empty py-16"><span className="market-empty-icon"><ShoppingBag size={32} /></span><h2 className="text-xl font-extrabold text-[#2d1d22]">Seu carrinho está vazio</h2><p className="text-sm mt-3 mb-6">Que tal explorar nossos restaurantes e encontrar algo delicioso?</p><Link href="/restaurants" className="market-btn market-btn-primary">Explorar restaurantes <ArrowRight size={17} /></Link></div>
      ) : (
        <div className="market-cart-layout">
          <div className="grid gap-5">
            {groups.map((group, index) => (
              <section key={`${group.restaurantId ?? group.restaurantName}-${index}`} className="market-card p-6 sm:p-7">
                <h2 className="text-lg font-extrabold pb-4 border-b border-[#f2e7e8]">{group.restaurantName}</h2>
                {group.items.map((item) => (
                  <article key={item.cartItemId} className="market-cart-item">
                    <div className="market-cart-item-icon" aria-hidden="true">🍕</div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-[#302026]">{item.productName}</h3>
                      <p className="text-sm text-[#8b787e] mt-1">{item.variantName} · {money(item.unitPrice)} por unidade</p>
                      <div className="flex flex-wrap items-center gap-3 mt-4">
                        <div className="market-quantity" aria-label={`Quantidade de ${item.productName}`}>
                          <button type="button" disabled={item.quantity <= 1 || busyId !== null} onClick={() => void changeQuantity(item, item.quantity - 1)} aria-label="Diminuir quantidade"><Minus size={15} /></button>
                          <span aria-live="polite">{item.quantity}</span>
                          <button type="button" disabled={item.quantity >= 20 || busyId !== null} onClick={() => void changeQuantity(item, item.quantity + 1)} aria-label="Aumentar quantidade"><Plus size={15} /></button>
                        </div>
                        <button type="button" disabled={busyId !== null} onClick={() => void remove(item)} className="inline-flex items-center gap-1 text-xs font-bold text-[#b11f2c] hover:underline"><Trash2 size={15} /> Remover</button>
                      </div>
                    </div>
                    <div className="font-extrabold text-[#301f24] whitespace-nowrap">{money(item.lineTotal)}</div>
                  </article>
                ))}
              </section>
            ))}
            <div className="flex flex-wrap gap-3 justify-between"><Link href="/restaurants" className="market-btn market-btn-outline">Continuar comprando <ArrowRight size={16} /></Link><button type="button" disabled={busyId !== null} onClick={() => void clear()} className="market-btn market-btn-outline !text-[#ab202b]"><Trash2 size={17} /> Esvaziar carrinho</button></div>
          </div>
          <aside className="market-card market-summary">
            <h2 className="text-xl font-extrabold">Resumo do pedido</h2>
            <div className="border-t border-[#f2e4e6] mt-5 pt-3">
              <div className="market-summary-row"><span>Itens</span><strong>{count}</strong></div>
              <div className="market-summary-row"><span>Subtotal</span><strong>{money(subtotal)}</strong></div>
              <div className="market-summary-row"><span>Entrega</span><span>Calculada no checkout</span></div>
            </div>
            <div className="border-t border-[#f2e4e6] mt-4 pt-5 flex justify-between items-end"><strong className="text-sm">Subtotal</strong><span className="market-summary-total">{money(subtotal)}</span></div>
            <Link href="/checkout" className="market-btn market-btn-primary mt-6 w-full">Finalizar pedido <ArrowRight size={17} /></Link>
            <p className="text-xs text-[#98888b] text-center leading-relaxed mt-4">Os valores de entrega e o total final serão confirmados no checkout.</p>
            <button type="button" disabled={refreshing} onClick={() => void refreshCart().catch(() => {})} className="flex items-center gap-2 text-xs text-[#9f858b] mx-auto mt-5 hover:text-[#bc1d2b] disabled:opacity-50"><RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} /> {refreshing ? 'Atualizando...' : 'Atualizar carrinho'}</button>
          </aside>
        </div>
      )}
    </main>
  );
}
