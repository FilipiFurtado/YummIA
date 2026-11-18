import { NextResponse } from 'next/server';

import {
  authenticatedFetch,
  relayResponse,
} from '@/lib/backend';

export async function GET() {
  const response = await authenticatedFetch('/users/me');

  if (!response) {
    return NextResponse.json(
      { message: 'Não autenticado' },
      { status: 401 },
    );
  }

  return relayResponse(response);
}