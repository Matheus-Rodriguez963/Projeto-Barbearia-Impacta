// Leituras que só o servidor faz (o layout e as páginas), repassando o cookie do navegador.

import { cookies } from "next/headers";
import { cache } from "react";

import { URL_DA_API } from "@/lib/api";
import type { UsuarioLogado } from "@/lib/tipos";

// Quem está logado, ou null (sem cookie, cookie vencido, API fora do ar). Com cache() o layout
// e a página leem uma vez só por pedido.
export const lerUsuario = cache(async (): Promise<UsuarioLogado | null> => {
  try {
    const resposta = await fetch(`${URL_DA_API}/api/eu`, {
      headers: { cookie: (await cookies()).toString() },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!resposta.ok) return null;
    return (await resposta.json()) as UsuarioLogado;
  } catch {
    return null;
  }
});
