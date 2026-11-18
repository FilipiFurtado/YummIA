'use client';

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import Link from 'next/link';
import { useAssistant, type AssistantProposalItem } from './AssistantProvider';

function brl(value: string | number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(Number(value));
}

function ProposalLine({ item }: { item: AssistantProposalItem }) {
  const isChange = item.action === 'SET_QUANTITY';
  const isRemoval = isChange && item.targetQuantity === 0;
  const total = isChange
    ? Number(item.unitPrice) * Number(item.targetQuantity ?? 0)
    : Number(item.lineTotal);

  return (
    <li className="border-b border-[#f2dadf] py-2 last:border-0">
      <p className="font-semibold text-sm text-gray-900">{item.productName} ({item.variantName})</p>
      <p className="text-xs text-gray-600">{item.restaurantName}</p>
      <div className="mt-1 flex items-center justify-between gap-2 text-sm">
        <span className={isRemoval ? 'font-medium text-red-700' : 'text-gray-700'}>
          {isChange
            ? `Quantidade: ${item.currentQuantity ?? 0} → ${item.targetQuantity ?? 0}`
            : `Adicionar ${item.quantity} unidade(s)`}
        </span>
        <span className="shrink-0 font-medium text-gray-900">{brl(total)}</span>
      </div>
    </li>
  );
}

export function AssistantChatPanel({ compact = false }: { compact?: boolean }) {
  const {
    auth, messages, proposal, busy, error, notice,
    sendMessage, confirmProposal, clearFeedback,
  } = useAssistant();
  const [input, setInput] = useState('');
  const historyRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = historyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, busy]);

  async function submitMessage() {
    const value = input.trim();
    if (!value || busy) return;
    const ok = await sendMessage(value);
    if (ok) setInput('');
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void submitMessage();
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      void submitMessage();
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-white text-gray-900">
      <div
        ref={historyRef}
        role="log"
        aria-label="Histórico da conversa"
        aria-live="polite"
        className={`min-h-0 flex-1 overflow-y-auto ${compact ? 'space-y-3 p-3 bg-[#fffdfc]' : 'space-y-4 p-6 bg-[#fffdfc]'}`}
      >
        {auth === 'checking' ? (
          <p className="text-sm text-gray-500">Conectando ao assistente...</p>
        ) : auth === 'guest' ? (
          <div className="rounded-xl border border-[#edd7d9] p-4 text-sm">
            <p className="mb-3">Entre na sua conta para conversar com o assistente.</p>
            <Link href="/login" className="font-semibold text-[#b91e2b] underline">Fazer login</Link>
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="rounded-xl bg-[#fff0f0] p-4 text-sm">
                Olá! Posso pesquisar restaurantes, comparar preços e preparar alterações
                no seu carrinho. Nada será modificado sem sua confirmação.
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id !== undefined ? `db-${message.id}` : `local-${message.clientId}`}
                className={message.role === 'user' ? 'flex justify-end' : 'flex justify-start'}
              >
                <div className={
                  `max-w-[90%] whitespace-pre-wrap break-words rounded-xl p-3 text-sm ` +
                  (message.role === 'user'
                    ? 'market-chat-message-user'
                    : 'market-chat-message-bot')
                }>
                  {message.content}
                </div>
              </div>
            ))}
            {busy && <p role="status" className="text-xs text-gray-500">Processando...</p>}
          </>
        )}
      </div>

      {auth === 'authenticated' && proposal?.status === 'PENDING' && (
        <section aria-label="Proposta pendente" className={`shrink-0 border-t border-[#efd8dc] bg-[#fff6f5] ${compact ? 'max-h-56 overflow-y-auto p-3' : 'max-h-80 overflow-y-auto p-4'}`}>
          <h3 className="font-semibold text-[#481b25]">Proposta aguardando confirmação</h3>
          <ul className="mt-2">
            {proposal.items.map((item) => <ProposalLine key={item.variantId} item={item} />)}
          </ul>
          <div className="mt-2 flex justify-between gap-2 text-sm font-semibold">
            <span>Valor dos itens afetados</span>
            <span>{brl(proposal.subtotal)}</span>
          </div>
          <p className="mt-1 text-xs text-gray-600">
            Este valor não inclui outros itens do carrinho nem taxas de entrega.
            A proposta expira em {new Date(proposal.expiresAt).toLocaleString('pt-BR')}.
          </p>
          <button
            type="button"
            onClick={() => void confirmProposal()}
            disabled={busy}
            className="mt-3 w-full rounded-lg bg-[#be202d] px-3 py-2 text-sm font-semibold text-white hover:bg-[#a81422] disabled:opacity-50"
          >
            {busy ? 'Confirmando...' : 'Confirmar alteração do carrinho'}
          </button>
        </section>
      )}

      <form onSubmit={onSubmit} className={`shrink-0 border-t border-gray-200 ${compact ? 'p-3' : 'p-4'}`}>
        {error && (
          <div role="alert" className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-red-50 p-2 text-xs text-red-800">
            <span>{error}</span>
            <button type="button" aria-label="Fechar erro" onClick={clearFeedback}>×</button>
          </div>
        )}
        {notice && (
          <div role="status" className="mb-2 flex items-start justify-between gap-2 rounded-lg bg-green-50 p-2 text-xs text-green-800">
            <span>{notice} <Link href="/cart" className="underline">Ver carrinho</Link></span>
            <button type="button" aria-label="Fechar aviso" onClick={clearFeedback}>×</button>
          </div>
        )}
        <label htmlFor={compact ? 'assistant-floating-input' : 'assistant-page-input'} className="sr-only">
          Mensagem para o assistente
        </label>
        <textarea
          id={compact ? 'assistant-floating-input' : 'assistant-page-input'}
          value={input}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={onKeyDown}
          disabled={auth !== 'authenticated' || busy}
          maxLength={500}
          rows={compact ? 2 : 3}
          placeholder="Ex.: Adicione duas pizzas grandes..."
          className="w-full resize-none rounded-lg border border-gray-300 bg-white p-2 text-sm text-gray-900 outline-none focus:border-[#c5212c] focus:ring-2 focus:ring-[#ffe4e5] disabled:opacity-50"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-gray-500">{input.length}/500 · Enter para enviar</span>
          <button
            type="submit"
            disabled={auth !== 'authenticated' || busy || !input.trim()}
            className="rounded-lg market-chat-send px-4 py-2 text-sm font-semibold text-white hover:bg-[#a91422] disabled:opacity-50"
          >
            Enviar
          </button>
        </div>
      </form>
    </div>
  );
}
