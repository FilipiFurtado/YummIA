
import { proxyAuthenticated } from '@/lib/backend';

/**
 * Envia uma mensagem ao assistente de IA.
 *
 * Encaminha:
 * POST /api/assistant/chat (Next.js)
 *   -> POST /assistant/chat (NestJS)
 *
 * O JWT é obtido do cookie HttpOnly pelo proxy.
 */
export async function POST(request: Request) {
  return proxyAuthenticated(
    request,
    '/assistant/chat',
  );
}
