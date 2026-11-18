'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bot, Maximize2, MessageCircleMore, Minus, Plus, Sparkles } from 'lucide-react';
import { AssistantChatPanel } from './AssistantChatPanel';
import { useAssistant } from './AssistantProvider';

const MINIMIZED_KEY = 'marketplace_assistant_widget_minimized';

export function AssistantWidget() {
  const pathname = usePathname();
  const { proposal, busy, startNewConversation } = useAssistant();
  const [minimized, setMinimized] = useState(false);

  useEffect(() => {
    try { setMinimized(localStorage.getItem(MINIMIZED_KEY) === '1'); } catch { /* O widget funciona sem storage. */ }
  }, []);

  function updateMinimized(value: boolean) {
    setMinimized(value);
    try { localStorage.setItem(MINIMIZED_KEY, value ? '1' : '0'); } catch { /* opcional */ }
  }

  function newConversation() {
    if (busy) return;
    if (proposal?.status === 'PENDING' && !window.confirm('Há uma proposta aguardando confirmação. Deseja iniciar outra conversa?')) return;
    startNewConversation();
  }

  // Na página /assistant, o mesmo estado está renderizado em tela cheia.
  if (pathname === '/assistant' || pathname?.startsWith('/assistant/')) return null;

  if (minimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 sm:bottom-6 sm:right-6">
        <Link href="/assistant" title="Abrir chat completo" aria-label="Abrir página completa do assistente" className="flex h-12 w-12 items-center justify-center rounded-full border border-[#f3d4d7] bg-white text-[#bc202c] shadow-lg transition hover:bg-[#fff0f0]"><Maximize2 size={19} /></Link>
        <button type="button" onClick={() => updateMinimized(false)} aria-label="Expandir assistente" className="market-widget-launcher flex items-center gap-3 rounded-full px-5 py-3.5 font-bold text-sm transition">
          <MessageCircleMore size={21} /> Assistente IA
          {proposal?.status === 'PENDING' && <span className="h-2.5 w-2.5 rounded-full bg-[#ffe08d]" aria-label="Proposta aguardando confirmação" />}
        </button>
      </div>
    );
  }

  return (
    <aside aria-label="Assistente de compras flutuante" className="market-widget-shell fixed bottom-4 right-4 z-50 flex h-[min(74dvh,650px)] w-[392px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[23px] border bg-white sm:bottom-6 sm:right-6">
      <header className="market-chat-red-header flex shrink-0 items-center justify-between gap-2 px-4 py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/20"><Bot size={23} /></span>
          <div className="min-w-0"><p className="text-[14px] font-extrabold leading-tight">Seu assistente de compras</p><p className="mt-1 flex gap-1 items-center text-[11px] text-white/85"><Sparkles size={12} /> Histórico sincronizado</p></div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button type="button" onClick={newConversation} disabled={busy} title="Nova conversa" aria-label="Nova conversa" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20 disabled:opacity-50"><Plus size={19} /></button>
          <Link href="/assistant" title="Abrir chat completo" aria-label="Abrir chat completo" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Maximize2 size={18} /></Link>
          <button type="button" onClick={() => updateMinimized(true)} title="Minimizar" aria-label="Minimizar assistente" className="grid h-8 w-8 place-items-center rounded-lg hover:bg-white/20"><Minus size={19} /></button>
        </div>
      </header>
      <div className="min-h-0 flex-1"><AssistantChatPanel compact /></div>
    </aside>
  );
}
