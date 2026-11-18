'use client';

import Link from 'next/link';
import { ArrowLeft, Bot, ChevronRight, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { AssistantChatPanel } from '@/components/assistant/AssistantChatPanel';
import { useAssistant } from '@/components/assistant/AssistantProvider';

export default function AssistantPage() {
  const { busy, proposal, startNewConversation } = useAssistant();
  function newConversation() {
    if (busy) return;
    if (proposal?.status === 'PENDING' && !window.confirm('A proposta pendente não será aplicada. Iniciar outra conversa?')) return;
    startNewConversation();
  }
  return (
    <main className="market-container pb-16">
      <nav aria-label="Breadcrumb" className="market-breadcrumbs"><Link href="/">Início</Link><ChevronRight size={14} /><span>Assistente IA</span></nav>
      <div className="market-page-header flex flex-wrap items-end justify-between gap-5">
        <div><span className="market-eyebrow inline-flex items-center gap-2"><Sparkles size={14} /> Seu ajudante pessoal</span><h1 className="market-h1 mt-2">Assistente de <span className="text-[#bc1b29]">compras.</span></h1><p className="market-lead mt-2">Encontre produtos, compare opções e prepare alterações no carrinho com sua confirmação.</p></div>
        <div className="flex flex-wrap gap-2">
          <Link href="/cart" className="market-btn market-btn-outline"><ShoppingBag size={17} /> Ver carrinho</Link>
          <button type="button" onClick={newConversation} disabled={busy} className="market-btn market-btn-outline"><Plus size={17} /> Nova conversa</button>
        </div>
      </div>
      <section className="market-chat-shell h-[min(74dvh,790px)] min-h-[440px]">
        <div className="market-chat-red-header flex items-center gap-3 px-5 py-3.5"><span className="grid h-10 w-10 place-items-center rounded-xl bg-white/20"><Bot size={23} /></span><div><p className="text-sm font-extrabold">Assistente YummIA</p><p className="text-[11px] text-white/80">Conversa sincronizada com o chat flutuante</p></div><Link href="/restaurants" className="ml-auto inline-flex gap-1 items-center text-xs font-semibold text-white/90 hover:text-white"><ArrowLeft size={15} /> Restaurantes</Link></div>
        <div className="h-[calc(100%-68px)]"><AssistantChatPanel /></div>
      </section>
      <p className="mt-4 text-xs text-[#8e7a80]">As propostas precisam de confirmação. O assistente não finaliza pedidos nem cobra pagamentos.</p>
    </main>
  );
}
