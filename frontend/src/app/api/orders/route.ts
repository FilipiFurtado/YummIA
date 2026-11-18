import { proxyAuthenticated } from '@/lib/backend';

export async function GET(request: Request) {
  return proxyAuthenticated(
    request,
    '/orders',
  );
}

export async function POST(request: Request) {
  const idempotencyKey =
    request.headers.get('Idempotency-Key') ?? '';

  return proxyAuthenticated(
    request,
    '/orders',
    {
      'Idempotency-Key': idempotencyKey,
    },
  );
}