import { proxyAuthenticated } from '@/lib/backend';

export async function POST(request: Request) {
  return proxyAuthenticated(
    request,
    '/checkout/quote',
  );
}