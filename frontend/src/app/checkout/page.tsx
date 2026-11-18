'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import type {
  Address,
  CheckoutQuote,
} from '@/types/marketplace';

const formatPrice = (value: string) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));

export default function CheckoutPage() {
  const router = useRouter();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addressId, setAddressId] = useState<number | null>(null);

  const [quote, setQuote] = useState<CheckoutQuote | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Mantém a mesma chave caso seja necessário repetir
  // uma tentativa de criação do pedido.
  const attemptKey = useRef<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const response = await fetch('/api/addresses');

        if (response.status === 401) {
          router.push('/login');
          return;
        }

        if (!response.ok) {
          throw new Error('Erro ao consultar endereços');
        }

        const data = (await response.json()) as Address[];

        setAddresses(data);

        if (data.length > 0) {
          setAddressId(data[0].id);
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Erro desconhecido'
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [router]);

  async function calculateQuote() {
    if (addressId === null) return;

    setBusy(true);
    setError('');
    setQuote(null);
    attemptKey.current = null;

    try {
      const response = await fetch('/api/checkout/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addressId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Erro ao calcular cotação'
        );
      }

      setQuote(data as CheckoutQuote);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro desconhecido'
      );
    } finally {
      setBusy(false);
    }
  }

  async function confirmOrder() {
    if (!quote) return;

    setBusy(true);
    setError('');

    // Gera uma chave para esta tentativa lógica.
    // Em caso de erro de rede, mantém a mesma chave.
    if (!attemptKey.current) {
      attemptKey.current = crypto.randomUUID();
    }

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': attemptKey.current,
        },
        body: JSON.stringify({
          addressId: quote.addressId,
          expectedTotal: quote.total,
          quoteHash: quote.quoteHash,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ?? 'Não foi possível criar o pedido'
        );
      }

      router.push('/orders');
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro desconhecido'
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <main className="p-8">Carregando checkout...</main>;
  }

  return (
    <main className="max-w-4xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">
        Finalizar pedido
      </h1>

      <section className="border rounded-xl p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">
          Endereço de entrega
        </h2>

        {addresses.length === 0 ? (
          <p>
            Nenhum endereço cadastrado.{' '}
            <Link href="/addresses" className="text-blue-600">
              Cadastrar endereço
            </Link>
          </p>
        ) : (
          <>
            <select
              className="w-full border rounded p-3 mb-4"
              value={addressId ?? ''}
              onChange={(e) => {
                setAddressId(Number(e.target.value));
                setQuote(null);
                attemptKey.current = null;
              }}
            >
              {addresses.map((address) => (
                <option key={address.id} value={address.id}>
                  {address.street}, {address.number} —{' '}
                  {address.city}/{address.state}
                </option>
              ))}
            </select>

            <Link
              href="/addresses"
              className="block text-blue-600 mb-4"
            >
              Cadastrar outro endereço
            </Link>

            <button
              disabled={busy}
              onClick={calculateQuote}
              className="bg-blue-600 text-white rounded p-3"
            >
              {busy ? 'Processando...' : 'Calcular valores'}
            </button>
          </>
        )}
      </section>

      {quote && (
        <section className="border rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-6">
            Resumo do pedido
          </h2>

          {quote.restaurants.map((restaurant) => (
            <div
              key={restaurant.restaurantId}
              className="mb-6 border-b pb-4"
            >
              <h3 className="font-semibold mb-3">
                {restaurant.restaurantName}
              </h3>

              {restaurant.items.map((item) => (
                <div
                  key={item.variantId}
                  className="flex justify-between gap-4 py-1"
                >
                  <span>
                    {item.quantity}× {item.productName} —{' '}
                    {item.variantName}
                  </span>

                  <span>{formatPrice(item.lineTotal)}</span>
                </div>
              ))}

              <div className="flex justify-between mt-3">
                <span>Entrega</span>
                <span>
                  {formatPrice(restaurant.deliveryFee)}
                </span>
              </div>

              <p className="text-right font-semibold mt-2">
                Total: {formatPrice(restaurant.total)}
              </p>
            </div>
          ))}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(quote.subtotal)}</span>
            </div>

            <div className="flex justify-between">
              <span>Taxas de entrega</span>
              <span>{formatPrice(quote.deliveryTotal)}</span>
            </div>

            <div className="flex justify-between text-xl font-bold">
              <span>Total</span>
              <span>{formatPrice(quote.total)}</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-4">
            Os valores serão confirmados novamente pelo
            servidor antes de registrar o pedido.
            Esta versão utiliza pagamento simulado.
          </p>

          <button
            disabled={busy}
            onClick={confirmOrder}
            className="w-full bg-green-600 text-white rounded p-4 mt-6 disabled:opacity-50"
          >
            {busy ? 'Confirmando...' : 'Confirmar pedido'}
          </button>
        </section>
      )}

      {error && (
        <p role="alert" className="text-red-600 mt-4">
          {error}
        </p>
      )}
    </main>
  );
}