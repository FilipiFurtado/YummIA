'use client';

import { useMemo, useState } from 'react';
import { Search, Store, X } from 'lucide-react';
import { RestaurantCard } from './RestaurantCard';
import type { Restaurant } from '@/lib/public-catalog';

function normalize(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

export function RestaurantExplorer({ restaurants }: { restaurants: Restaurant[] }) {
  const [search, setSearch] = useState('');
  const filtered = useMemo(() => {
    const term = normalize(search.trim());
    return restaurants.filter((restaurant) =>
      !term || normalize(`${restaurant.name} ${restaurant.description ?? ''}`).includes(term),
    );
  }, [search, restaurants]);

  return (
    <>
      <div className="market-card p-5 mb-7 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="market-search-shell flex-1">
          <Search size={19} aria-hidden="true" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar restaurantes pelo nome ou descrição..."
            aria-label="Buscar restaurantes"
            className="market-input"
          />
        </div>
        <span className="market-chip whitespace-nowrap"><Store size={15} /> {filtered.length} restaurante(s)</span>
      </div>
      {filtered.length > 0 ? (
        <div className="market-restaurant-grid">
          {filtered.map((restaurant) => <RestaurantCard restaurant={restaurant} key={restaurant.id} />)}
        </div>
      ) : (
        <div className="market-empty">
          <span className="market-empty-icon"><Search size={31} /></span>
          <h3 className="text-lg font-bold text-[#2d2024]">Nenhum restaurante encontrado</h3>
          <p className="text-sm mt-2">Experimente outra palavra ou limpe o filtro.</p>
          <button type="button" onClick={() => setSearch('')} className="market-btn market-btn-outline mt-5"><X size={16} /> Limpar busca</button>
        </div>
      )}
    </>
  );
}
