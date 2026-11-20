"use client";

// A aparência (nome, logo e tema) que o layout leu da API, disponível pra qualquer
// componente. A "prévia" é o que a tela de Aparência mostra enquanto a pessoa ainda
// está escolhendo: vale só na tela, até salvar ou descartar.

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import type { Aparencia } from "@/lib/tipos";

interface ValorDaAparencia {
  aparencia: Aparencia; // já com a prévia por cima, é o que deve ser desenhado
  previa: Partial<Aparencia> | null;
  mostrarPrevia: (previa: Partial<Aparencia> | null) => void;
  atualizar: (aparencia: Aparencia) => void; // depois de salvar, troca a aparência de verdade
}

const Contexto = createContext<ValorDaAparencia | null>(null);

export function ProvedorDeAparencia({ inicial, children }: { inicial: Aparencia; children: React.ReactNode }) {
  const [salva, setSalva] = useState(inicial);
  const [previa, setPrevia] = useState<Partial<Aparencia> | null>(null);

  const aparencia = useMemo(() => ({ ...salva, ...previa }), [salva, previa]);

  // o layout já põe o data-tema no primeiro desenho; aqui só acompanho as mudanças
  // (o Clássico é o padrão do CSS, então fica sem atributo)
  useEffect(() => {
    const html = document.documentElement;
    if (aparencia.tema === "classico") delete html.dataset.tema;
    else html.dataset.tema = aparencia.tema;
  }, [aparencia.tema]);

  const mostrarPrevia = useCallback((nova: Partial<Aparencia> | null) => setPrevia(nova), []);
  const atualizar = useCallback((nova: Aparencia) => {
    setSalva(nova);
    setPrevia(null);
  }, []);

  const valor = useMemo(
    () => ({ aparencia, previa, mostrarPrevia, atualizar }),
    [aparencia, previa, mostrarPrevia, atualizar],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAparencia() {
  const valor = useContext(Contexto);
  if (!valor) throw new Error("useAparencia só funciona dentro do ProvedorDeAparencia.");
  return valor;
}
