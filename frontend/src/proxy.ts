// Primeira barreira do site: sem o cookie da sessão, qualquer tela leva pra /login.
// Só confere se o cookie EXISTE; se ele está vencido, quem descobre é o layout (lendo /api/eu).
// Por isso o proxy nunca tira ninguém de /login: senão cookie velho viraria laço de redirecionamento.

import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // O cookie da sessão é do "localhost" (é onde a API responde); por 127.0.0.1 o login "dava certo"
  // e voltava pro /login sem explicação. Então quem entra por 127.0.0.1 é levado pra localhost.
  // (olho o cabeçalho Host: o nextUrl do Next já normaliza o endereço e não mostra o 127.0.0.1)
  const host = request.headers.get("host") ?? "";
  const [nomeDoHost, porta] = host.split(":");
  if (nomeDoHost === "127.0.0.1") {
    // a porta vem do cabeçalho: só aceito número, pra ninguém montar um endereço de outro site com ela
    const sufixoDaPorta = porta && /^\d+$/.test(porta) ? `:${porta}` : "";
    const destino = new URL(`${pathname}${request.nextUrl.search}`, `http://localhost${sufixoDaPorta}`);
    // Não dá pra usar redirect (307): o Next encurta o Location pra "/agenda" quando acha que é o
    // mesmo site, e o navegador ficaria no 127.0.0.1. O cabeçalho Refresh leva pro endereço inteiro.
    return new Response(null, { status: 200, headers: { Refresh: `0; url=${destino.href}` } });
  }

  if (pathname !== "/login" && !request.cookies.has("sessao")) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // fora: arquivos internos do Next e qualquer arquivo com extensão (favicon, fontes, imagens)
  matcher: ["/((?!_next|.*\\..*).*)"],
};
