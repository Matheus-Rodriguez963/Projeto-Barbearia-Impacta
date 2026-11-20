"use client";

// Encerra a sessão e volta pra tela de login.

import Botao from "@/components/Botao";
import { sair } from "@/lib/api";

/** Encerra a sessão e leva pra tela de login (o menu lateral usa a mesma). */
export async function sairDoSistema() {
  try {
    await sair();
  } finally {
    window.location.replace("/login");
  }
}

export default function BotaoSair({ className = "" }: { className?: string }) {
  return (
    <Botao onClick={sairDoSistema} className={className}>
      Sair
    </Botao>
  );
}
