import { proxyAuthenticated } from '@/lib/backend';

export async function POST(request: Request) {
  return proxyAuthenticated(
    request,
    '/cart/me/items',
  );
}

export async function DELETE(request: Request) {
  return proxyAuthenticated(
    request,
    '/cart/me/items',
  );
}