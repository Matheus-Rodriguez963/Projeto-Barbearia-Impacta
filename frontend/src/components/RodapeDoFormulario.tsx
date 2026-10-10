"use client";

// Rodapé dos formulários: o aviso de erro à esquerda e os botões à direita.
// O "Excluir" só aparece na edição e pede confirmação na própria tela, sem popup do navegador.

import { useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";

interface Props {
  aviso: string;
  salvando: boolean;
  rotuloSalvar: string;
  voltarPara: string; // pra onde o "Cancelar" leva
  onExcluir?: () => void; // sem isso o botão de excluir nem aparece
}

export default function RodapeDoFormulario({ aviso, salvando, rotuloSalvar, voltarPara, onExcluir }: Props) {
  const [confirmando, setConfirmando] = useState(false);

  return (
    <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-mogno/15 bg-papel-claro/70 px-6 py-5 md:px-10">
      <div className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">{aviso}</div>

      <div className="ml-auto flex flex-wrap items-center gap-3.5">
        {onExcluir &&
          (confirmando ? (
            <>
              <span className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">Excluir mesmo?</span>
              <Botao type="button" onClick={() => setConfirmando(false)}>
                Não
              </Botao>
              <Botao
                type="button"
                onClick={onExcluir}
                disabled={salvando}
                className="border-erro text-erro hover:bg-erro/10"
              >
                Sim, excluir
              </Botao>
            </>
          ) : (
            <Botao type="button" onClick={() => setConfirmando(true)} className="border-erro/50 text-erro">
              Excluir
            </Botao>
          ))}

        <BotaoLink href={voltarPara}>Cancelar</BotaoLink>

        <Botao type="submit" estilo="principal" disabled={salvando}>
          {salvando ? "Salvando..." : rotuloSalvar}
        </Botao>
      </div>
    </footer>
  );
}
