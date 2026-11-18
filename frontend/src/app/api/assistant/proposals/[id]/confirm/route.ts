
import { NextResponse } from 'next/server';
import { proxyAuthenticated } from '@/lib/backend';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;

/**
 * Confirma uma proposta criada pelo assistente.
 *
 * POST /api/assistant/proposals/:id/confirm
 *   -> POST /assistant/proposals/:id/confirm
 *
 * O NestJS valida os itens, preços, quantidades
 * e o usuário antes de alterar o carrinho.
 */
export async function POST(
  request: Request,
  context: RouteContext,
) {
  const { id } = await context.params;

  if (!UUID_REGEX.test(id)) {
    return NextResponse.json(
      {
        message: 'ID da proposta inválido',
        statusCode: 400,
      },
      { status: 400 },
    );
  }

  return proxyAuthenticated(
    request,
    `/assistant/proposals/${id}/confirm`,
  );
}
