import { next } from '@vercel/functions';

export const config = {
  matcher: ['/api/:path*', '/ws/:path*'],
};

export default function middleware(request) {
  // O navegador fala com o próprio domínio. O encaminhamento ao Render é
  // servidor a servidor; a autorização continua sendo validada pelo backend.
  const headers = new Headers(request.headers);
  headers.delete('origin');
  headers.delete('access-control-request-method');
  headers.delete('access-control-request-headers');
  return next({
    request: { headers },
    headers: { 'Cache-Control': 'no-store', 'Vercel-CDN-Cache-Control': 'no-store' },
  });
}
