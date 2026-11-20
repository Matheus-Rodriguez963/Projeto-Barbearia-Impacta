"use client";

// Se a pessoa digitar o endereço de um menu que não está liberado pra ela, manda pra primeira
// tela que ela pode abrir. A API também barra (403); isto só evita mostrar uma tela quebrada.

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

import { useUsuario } from "@/components/UsuarioContexto";
import { MENUS, primeiroCaminho } from "@/lib/tipos";

export default function GuardaDeMenu() {
  const usuario = useUsuario();
  const caminho = usePathname();
  const roteador = useRouter();

  const dentro = (base: string) => caminho === base || caminho.startsWith(`${base}/`);

  const item = MENUS.find((m) => dentro(m.caminho));
  const proibido =
    (item !== undefined && !usuario.menus.includes(item.menu)) || (dentro("/acessos") && usuario.tipo !== "admin");
  const destino = primeiroCaminho(usuario) ?? "/";

  useEffect(() => {
    if (proibido && caminho !== destino) roteador.replace(destino);
  }, [proibido, caminho, destino, roteador]);

  return null;
}
