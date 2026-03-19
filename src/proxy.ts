import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// A MUDANÇA ESTÁ AQUI: export function proxy
export function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith('/admin')) {
    const basicAuth = req.headers.get('authorization');
    const url = req.nextUrl;

    // Puxa as credenciais seguras do ambiente
    const adminUser = process.env.ADMIN_USER;
    const adminPass = process.env.ADMIN_PASS;

    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      // Verifica se as variáveis existem e se o login bate
      if (adminUser && adminPass && user === adminUser && pwd === adminPass) {
        return NextResponse.next();
      }
    }
    url.pathname = '/api/auth';
    return new NextResponse('Autenticação Necessária', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Secure Area"' },
    });
  }
  return NextResponse.next();
}