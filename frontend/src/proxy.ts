// Primeira barreira do site: sem o cookie da sessão, qualquer tela leva pra /login.
// Só confere se o cookie EXISTE; se ele está vencido, quem descobre é o layout (lendo /api/eu).
// Por isso o proxy nunca tira ninguém de /login: senão cookie velho viraria laço de redirecionamento.

import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname !== "/login" && !request.cookies.has("sessao")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // fora: arquivos internos do Next e qualquer arquivo com extensão (favicon, fontes, imagens)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
