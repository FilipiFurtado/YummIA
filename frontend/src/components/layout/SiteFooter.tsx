import Link from 'next/link';
import { Heart, ShieldCheck, ShoppingBag } from 'lucide-react';

export function SiteFooter() {
  return (
    <footer className="market-footer">
      <div className="market-container market-footer-inner">
        <div className="market-footer-brand">
          <div className="market-footer-logo"><ShoppingBag size={20} /><strong>YummIA.</strong></div>
          <p>Boa comida, escolhas simples e um assistente para ajudar em cada pedido.</p>
        </div>
        <div className="market-footer-links">
          <Link href="/restaurants">Restaurantes</Link>
          <Link href="/cart">Meu carrinho</Link>
          <Link href="/assistant">Assistente IA</Link>
          <Link href="/profile">Minha conta</Link>
        </div>
      </div>
      <div className="market-container market-footer-base">
        <span>© {new Date().getFullYear()} YummIA · Projeto de marketplace</span>
        <span><ShieldCheck size={15} /> Confirmação antes de alterar o carrinho <Heart size={14} /></span>
      </div>
    </footer>
  );
}
