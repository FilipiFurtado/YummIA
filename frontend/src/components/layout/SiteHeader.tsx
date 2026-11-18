'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight, Bot, ChevronDown, ClipboardList, LogIn, LogOut,
  Menu, ShoppingBag, Store, UserRound, UserRoundPlus, X,
} from 'lucide-react';
import { useAssistant } from '@/components/assistant/AssistantProvider';
import { useCart } from '@/components/cart/CartProvider';

type Account = { email?: string; name?: string; role?: string };

const primaryLinks = [
  { href: '/restaurants', label: 'Restaurantes', icon: Store },
  { href: '/cart', label: 'Carrinho', icon: ShoppingBag },
  { href: '/assistant', label: 'Assistente IA', icon: Bot },
];

function extractUser(value: unknown): Account | null {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const nested = source.user && typeof source.user === 'object'
    ? source.user as Record<string, unknown>
    : source;
  return {
    email: typeof nested.email === 'string' ? nested.email : undefined,
    name: typeof nested.name === 'string' ? nested.name : undefined,
    role: typeof nested.role === 'string' ? nested.role : undefined,
  };
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { auth } = useAssistant();
  const { itemCount } = useCart();
  const [account, setAccount] = useState<Account | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const accountMenu = useRef<HTMLDetailsElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    if (accountMenu.current) accountMenu.current.open = false;
  }, [pathname]);

  useEffect(() => {
    let cancelled = false;
    if (auth !== 'authenticated') {
      setAccount(null);
      return;
    }
    void fetch('/api/auth/me', { cache: 'no-store', credentials: 'same-origin' })
      .then((res) => res.ok ? res.json() as Promise<unknown> : null)
      .then((data) => { if (!cancelled) setAccount(extractUser(data)); })
      .catch(() => { if (!cancelled) setAccount(null); });
    return () => { cancelled = true; };
  }, [auth, pathname]);

  const displayName = account?.name?.trim() || account?.email?.split('@')[0] || 'Minha conta';

  async function logout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const response = await fetch('/api/auth/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Não foi possível encerrar a sessão.');
      setAccount(null);
      setMobileOpen(false);
      router.replace('/login');
      router.refresh();
    } catch {
      window.alert('Falha ao sair da conta. Tente novamente.');
    } finally {
      setLoggingOut(false);
    }
  }

  function NavLinks({ mobile = false }: { mobile?: boolean }) {
    return (
      <>
        {primaryLinks.map(({ href, label, icon: Icon }) => {
          const selected = pathname === href || (href !== '/cart' && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              aria-current={selected ? 'page' : undefined}
              className={`market-nav-link ${selected ? 'market-nav-link-active' : ''} ${mobile ? 'market-nav-link-mobile' : ''}`}
              onClick={() => setMobileOpen(false)}
            >
              <Icon size={18} strokeWidth={2} aria-hidden="true" />
              <span>{label}</span>
              {href === '/cart' && itemCount > 0 && (
                <span aria-label={`${itemCount} itens no carrinho`} className="ml-1 inline-flex min-w-5 h-5 items-center justify-center rounded-full bg-[#bc1d2b] px-1.5 text-[10px] font-bold text-white">{itemCount > 99 ? '99+' : itemCount}</span>
              )}
            </Link>
          );
        })}
      </>
    );
  }

  return (
    <header className="market-header">
      <div className="market-header-inner">
        <Link href="/" className="market-brand" aria-label="Página inicial do Marketplace">
          <span className="market-brand-symbol"><ShoppingBag size={23} strokeWidth={2.5} /></span>
          <span className="market-brand-name">Yumm<span>IA</span></span>
        </Link>

        <nav aria-label="Navegação principal" className="market-desktop-nav">
          <NavLinks />
        </nav>

        <div className="market-header-actions">
          {auth === 'checking' ? (
            <span className="market-auth-skeleton" aria-label="Verificando sessão" />
          ) : auth === 'authenticated' ? (
            <details className="market-account-menu" ref={accountMenu}>
              <summary className="market-profile-trigger" aria-label={`Abrir menu de ${displayName}`}>
                <span className="market-avatar"><UserRound size={18} /></span>
                <span className="market-profile-text"><small>Olá, bem-vindo!</small><strong>{displayName}</strong></span>
                <ChevronDown size={15} />
              </summary>
              <div className="market-account-dropdown">
                <div className="market-account-identity">
                  <strong>{displayName}</strong>
                  <small>{account?.email || 'Conta autenticada'}</small>
                </div>
                <Link href="/profile" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}><UserRound size={17} /> Meu perfil</Link>
                <Link href="/orders" onClick={() => { if (accountMenu.current) accountMenu.current.open = false; }}><ClipboardList size={17} /> Meus pedidos</Link>
                <button type="button" disabled={loggingOut} onClick={() => void logout()}><LogOut size={17} /> {loggingOut ? 'Saindo...' : 'Sair da conta'}</button>
              </div>
            </details>
          ) : (
            <div className="market-auth-actions">
              <Link href="/login" className="market-login-link"><LogIn size={17} /> Entrar</Link>
              <Link href="/register" className="market-signup-link"><UserRoundPlus size={16} /> Cadastrar</Link>
            </div>
          )}
          <button
            type="button"
            className="market-mobile-toggle"
            onClick={() => setMobileOpen((value) => !value)}
            aria-label={mobileOpen ? 'Fechar navegação' : 'Abrir navegação'}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </div>
      </div>

      <nav className="market-mobile-quick" aria-label="Acesso rápido às páginas">
        <Link href="/restaurants" className={pathname.startsWith('/restaurants') ? 'active' : ''}><Store size={17} /> Restaurantes</Link>
        <Link href="/cart" className={pathname === '/cart' ? 'active' : ''}><ShoppingBag size={17} /> Carrinho {itemCount > 0 && <span className="rounded-full bg-[#bc1d2b] text-white px-1.5 text-[10px] font-bold">{itemCount > 99 ? '99+' : itemCount}</span>}</Link>
        <Link href="/assistant" className={pathname === '/assistant' ? 'active' : ''}><Bot size={17} /> Assistente</Link>
        {auth === 'authenticated' ? <Link href="/profile" className={pathname === '/profile' ? 'active' : ''}><UserRound size={17} /> Perfil</Link> : auth === 'guest' ? <><Link href="/login" className={pathname === '/login' ? 'active' : ''}><LogIn size={17} /> Entrar</Link><Link href="/register" className={pathname === '/register' ? 'active' : ''}><UserRoundPlus size={17} /> Cadastro</Link></> : null}
      </nav>

      {mobileOpen && (
        <nav aria-label="Navegação móvel" className="market-mobile-nav">
          <NavLinks mobile />
          <div className="market-mobile-divider" />
          {auth === 'authenticated' ? (
            <>
              <Link href="/profile" className="market-nav-link market-nav-link-mobile" onClick={() => setMobileOpen(false)}><UserRound size={18} /> Perfil</Link>
              <Link href="/orders" className="market-nav-link market-nav-link-mobile" onClick={() => setMobileOpen(false)}><ClipboardList size={18} /> Meus pedidos</Link>
            </>
          ) : auth === 'guest' ? (
            <>
              <Link href="/login" className="market-nav-link market-nav-link-mobile" onClick={() => setMobileOpen(false)}><LogIn size={18} /> Entrar</Link>
              <Link href="/register" className="market-nav-link market-nav-link-mobile" onClick={() => setMobileOpen(false)}><ArrowRight size={18} /> Criar conta</Link>
            </>
          ) : null}
        </nav>
      )}
    </header>
  );
}
