'use client';

import { useState, type SubmitEvent } from 'react';
import { useRouter } from 'next/navigation';

export default function AddressesPage() {
  const router = useRouter();

  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [error, setError] = useState('');

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch('/api/addresses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street,
          number,
          neighborhood,
          city,
          state: state.toUpperCase(),
          postalCode: postalCode.replace(/\D/g, ''),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(
          Array.isArray(data.message)
            ? data.message.join(', ')
            : data.message ?? 'Erro ao cadastrar endereço'
        );
      }

      router.push('/checkout');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Erro desconhecido'
      );
    }
  }

  return (
    <main className="max-w-xl mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">
        Cadastrar endereço
      </h1>

      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full border p-3 rounded"
          placeholder="Rua"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          required
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Número"
          value={number}
          onChange={(e) => setNumber(e.target.value)}
          required
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Bairro"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="Cidade"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          required
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="UF (ex.: MG)"
          value={state}
          maxLength={2}
          onChange={(e) => setState(e.target.value)}
          required
        />

        <input
          className="w-full border p-3 rounded"
          placeholder="CEP (8 dígitos)"
          value={postalCode}
          onChange={(e) => setPostalCode(e.target.value)}
          required
        />

        <button className="bg-blue-600 text-white rounded p-3">
          Salvar endereço
        </button>
      </form>

      {error && (
        <p role="alert" className="text-red-600 mt-4">
          {error}
        </p>
      )}
    </main>
  );
}