import { proxyAuthenticated } from '@/lib/backend';

export async function GET(request: Request) {
  return proxyAuthenticated(
    request,
    '/users/me/addresses',
  );
}

export async function POST(request: Request) {
  return proxyAuthenticated(
    request,
    '/users/me/addresses',
  );
}