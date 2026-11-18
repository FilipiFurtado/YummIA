import Link from 'next/link';

import SessionNav from './SessionNav';

export default function Navbar() {
  return (
    <header className="border-b bg-white text-gray-900">
      <nav className="max-w-6xl mx-auto p-5 flex justify-between items-center">
        <SessionNav />
        <Link href="/" className="text-xl font-bold">
          🍽️ Marketplace
        </Link>

        <div className="flex items-center gap-6">
          <Link href="/">
            Restaurantes
          </Link>

          <Link href="/cart">
            Carrinho
          </Link>
        </div>
      </nav>
    </header>
  );
}