'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePathname } from 'next/navigation';
import Link from 'next/link';

type User = {
  id: number;
  name: string;
  email: string;
};

export default function SessionNav() {
  const router = useRouter();
  const pathname = usePathname();

  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
        .then((response) =>
        response.ok ? response.json() : null
        )
        .then(setUser)
        .catch(() => setUser(null));
    }, [pathname]);

  async function logout() {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
    });

    if (!response.ok) return;

    setUser(null);
    router.push('/');
    router.refresh();
  }

  if (!user) {
    return (
      <div className="flex gap-4">
        <Link href="/login">Entrar</Link>
        <Link href="/register">Cadastrar</Link>
      </div>
    );
  }

  return (
    <div className="flex gap-4 items-center">
      <span>Olá, {user.name}</span>

      <Link href="/orders">
        Meus pedidos
      </Link>

      <button
        onClick={logout}
        className="text-red-600"
      >
        Sair
      </button>
    </div>
  );
}