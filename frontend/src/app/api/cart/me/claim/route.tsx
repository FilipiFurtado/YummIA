import { NextResponse } from 'next/server';

import {
  authenticatedFetch,
  relayResponse,
  validateOrigin,
} from '@/lib/backend';

export async function POST(request: Request) {
  const denied = validateOrigin(request);
  if (denied) return denied;

  let guestToken: unknown;

  try {
    const body = await request.json();
    guestToken = body.guestToken;
  } catch {
    return NextResponse.json(
      { message: 'JSON inválido' },
      { status: 400 },
    );
  }

  if (
    typeof guestToken !== 'string' ||
    !/^[0-9a-f]{64}$/i.test(guestToken)
  ) {
    return NextResponse.json(
      { message: 'Token de visitante inválido' },
      { status: 400 },
    );
  }

  const response = await authenticatedFetch(
    '/cart/me/claim',
    {
      method: 'POST',
      headers: {
        'X-Cart-Token': guestToken,
      },
    },
  );

  if (!response) {
    return NextResponse.json(
      { message: 'Não autenticado' },
      { status: 401 },
    );
  }

  return relayResponse(response);
}