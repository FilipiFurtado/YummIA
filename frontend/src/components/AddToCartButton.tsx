'use client';

import { useState } from 'react';
import { addCurrentCartItem } from '@/lib/cart';

interface Props {
  variantId: number;
  available: boolean;
}

export default function AddToCartButton({
  variantId,
  available,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleAdd() {
    setLoading(true);
    setMessage('');

    try {
      await addCurrentCartItem(variantId, 1);
      setMessage('Adicionado!');
    } catch {
      setMessage('Erro ao adicionar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="text-right">
      <button
        onClick={handleAdd}
        disabled={!available || loading}
        className="bg-blue-600 text-white px-4 py-2 rounded-lg disabled:opacity-50"
      >
        {!available
          ? 'Indisponível'
          : loading
            ? 'Adicionando...'
            : 'Adicionar'}
      </button>

      {message && (
        <p className="text-sm mt-1" role="status">
          {message}
        </p>
      )}
    </div>
  );
}