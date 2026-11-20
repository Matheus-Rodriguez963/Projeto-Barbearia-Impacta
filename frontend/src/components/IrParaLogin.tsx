"use client";

// Usado pelo layout quando não achou usuário (cookie velho ou inválido): em qualquer tela que
// não seja a de login, leva pra /login. Em /login não faz nada, então não dá laço.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function IrParaLogin() {
  const caminho = usePathname();

  useEffect(() => {
    if (caminho !== "/login") window.location.replace("/login");
  }, [caminho]);

  return null;
}
