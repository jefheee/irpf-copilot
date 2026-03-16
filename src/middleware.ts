import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(req: NextRequest) {
  const basicAuth = req.headers.get('authorization');
  const url = req.nextUrl;

  // Protege qualquer rota que comece com /admin
  if (url.pathname.startsWith('/admin')) {
    if (basicAuth) {
      const authValue = basicAuth.split(' ')[1];
      const [user, pwd] = atob(authValue).split(':');

      // Defina aqui o seu usuário e senha secretos!
      if (user === 'jefherson' && pwd === 'copilot2026') {
        return NextResponse.next();
      }
    }
    
    // Se não tiver senha ou estiver errada, o navegador abre um pop-up nativo pedindo
    return new NextResponse('Autenticação Necessária', {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Área Restrita do IRPF Copilot"' },
    });
  }
  
  return NextResponse.next();
}