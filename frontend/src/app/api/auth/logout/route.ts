import { NextRequest, NextResponse } from 'next/server';

import {
  SESSION_COOKIE,
  validateOrigin,
} from '@/lib/backend';

export async function POST(request: NextRequest) {
  const denied = validateOrigin(request);
  if (denied) return denied;

  const response = NextResponse.json({
    message: 'Sessão local encerrada',
  });

  response.cookies.delete(SESSION_COOKIE);

  return response;
}