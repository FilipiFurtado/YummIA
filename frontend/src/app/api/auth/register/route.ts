import { NextRequest } from 'next/server';
import { handleAuth } from '@/lib/auth-handler';

export async function POST(request: NextRequest) {
  return handleAuth(request, 'register');
}