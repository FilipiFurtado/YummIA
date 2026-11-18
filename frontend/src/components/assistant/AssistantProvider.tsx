'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { broadcastCartChange } from '@/lib/cart-events';

export type AssistantMessage = {
  id?: number;
  clientId?: string;
  role: 'user' | 'assistant';
  content: string;
};

export type AssistantProposalItem = {
  variantId: number;
  productName: string;
  variantName: string;
  restaurantName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  action: 'ADD' | 'SET_QUANTITY';
  currentQuantity: number | null;
  targetQuantity: number | null;
};

export type AssistantProposal = {
  id: string;
  status: string;
  expiresAt: string;
  subtotal: string;
  currency: string;
  items: AssistantProposalItem[];
};

type ChatResponse = {
  answer: string;
  conversationId: string;
  toolsUsed: string[];
  proposal: AssistantProposal | null;
  model: string;
};

type ConversationResponse = {
  conversationId: string;
  messages: AssistantMessage[];
  proposal: AssistantProposal | null;
};

type ConfirmationResponse = {
  message?: string;
  status?: string;
  alreadyConfirmed?: boolean;
};

type AuthState = 'checking' | 'authenticated' | 'guest';

type AssistantContextValue = {
  auth: AuthState;
  conversationId: string | null;
  messages: AssistantMessage[];
  proposal: AssistantProposal | null;
  busy: boolean;
  error: string | null;
  notice: string | null;
  sendMessage: (content: string) => Promise<boolean>;
  confirmProposal: () => Promise<boolean>;
  startNewConversation: () => void;
  refreshConversation: () => Promise<void>;
  clearFeedback: () => void;
};

const AssistantContext = createContext<AssistantContextValue | null>(null);

// Mantém compatibilidade com o ID salvo pelo page.tsx da Etapa 3.3.
// Agora é localStorage para sincronizar abas, em vez de sessionStorage.
const CONVERSATION_KEY = 'marketplace_assistant_conversation';
const SYNC_KEY = 'marketplace_assistant_last_sync';

class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function getApiMessage(data: unknown, fallback: string): string {
  if (typeof data === 'object' && data !== null && 'message' in data) {
    const value = data.message;
    if (typeof value === 'string') return value;
    if (Array.isArray(value)) return value.filter((v): v is string => typeof v === 'string').join(', ');
  }
  return fallback;
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
    credentials: 'same-origin',
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    throw new ApiError(getApiMessage(data, `Erro HTTP ${response.status}`), response.status);
  }
  return data as T;
}

function notifyOtherTabs(): void {
  try {
    localStorage.setItem(SYNC_KEY, `${Date.now()}-${crypto.randomUUID()}`);
  } catch {
    // O chat continua funcionando mesmo se o armazenamento do navegador falhar.
  }
}

