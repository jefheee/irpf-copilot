import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function proxy(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  if (url.pathname.startsWith('/admin')) {
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      if (user === 'jefherson' && pwd === 'copilot2026') {
        return NextResponse.next();
      }
    }
    
    return new NextResponse('Autenticação Necessária', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Área Restrita do IRPF Copilot"' },
    });
  }
  
  return NextResponse.next();
}