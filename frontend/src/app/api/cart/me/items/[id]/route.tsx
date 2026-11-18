import { NextResponse } from 'next/server';
import { proxyAuthenticated } from '@/lib/backend';

type Context = {
  params: Promise<{ id: string }>;
};

async function forward(
  request: Request,
  context: Context,
) {
  const { id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return NextResponse.json(
      { message: 'ID inválido' },
      { status: 400 },
    );
  }

  return proxyAuthenticated(
    request,
    `/cart/me/items/${id}`,
  );
}

// Atualizar a quantidade
export async function PATCH(
  request: Request,
  context: Context,
) {
  return forward(request, context);
}

// Remover um produto
export async function DELETE(
  request: Request,
  context: Context,
) {
  return forward(request, context);
}