"use client";

// Encerra a sessão e volta pra tela de login.

import Botao from "@/components/Botao";
import { sair } from "@/lib/api";

export default function BotaoSair({ className = "" }: { className?: string }) {
  async function aoClicar() {
    try {
      await sair();
    } finally {
      window.location.replace("/login");
    }
  }

  return (
    <Botao onClick={aoClicar} className={className}>
      Sair
    </Botao>
  );
}
