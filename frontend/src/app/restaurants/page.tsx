import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronRight, Store } from 'lucide-react';
import { listRestaurants } from '@/lib/public-catalog';
import { RestaurantExplorer } from '@/components/restaurant/RestaurantExplorer';

export const metadata: Metadata = { title: 'Restaurantes' };

export default async function RestaurantsPage() {
  let restaurants: Awaited<ReturnType<typeof listRestaurants>> = [];
  let error = false;
  try { restaurants = await listRestaurants(); } catch { error = true; }

  return (
    <main className="market-container pb-20">
      <nav aria-label="Breadcrumb" className="market-breadcrumbs"><Link href="/">Início</Link><ChevronRight size={14} /><span>Restaurantes</span></nav>
      <div className="market-page-header">
        <span className="market-eyebrow">Explore os cardápios</span>
        <h1 className="market-h1 mt-2">Encontre seu próximo <span className="text-[#be1f2b]">favorito.</span></h1>
        <p className="market-lead mt-3">Todos os restaurantes disponíveis para você descobrir novos sabores.</p>
      </div>
      {error ? (
        <div className="market-alert-error">Não foi possível buscar os restaurantes. Confirme que o NestJS está na porta 3000.</div>
      ) : restaurants.length === 0 ? (
        <div className="market-empty"><span className="market-empty-icon"><Store size={30} /></span><h2 className="font-bold">Ainda não há restaurantes ativos</h2><p className="text-sm mt-2">Os restaurantes cadastrados serão apresentados nesta página.</p></div>
      ) : (
        <RestaurantExplorer restaurants={restaurants} />
      )}
    </main>
  );
}
