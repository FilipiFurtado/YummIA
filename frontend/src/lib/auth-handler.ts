import { NextRequest, NextResponse } from 'next/server';

import {
  backendFetch,
  relayResponse,
  SESSION_COOKIE,
  validateOrigin,
} from './backend';

type AuthResponse = {
  accessToken: string;
  user: {
    id: number;
    name: string;
    email: string;
    role: string;
  };
};

export async function handleAuth(
  request: NextRequest,
  action: 'login' | 'register',
) {
  const denied = validateOrigin(request);
  if (denied) return denied;

  let body: Record<string, unknown>;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: 'JSON inválido' },
      { status: 400 },
    );
  }

  const credentials = {
    email: body.email,
    password: body.password,
    ...(action === 'register' ? { name: body.name } : {}),
  };

  const backendResponse = await backendFetch(
    `/auth/${action}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    },
  );

  if (!backendResponse.ok) {
    return relayResponse(backendResponse);
  }

  const data = (await backendResponse.json()) as AuthResponse;

  if (!data.accessToken) {
    return NextResponse.json(
      { message: 'Resposta inválida do backend' },
      { status: 502 },
    );
  }

  // Tenta recuperar o carrinho de visitante.
  const guestToken =
    typeof body.guestToken === 'string'
      ? body.guestToken
      : null;

  let cartClaimed = false;
  let claimWarning: string | null = null;

  if (guestToken) {
    try {
      const claim = await backendFetch('/cart/me/claim', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${data.accessToken}`,
          'X-Cart-Token': guestToken,
        },
      });

      if (claim.ok) {
        cartClaimed = true;
      } else {
        claimWarning =
          'Login realizado, mas o carrinho não foi transferido.';
      }
    } catch {
      claimWarning =
        'Não foi possível transferir o carrinho.';
    }
  }

  const response = NextResponse.json({
    user: data.user,
    cartClaimed,
    claimWarning,
  });

  // A duração corresponde ao JWT de 30 minutos
  // configurado na etapa anterior.
  response.cookies.set(SESSION_COOKIE, data.accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 30 * 60,
  });

  return response;
}