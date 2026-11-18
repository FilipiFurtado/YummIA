import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Bot, ChevronRight, Store, UtensilsCrossed } from 'lucide-react';
import { AddItemButton } from '@/components/shop/AddItemButton';
import { listRestaurantProducts, money, readRestaurant } from '@/lib/public-catalog';

type Props = { params: Promise<{ id: string }> };

export default async function RestaurantDetailPage({ params }: Props) {
  const { id: rawId } = await params;
  const id = Number(rawId);
  if (!Number.isSafeInteger(id) || id <= 0) notFound();
  const restaurant = await readRestaurant(id);
  if (!restaurant || restaurant.active === false) notFound();
  const products = await listRestaurantProducts(id);

  return (
    <main className="market-container pb-20">
      <nav aria-label="Breadcrumb" className="market-breadcrumbs">
        <Link href="/">Início</Link><ChevronRight size={14} />
        <Link href="/restaurants">Restaurantes</Link><ChevronRight size={14} />
        <span>{restaurant.name}</span>
      </nav>
      <div className="market-menu-hero">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-2 text-xs font-bold"><Store size={14} /> Restaurante parceiro</span>
          <h1 className="mt-4">{restaurant.name}</h1>
          <p>{restaurant.description || 'Escolha seus favoritos e prepare seu pedido.'}</p>
        </div>
        <span aria-hidden="true" className="market-menu-hero-art">🍕</span>
      </div>
      <div className="mt-10 mb-6 flex flex-wrap justify-between gap-4 items-end">
        <div><span className="market-eyebrow">Explore os sabores</span><h2 className="market-h2 mt-2">Nosso cardápio</h2><p className="market-lead mt-2">Escolha o tamanho ou a variante desejada.</p></div>
        <Link href="/assistant" className="market-btn market-btn-outline"><Bot size={17} /> Pedir ajuda à IA</Link>
      </div>
      {products.length === 0 ? (
        <div className="market-empty"><span className="market-empty-icon"><UtensilsCrossed size={28} /></span><h3 className="font-bold">Cardápio indisponível no momento</h3><p className="mt-2 text-sm">Este restaurante ainda não possui produtos cadastrados.</p><Link href="/restaurants" className="market-btn market-btn-outline mt-5"><ArrowLeft size={16} /> Outros restaurantes</Link></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {products.map((product) => (
            <article key={product.id} className="market-card market-product-card">
              <div className="flex items-center gap-4">
                <span aria-hidden="true" className="market-product-icon">🍕</span>
                <div><h3 className="market-product-title">{product.name}</h3><p className="market-product-description mt-1">{product.description || 'Preparado para acompanhar seus melhores momentos.'}</p></div>
              </div>
              <div>
                {(product.variants ?? []).length ? product.variants.map((variant) => (
                  <div className="market-variant-row" key={variant.id}>
                    <div><p className="font-semibold text-sm text-[#382427]">{variant.name}</p><p className="font-extrabold text-[#bb1b29] mt-1">{money(variant.price)}</p></div>
                    <AddItemButton variantId={variant.id} disabled={!variant.available} />
                  </div>
                )) : <p className="text-sm text-[#8a777d]">Não há tamanhos disponíveis.</p>}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
