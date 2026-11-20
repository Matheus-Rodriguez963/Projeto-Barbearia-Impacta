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

function mesmaAparencia(a: Aparencia, b: Aparencia) {
  return (
    a.linha_de_cima === b.linha_de_cima &&
    a.nome === b.nome &&
    a.tema === b.tema &&
    a.logo_url === b.logo_url &&
    a.atualizado_em === b.atualizado_em
  );
}

export function ProvedorDeAparencia({ inicial, children }: { inicial: Aparencia; children: React.ReactNode }) {
  const [salva, setSalva] = useState(inicial);
  const [previa, setPrevia] = useState<Partial<Aparencia> | null>(null);

  // A cada router.refresh() o layout relê a aparência no servidor e manda um "inicial" novo
  // (por exemplo, outro computador salvou). Se o valor mudou e ninguém está mexendo na
  // prévia, passo a usar esse. A exceção é o padrão de quando a API não respondeu
  // (atualizado_em null) chegando por cima de uma aparência de verdade já lida: aí fico com
  // a que já tenho. Com a prévia aberta, espero ela sair pra conferir de novo.
  const [ultimoInicial, setUltimoInicial] = useState(inicial);
  if (!previa && !mesmaAparencia(inicial, ultimoInicial)) {
    setUltimoInicial(inicial);
    const eOPadraoDaFalha = inicial.atualizado_em === null && salva.atualizado_em !== null;
    if (!eOPadraoDaFalha) setSalva(inicial);
  }

  const aparencia = useMemo(() => ({ ...salva, ...previa }), [salva, previa]);

  // o layout já põe o data-tema no primeiro desenho; aqui acompanho as mudanças
  // (o Clássico é o padrão do CSS, então fica sem atributo). O "inicial" entra nas
  // dependências porque cada desenho novo do servidor pode regravar o data-tema do <html>
  // com o que ele leu; logo depois eu volto o atributo pro tema que está sendo mostrado.
  useEffect(() => {
    const html = document.documentElement;
    if (aparencia.tema === "classico") delete html.dataset.tema;
    else html.dataset.tema = aparencia.tema;
  }, [aparencia.tema, inicial]);

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
