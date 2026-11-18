'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Props = {
  mode: 'login' | 'register';
};

const GUEST_TOKEN_KEY = 'marketplace_guest_cart_token';

export default function AuthForm({ mode }: Props) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [claimPending, setClaimPending] = useState(false);

  const isRegister = mode === 'register';

  async function submit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();

    setLoading(true);
    setError('');

    try {
      const guestToken =
        localStorage.getItem(GUEST_TOKEN_KEY);

      const response = await fetch(`/api/auth/${mode}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(isRegister ? { name } : {}),
          email,
          password,
          guestToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ?? 'Erro na autenticação'
        );
      }

      if (data.cartClaimed) {
        localStorage.removeItem(GUEST_TOKEN_KEY);
      }

      if (data.claimWarning) {
        setError(data.claimWarning);
        setClaimPending(true);
        return;
      }

      router.push('/cart');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro desconhecido'
      );
    } finally {
      setLoading(false);
    }
  }

  async function retryClaim() {
    const guestToken = localStorage.getItem(GUEST_TOKEN_KEY);

    if (!guestToken) {
      router.push('/cart');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/cart/me/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ guestToken }),
      });

      if (!response.ok) {
        throw new Error('Não foi possível recuperar o carrinho');
      }

      localStorage.removeItem(GUEST_TOKEN_KEY);

      router.push('/cart');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro desconhecido'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        {isRegister ? 'Criar conta' : 'Entrar'}
      </h1>

      {!claimPending ? (
        <form onSubmit={submit} className="space-y-4">
          {isRegister && (
            <input
              className="w-full border rounded p-3"
              placeholder="Nome completo"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          )}

          <input
            type="email"
            className="w-full border rounded p-3"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            type="password"
            className="w-full border rounded p-3"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={isRegister ? 12 : undefined}
            required
          />

          <button
            disabled={loading}
            className="w-full bg-blue-600 text-white rounded p-3"
          >
            {loading
              ? 'Processando...'
              : isRegister ? 'Cadastrar' : 'Entrar'}
          </button>
        </form>
      ) : (
        <div className="space-y-3">
          <p>Sua conta foi autenticada.</p>

          <button
            onClick={retryClaim}
            disabled={loading}
            className="bg-blue-600 text-white p-3 rounded"
          >
            Tentar transferir carrinho
          </button>

          <Link href="/cart" className="block text-blue-600">
            Continuar sem transferir
          </Link>
        </div>
      )}

      {error && (
        <p role="alert" className="text-red-600 mt-4">
          {error}
        </p>
      )}

      <div className="mt-6">
        {isRegister ? (
          <Link href="/login" className="text-blue-600">
            Já possui conta? Entre aqui.
          </Link>
        ) : (
          <Link href="/register" className="text-blue-600">
            Ainda não possui conta? Cadastre-se.
          </Link>
        )}
      </div>
    </main>
  );
}