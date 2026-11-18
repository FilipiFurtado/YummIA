import Link from 'next/link';
import { ArrowRight, Bot, CheckCircle2, Search, ShieldCheck, Sparkles, Store, Truck } from 'lucide-react';
import { RestaurantCard } from '@/components/restaurant/RestaurantCard';
import { listRestaurants } from '@/lib/public-catalog';

export default async function HomePage() {
  let restaurants: Awaited<ReturnType<typeof listRestaurants>> = [];
  let loadingError = false;
  try { restaurants = await listRestaurants(); } catch { loadingError = true; }

  return (
    <main>
      <section className="market-hero">
        <div className="market-container">
          <div className="market-hero-shell">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/15 px-3 py-2 text-xs font-bold tracking-wide mb-6"><Sparkles size={15} /> Seu próximo pedido começa aqui</span>
              <h1 className="market-hero-title">Uma experiência <em>deliciosa</em> do começo ao fim.</h1>
              <p className="market-hero-copy">Explore restaurantes, encontre seus pratos favoritos e deixe nosso assistente inteligente ajudar a montar seu pedido.</p>
              <div className="market-hero-actions">
                <Link href="/restaurants" className="market-btn market-btn-light">Explorar restaurantes <ArrowRight size={18} /></Link>
                <Link href="/assistant" className="market-btn market-btn-hero-ghost"><Bot size={19} /> Conversar com a IA</Link>
              </div>
            </div>
            <div className="market-hero-visual" aria-hidden="true">
              <div className="market-food-plate">
                <span>🍕</span>
                <div className="market-food-sticker market-food-sticker-top">Feito para você ✨</div>
                <div className="market-food-sticker market-food-sticker-bottom">Seu sabor favorito ❤️</div>
              </div>
            </div>
          </div>
          <div className="market-feature-grid">
            <div className="market-feature"><span className="market-feature-icon"><Search size={24} /></span><div><strong>Encontre o que deseja</strong><small>Cardápios e variantes em um só lugar.</small></div></div>
            <div className="market-feature"><span className="market-feature-icon"><Bot size={24} /></span><div><strong>Peça ajuda à IA</strong><small>Pesquise produtos e prepare seu carrinho.</small></div></div>
            <div className="market-feature"><span className="market-feature-icon"><ShieldCheck size={24} /></span><div><strong>Você sempre confirma</strong><small>Alterações feitas apenas com sua aprovação.</small></div></div>
          </div>
        </div>
      </section>

      <section className="market-section">
        <div className="market-container">
          <div className="market-section-heading">
            <div><span className="market-eyebrow">Escolha o seu favorito</span><h2 className="market-h2 mt-2">Restaurantes disponíveis</h2><p className="market-lead mt-2">Conheça as opções cadastradas no marketplace.</p></div>
            <Link href="/restaurants" className="market-btn market-btn-outline hidden sm:inline-flex">Ver todos <ArrowRight size={17} /></Link>
          </div>
          {loadingError ? (
            <div className="market-alert-error">Não foi possível carregar os restaurantes. Verifique se o backend está funcionando.</div>
          ) : restaurants.length ? (
            <div className="market-restaurant-grid">{restaurants.slice(0, 6).map((restaurant) => <RestaurantCard key={restaurant.id} restaurant={restaurant} />)}</div>
          ) : (
            <div className="market-empty"><span className="market-empty-icon"><Store size={30} /></span><h3 className="font-bold">Nenhum restaurante disponível agora</h3><p className="text-sm mt-2">Quando houver restaurantes ativos, eles aparecerão aqui.</p></div>
          )}
          <Link href="/restaurants" className="market-btn market-btn-outline mt-5 sm:hidden">Ver todos os restaurantes <ArrowRight size={17} /></Link>
        </div>
      </section>

      <section className="market-container pb-9">
        <div className="market-cta-strip">
          <div className="flex gap-4 items-start"><span className="market-feature-icon !bg-white"><Bot size={26} /></span><div><h3>Não sabe o que pedir?</h3><p>Peça sugestões e monte um carrinho com ajuda do assistente.</p></div></div>
          <Link href="/assistant" className="market-btn market-btn-primary shrink-0">Abrir assistente <ArrowRight size={17} /></Link>
        </div>
      </section>
      <div className="sr-only"><CheckCircle2 /><Truck /></div>
    </main>
  );
}
