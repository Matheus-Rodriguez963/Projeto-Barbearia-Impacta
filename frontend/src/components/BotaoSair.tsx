"use client";

// Botão que encerra a sessão e volta pra tela de login.

import Botao from "@/components/Botao";
import { sairDoSistema } from "@/lib/api";

export default function BotaoSair({ className = "" }: { className?: string }) {
  return (
    <Botao onClick={sairDoSistema} className={className}>
      Sair
    </Botao>
  );
}