export function AssistantProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [auth, setAuth] = useState<AuthState>('checking');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [proposal, setProposal] = useState<AssistantProposal | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const busyRef = useRef(false);
  const loadSeq = useRef(0);
  const sessionSeq = useRef(0);
  const actionEpoch = useRef(0);

  const clearFeedback = useCallback(() => {
    setError(null);
    setNotice(null);
  }, []);

  const resetThread = useCallback((removeStorage: boolean) => {
    loadSeq.current += 1;
    actionEpoch.current += 1;
    setConversationId(null);
    setMessages([]);
    setProposal(null);
    clearFeedback();
    if (removeStorage) {
      try {
        localStorage.removeItem(CONVERSATION_KEY);
        sessionStorage.removeItem(CONVERSATION_KEY);
      } catch {
        // Armazenamento pode estar bloqueado no navegador.
      }
    }
  }, [clearFeedback]);

  const loadConversation = useCallback(async (id: string, allowDuringMutation = false) => {
    if (!id || (busyRef.current && !allowDuringMutation)) return;
    const seq = ++loadSeq.current;

    try {
      const data = await apiJson<ConversationResponse>(
        `/api/assistant/conversations/${encodeURIComponent(id)}`,
      );
      if (seq !== loadSeq.current) return;
      setConversationId(data.conversationId);
      setMessages(data.messages);
      setProposal(data.proposal?.status === 'PENDING' ? data.proposal : null);
    } catch (cause) {
      if (seq !== loadSeq.current) return;
      if (cause instanceof ApiError && (cause.status === 404 || cause.status === 400)) {
        // A conversa pode pertencer a uma sessão anterior.
        resetThread(true);
      } else if (cause instanceof ApiError && cause.status === 401) {
        setAuth('guest');
        resetThread(true);
      } else {
        setError(cause instanceof Error ? cause.message : 'Falha ao recuperar conversa.');
      }
    }
  }, [resetThread]);

  const checkSession = useCallback(async () => {
    const seq = ++sessionSeq.current;
    try {
      const response = await fetch('/api/auth/me', {
        cache: 'no-store',
        credentials: 'same-origin',
      });
      if (seq !== sessionSeq.current) return;

      if (response.status === 401 || response.status === 403) {
        setAuth('guest');
        // Esconde dados da sessão anterior, mas conserva o UUID local
        // para permitir que o mesmo usuário recupere a conversa após login.
        // Outro usuário não terá acesso: o GET do NestJS retorna 404.
        resetThread(false);
        return;
      }
      if (!response.ok) {
        throw new Error('Não foi possível verificar a autenticação.');
      }
      setAuth('authenticated');

      let savedId: string | null = null;
      try {
        savedId = localStorage.getItem(CONVERSATION_KEY);
        if (!savedId) {
          savedId = sessionStorage.getItem(CONVERSATION_KEY);
          if (savedId) localStorage.setItem(CONVERSATION_KEY, savedId);
        }
        sessionStorage.removeItem(CONVERSATION_KEY);
      } catch {
        // Sessão válida: a conversa poderá começar sem histórico local.
      }
      if (savedId) await loadConversation(savedId);
    } catch (cause) {
      if (seq !== sessionSeq.current) return;
      setAuth((current) => current === 'checking' ? 'guest' : current);
      setError(cause instanceof Error ? cause.message : 'Falha de conexão.');
    }
  }, [loadConversation, resetThread]);

  // O Provider permanece montado nas navegações do App Router.
  useEffect(() => {
    void checkSession();
  }, [pathname, checkSession]);

  // Mesmo estado nas abas; sincronização com o PostgreSQL ao voltar à janela.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === CONVERSATION_KEY) {
        if (event.newValue) {
          void loadConversation(event.newValue);
        } else {
          resetThread(false);
        }
      } else if (event.key === SYNC_KEY) {
        const id = localStorage.getItem(CONVERSATION_KEY);
        if (id) void loadConversation(id);
      }
    };
    const onFocus = () => { void checkSession(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkSession();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkSession, loadConversation, resetThread]);

  // Atualiza também mensagens/propostas alteradas em outra sessão/dispositivo
  // quando esta conversa já está selecionada nesta aba.
  useEffect(() => {
    if (auth !== 'authenticated') return;
    const timer = window.setInterval(() => {
      if (document.visibilityState !== 'visible' || busyRef.current) return;
      const id = localStorage.getItem(CONVERSATION_KEY);
      if (id) void loadConversation(id);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [auth, loadConversation]);

  const sendMessage = useCallback(async (content: string): Promise<boolean> => {
    const text = content.trim();
    if (!text || busyRef.current) return false;
    if (auth !== 'authenticated') {
      setError('Entre na sua conta para usar o assistente.');
      return false;
    }

    busyRef.current = true;
    setBusy(true);
    clearFeedback();
    // Invalida consultas GET iniciadas antes desta mutação.
    loadSeq.current += 1;
    const epoch = actionEpoch.current;
    const clientId = crypto.randomUUID();
    setMessages((previous) => [...previous, { clientId, role: 'user', content: text }]);

    try {
      const result = await apiJson<ChatResponse>('/api/assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          ...(conversationId ? { conversationId } : {}),
        }),
      });
      if (epoch !== actionEpoch.current) return false;
      setConversationId(result.conversationId);
      try { localStorage.setItem(CONVERSATION_KEY, result.conversationId); } catch { /* opcional */ }
      setMessages((previous) => [
        ...previous,
        { clientId: crypto.randomUUID(), role: 'assistant', content: result.answer },
      ]);
      setProposal(result.proposal?.status === 'PENDING' ? result.proposal : null);
      // Substitui mensagens otimistas pelos IDs reais do banco.
      await loadConversation(result.conversationId, true);
      notifyOtherTabs();
      return true;
    } catch (cause) {
      setMessages((previous) => previous.filter((m) => m.clientId !== clientId));
      if (cause instanceof ApiError && cause.status === 401) {
        setAuth('guest');
        resetThread(true);
      }
      setError(cause instanceof Error ? cause.message : 'Falha ao enviar mensagem.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [auth, clearFeedback, conversationId, loadConversation, resetThread]);

  const confirmProposal = useCallback(async (): Promise<boolean> => {
    if (!proposal || busyRef.current) return false;
    if (auth !== 'authenticated') return false;

    busyRef.current = true;
    setBusy(true);
    clearFeedback();
    loadSeq.current += 1;
    try {
      const result = await apiJson<ConfirmationResponse>(
        `/api/assistant/proposals/${encodeURIComponent(proposal.id)}/confirm`,
        { method: 'POST' },
      );
      setProposal(null);
      // Atualiza página do carrinho e contador sem recarregar a aplicação.
      broadcastCartChange();
      setNotice(result.alreadyConfirmed
        ? 'Esta proposta já havia sido confirmada.'
        : 'Carrinho atualizado com sucesso.');
      const id = conversationId ?? localStorage.getItem(CONVERSATION_KEY);
      if (id) await loadConversation(id, true);
      notifyOtherTabs();
      return true;
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) {
        setAuth('guest');
        resetThread(true);
      }
      setError(cause instanceof Error ? cause.message : 'Falha ao confirmar proposta.');
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [auth, clearFeedback, conversationId, loadConversation, proposal, resetThread]);

  const startNewConversation = useCallback(() => {
    if (busyRef.current) return;
    resetThread(true);
    notifyOtherTabs();
  }, [resetThread]);

  const refreshConversation = useCallback(async () => {
    if (busyRef.current || auth !== 'authenticated') return;
    const id = localStorage.getItem(CONVERSATION_KEY);
    if (id) await loadConversation(id);
  }, [auth, loadConversation]);

  return (
    <AssistantContext.Provider value={{
      auth, conversationId, messages, proposal, busy, error, notice,
      sendMessage, confirmProposal, startNewConversation,
      refreshConversation, clearFeedback,
    }}>
      {children}
    </AssistantContext.Provider>
  );
}

export function useAssistant(): AssistantContextValue {
  const context = useContext(AssistantContext);
  if (!context) {
    throw new Error('useAssistant deve ser usado dentro de AssistantProvider.');
  }
  return context;
}
