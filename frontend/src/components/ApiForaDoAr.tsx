"use client";

// Tela cheia pra quando a API não respondeu (fora do ar, ainda subindo, lenta demais).
// Sem menu e sem redirecionar: mandar pro /login aqui só criaria um vai e volta.

import Botao from "@/components/Botao";

export default function ApiForaDoAr() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-5 bg-papel px-6 text-center">
      <p className="m-0 font-texto text-base text-tinta-media">
        Não consegui falar com a API. Ela está rodando na porta 8000?
      </p>
      <Botao onClick={() => window.location.reload()}>Tentar de novo</Botao>
    </div>
  );
}
