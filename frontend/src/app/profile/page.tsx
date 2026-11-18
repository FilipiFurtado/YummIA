'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, ChevronRight, ClipboardList, Home, LogOut, Mail, MapPin, ShieldCheck, UserRound } from 'lucide-react';

type UserProfile = {
  id?: number;
  email?: string;
  name?: string;
  role?: string;
  active?: boolean;
};
type Address = { id: number; label?: string; street?: string; number?: string; neighborhood?: string; city?: string; state?: string; zipCode?: string };

function unpackObject(value: unknown): UserProfile {
  if (!value || typeof value !== 'object') return {};
  const data = value as Record<string, unknown>;
  return (data.user && typeof data.user === 'object' ? data.user : data) as UserProfile;
}
function unpackAddresses(value: unknown): Address[] {
  if (Array.isArray(value)) return value as Address[];
  if (!value || typeof value !== 'object') return [];
  const object = value as Record<string, unknown>;
  return Array.isArray(object.addresses) ? object.addresses as Address[] : Array.isArray(object.data) ? object.data as Address[] : [];
}
function roleLabel(role?: string) {
  return role === 'ADMIN' ? 'Administrador' : role === 'RESTAURANT_OWNER' ? 'Responsável por restaurante' : 'Cliente';
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch('/api/auth/me', { cache: 'no-store' });
        if (response.status === 401) { router.replace('/login'); return; }
        if (!response.ok) throw new Error('Não foi possível carregar sua conta.');
        const result = await response.json() as unknown;
        if (!cancelled) setUser(unpackObject(result));
        try {
          const addressesResponse = await fetch('/api/addresses', { cache: 'no-store' });
          if (addressesResponse.ok && !cancelled) setAddresses(unpackAddresses(await addressesResponse.json()));
        } catch { /* A área da conta funciona mesmo sem a listagem de endereços. */ }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Erro de conexão.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Não foi possível sair.');
      router.replace('/login');
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível sair.');
    } finally { setLoggingOut(false); }
  }

  const displayName = user?.name || user?.email?.split('@')[0] || 'Cliente';
  return (
    <main className="market-container pb-20">
      <nav className="market-breadcrumbs" aria-label="Breadcrumb"><Link href="/">Início</Link><ChevronRight size={14} /><span>Meu perfil</span></nav>
      <div className="market-page-header"><span className="market-eyebrow">Sua conta</span><h1 className="market-h1 mt-2">Meu <span className="text-[#bc1e2b]">perfil.</span></h1><p className="market-lead mt-2">Seus dados, seus endereços e seus pedidos em um só lugar.</p></div>
      {error && <div className="market-alert-error mb-6" role="alert">{error}</div>}
      {loading ? <div className="market-card p-8 text-[#88757a]">Carregando informações da conta...</div> : !user ? (
        <div className="market-empty"><h2 className="font-bold">Não foi possível carregar o perfil</h2><Link href="/login" className="market-btn market-btn-primary mt-5">Entrar</Link></div>
      ) : (
        <div className="market-profile-grid">
          <aside className="market-card market-profile-side">
            <div className="market-profile-avatar"><UserRound size={36} /></div>
            <h2 className="text-xl font-extrabold break-words">{displayName}</h2>
            <p className="text-sm text-[#88777b] mt-1 break-all">{user.email}</p>
            <span className="market-chip mt-4"><ShieldCheck size={14} /> {roleLabel(user.role)}</span>
            <div className="border-t border-[#f2e5e6] mt-7 pt-6 grid gap-3">
              <Link href="/orders" className="market-btn market-btn-outline !justify-start"><ClipboardList size={18} /> Meus pedidos <ArrowRight size={15} className="ml-auto" /></Link>
              <Link href="/cart" className="market-btn market-btn-outline !justify-start"><Home size={18} /> Meu carrinho <ArrowRight size={15} className="ml-auto" /></Link>
              <button type="button" disabled={loggingOut} onClick={() => void logout()} className="market-btn market-btn-outline !justify-start"><LogOut size={18} /> {loggingOut ? 'Saindo...' : 'Sair da conta'}</button>
            </div>
          </aside>
          <div className="grid gap-6 content-start">
            <section className="market-card market-profile-main"><h2 className="text-xl font-extrabold">Dados da conta</h2><p className="text-sm text-[#8a757c] mt-1">Informações cadastradas para autenticação.</p>
              <div className="market-account-detail mt-5"><span className="flex items-center gap-2 text-sm text-[#78686d]"><UserRound size={17} /> Nome de exibição</span><strong>{displayName}</strong></div>
              <div className="market-account-detail"><span className="flex items-center gap-2 text-sm text-[#78686d]"><Mail size={17} /> E-mail</span><strong>{user.email || 'Não informado'}</strong></div>
              <div className="market-account-detail"><span className="flex items-center gap-2 text-sm text-[#78686d]"><ShieldCheck size={17} /> Tipo de conta</span><strong>{roleLabel(user.role)}</strong></div>
            </section>
            <section className="market-card market-profile-main">
              <div className="flex items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold">Meus endereços</h2><p className="text-sm text-[#8a757c] mt-1">Endereços associados à sua conta.</p></div><MapPin size={24} className="text-[#bf1e2d]" /></div>
              {addresses.length ? <div className="grid gap-3 mt-6">{addresses.map((address) => (
                <div key={address.id} className="rounded-xl border border-[#f0e1e2] bg-[#fffafa] p-4">
                  <p className="font-bold text-sm">{address.label || `Endereço ${address.id}`}</p>
                  <p className="text-sm text-[#75656a] mt-1">{[address.street, address.number, address.neighborhood, address.city, address.state].filter(Boolean).join(', ')}</p>
                  {address.zipCode && <p className="text-xs text-[#9a888d] mt-1">CEP {address.zipCode}</p>}
                </div>
              ))}</div> : <p className="mt-6 text-sm text-[#89767c]">Nenhum endereço encontrado.</p>}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
