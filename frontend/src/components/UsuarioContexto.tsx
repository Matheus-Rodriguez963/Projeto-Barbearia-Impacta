"use client";

// Quem está logado, que o layout leu da API, disponível pra qualquer componente.

import { createContext, useContext } from "react";

import type { UsuarioLogado } from "@/lib/tipos";

const Contexto = createContext<UsuarioLogado | null>(null);

export function ProvedorDeUsuario({ usuario, children }: { usuario: UsuarioLogado; children: React.ReactNode }) {
  return <Contexto.Provider value={usuario}>{children}</Contexto.Provider>;
}

export function useUsuario(): UsuarioLogado {
  const usuario = useContext(Contexto);
  if (!usuario) throw new Error("useUsuario só funciona dentro do ProvedorDeUsuario.");
  return usuario;
}
