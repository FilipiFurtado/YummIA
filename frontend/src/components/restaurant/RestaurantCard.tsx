import Link from 'next/link';
import { ArrowUpRight, MapPin, Store } from 'lucide-react';
import type { Restaurant } from '@/lib/public-catalog';

export function RestaurantCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <Link href={`/restaurants/${restaurant.id}`} className="market-restaurant-card" aria-label={`Ver cardápio de ${restaurant.name}`}>
      <div className="market-restaurant-visual">
        <span className="market-restaurant-badge"><Store size={12} className="inline mr-1" /> Restaurante parceiro</span>
        <span aria-hidden="true" className="market-restaurant-emoji">🍕</span>
      </div>
      <div className="market-restaurant-body">
        <h3>{restaurant.name}</h3>
        <p>{restaurant.description || 'Explore o cardápio e encontre o que combina com seu momento.'}</p>
        <div className="market-restaurant-foot">
          <span><MapPin size={14} className="inline mr-1" /> Ver cardápio</span>
          <ArrowUpRight size={18} />
        </div>
      </div>
    </Link>
  );
}
