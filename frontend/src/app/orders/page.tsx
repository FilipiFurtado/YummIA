'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, ClipboardList, Clock3, ShoppingBag } from 'lucide-react';
import { money } from '@/lib/format';

type Order = {
  id: string | number;
  status?: string;
  total?: string | number;
  subtotal?: string | number;
  deliveryTotal?: string | number;
  createdAt?: string;
  restaurantOrders?: Array<{ id: number; restaurantName?: string; items?: Array<{ id: number; productName?: string; quantity?: number }> }>;
};
function normalizeOrders(result: unknown): Order[] {
  if (Array.isArray(result)) return result as Order[];
  if (result && typeof result === 'object') {
    const data = result as Record<string, unknown>;
    for (const key of ['orders', 'data', 'items']) if (Array.isArray(data[key])) return data[key] as Order[];
  }
  return [];
}
function statusName(status?: string) {
  if (status === 'PAID') return 'Pago';
  if (status === 'CANCELLED') return 'Cancelado';
  if (status === 'CREATED') return 'Recebido';
  return status || 'Em processamento';
}

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/orders', { cache: 'no-store' });
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error('Não foi possível consultar o histórico de pedidos.');
        const data = await response.json() as unknown;
        if (!cancelled) setOrders(normalizeOrders(data));
      } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Erro ao carregar pedidos.'); }
      finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <main className="market-container pb-20">
      <nav aria-label="Breadcrumb" className="market-breadcrumbs"><Link href="/">Início</Link><ChevronRight size={14} /><Link href="/profile">Minha conta</Link><ChevronRight size={14} /><span>Meus pedidos</span></nav>
      <div className="market-page-header"><span className="market-eyebrow">Seu histórico</span><h1 className="market-h1 mt-2">Meus <span className="text-[#bc1e2a]">pedidos.</span></h1><p className="market-lead mt-2">Acompanhe os pedidos que você já criou.</p></div>
      {error && <div className="market-alert-error mb-6" role="alert">{error}</div>}
      {loading ? <div className="market-card p-8 text-[#846f74]">Carregando seus pedidos...</div> : orders.length === 0 ? (
        <div className="market-empty"><span className="market-empty-icon"><ClipboardList size={32} /></span><h2 className="font-extrabold text-lg text-[#2e2023]">Você ainda não fez pedidos</h2><p className="text-sm mt-2 mb-6">Explore os restaurantes e comece seu primeiro pedido.</p><Link href="/restaurants" className="market-btn market-btn-primary">Ver restaurantes <ArrowRight size={17} /></Link></div>
      ) : <div className="grid gap-5">{orders.map((order) => (
        <article key={order.id} className="market-card p-6 sm:p-7">
          <div className="flex flex-wrap gap-4 justify-between items-start">
            <div><p className="text-xs font-extrabold text-[#b51b2a] uppercase tracking-wider">Pedido #{order.id}</p><p className="flex gap-2 items-center mt-2 text-xs text-[#86747a]"><Clock3 size={14} /> {order.createdAt ? new Date(order.createdAt).toLocaleString('pt-BR') : 'Data indisponível'}</p></div>
            <span className="market-chip">{statusName(order.status)}</span>
          </div>
          <div className="border-t border-[#f0e5e6] mt-5 pt-5">
            {(order.restaurantOrders ?? []).map((restaurant) => (
              <div key={restaurant.id} className="mt-2"><p className="font-bold text-sm">{restaurant.restaurantName || 'Restaurante'}</p><p className="text-xs text-[#857579] mt-1">{(restaurant.items ?? []).map((item) => `${item.quantity ?? 1}× ${item.productName || 'Item'}`).join(' · ')}</p></div>
            ))}
            <div className="flex justify-between gap-3 items-end mt-5"><span className="text-sm text-[#86767a]">Total do pedido</span><span className="text-2xl font-extrabold text-[#302026]">{money(order.total)}</span></div>
          </div>
        </article>
      ))}</div>}
      <Link href="/restaurants" className="market-btn market-btn-outline mt-7"><ShoppingBag size={17} /> Fazer novo pedido</Link>
    </main>
  );
}
