import { proxyAuthenticated } from '@/lib/backend';

export async function GET(request: Request) {
  return proxyAuthenticated(request, '/cart/me');
}