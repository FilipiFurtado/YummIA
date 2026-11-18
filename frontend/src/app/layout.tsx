import type { Metadata } from 'next';
import './globals.css';
import './marketplace-theme.css';
import { AssistantProvider } from '@/components/assistant/AssistantProvider';
import { AssistantWidget } from '@/components/assistant/AssistantWidget';
import { CartProvider } from '@/components/cart/CartProvider';
import { SiteHeader } from '@/components/layout/SiteHeader';
import { SiteFooter } from '@/components/layout/SiteFooter';

export const metadata: Metadata = {
  title: { default: 'YummIA | Seu marketplace inteligente', template: '%s | YummIA' },
  description: 'Encontre restaurantes, escolha seus pratos e compre com ajuda de um assistente inteligente.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body className="market-body">
        <AssistantProvider>
          <CartProvider>
            <SiteHeader />
            <div className="market-main">{children}</div>
            <SiteFooter />
            <AssistantWidget />
          </CartProvider>
        </AssistantProvider>
      </body>
    </html>
  );
}
