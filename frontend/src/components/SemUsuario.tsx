"use client";

// Usado pelo layout quando não achou usuário (cookie velho ou inválido): só a tela de login
// aparece. Qualquer outra tela não é desenhada (nem as páginas que precisam do usuário
// estouram) e a pessoa vai pra /login. Em /login só mostra a tela, então não dá laço.

import { usePathname } from "next/navigation";
import { useEffect } from "react";

export default function SemUsuario({ children }: { children: React.ReactNode }) {
  const caminho = usePathname();
  const noLogin = caminho === "/login";

  useEffect(() => {
    if (!noLogin) window.location.replace("/login");
  }, [noLogin]);

  return noLogin ? children : null;
}
