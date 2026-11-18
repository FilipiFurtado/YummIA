
import { NextResponse } from 'next/server';
import { proxyAuthenticated } from '@/lib/backend';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * Recupera uma conversa anterior do usuário.
 *
 * GET /api/assistant/conversations/:id
 *   -> GET /assistant/conversations/:id
 */
export async function GET(
  request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        message: 'ID da conversa inválido',
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  return proxyAuthenticated(
    request,
    `/assistant/conversations/${id}`,
  );
}
