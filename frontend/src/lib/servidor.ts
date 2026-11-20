// Leituras que só o servidor faz (o layout e as páginas), repassando o cookie do navegador.

import { cookies } from "next/headers";
import { cache } from "react";

import { URL_DA_API } from "@/lib/api";
import type { UsuarioLogado } from "@/lib/tipos";

// Quem está logado; null só quando a API respondeu 401 (sem cookie ou cookie vencido); e
// "api_fora" quando ela não respondeu direito (rede, tempo esgotado, erro 5xx): aí não dá pra
// saber se a pessoa está logada, e mandar pro /login só faria um vai e volta.
// Com cache() o layout e a página leem uma vez só por pedido.
export type LeituraDoUsuario = UsuarioLogado | null | "api_fora";

export const lerUsuario = cache(async (): Promise<LeituraDoUsuario> => {
  try {
    const resposta = await fetch(`${URL_DA_API}/api/eu`, {
      headers: { cookie: (await cookies()).toString() },
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (resposta.status === 401) return null;
    if (!resposta.ok) return "api_fora";
    return (await resposta.json()) as UsuarioLogado;
  } catch {
    return "api_fora";
  }
});
