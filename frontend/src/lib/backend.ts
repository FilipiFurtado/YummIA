import 'server-only';

import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const SESSION_COOKIE = 'marketplace_session';

const BACKEND_URL =
  process.env.BACKEND_API_URL ?? 'http://127.0.0.1:3000';

// Requisições internas ao NestJS
export async function backendFetch(
  path: string,
  options: RequestInit = {},
) {
  return fetch(`${BACKEND_URL}${path}`, {
    ...options,
    cache: 'no-store',
  });
}

// Requisições que exigem autenticação
export async function authenticatedFetch(
  path: string,
  options: RequestInit = {},
) {
  const token = (await cookies())
    .get(SESSION_COOKIE)?.value;

  if (!token) {
    return null;
  }

  const headers = new Headers(options.headers);

  headers.set('Authorization', `Bearer ${token}`);

  return backendFetch(path, {
    ...options,
    headers,
  });
}

// Repassa a resposta do NestJS ao navegador
export async function relayResponse(response: Response) {
  const body = await response.text();

  return new NextResponse(body || null, {
    status: response.status,
    headers: {
      'Content-Type':
        response.headers.get('Content-Type') ??
        'application/json',
      'Cache-Control': 'no-store',
    },
  });
}

// Proteção básica de origem para operações com cookies
export function validateOrigin(request: Request) {
  const expected = process.env.APP_ORIGIN;
  const received = request.headers.get('origin');

  if (!expected || received !== expected) {
    return NextResponse.json(
      { message: 'Origem não autorizada' },
      { status: 403 },
    );
  }

  return null;
}

// Encaminhamento de operações autenticadas
export async function proxyAuthenticated(
  request: Request,
  path: string,
  extraHeaders: HeadersInit = {},
) {
  if (request.method !== 'GET') {
    const denied = validateOrigin(request);
    if (denied) return denied;
  }

  const headers = new Headers(extraHeaders);

  const body =
    request.method === 'GET'
      ? undefined
      : await request.text();

  if (body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await authenticatedFetch(path, {
    method: request.method,
    headers,
    body,
  });

  if (!response) {
    return NextResponse.json(
      { message: 'Usuário não autenticado' },
      { status: 401 },
    );
  }

  return relayResponse(response);
}