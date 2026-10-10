"use client";

// Edição do barbeiro: busco a ficha pelo id da URL e entrego pro mesmo formulário do cadastro.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import FormularioBarbeiro from "@/components/FormularioBarbeiro";
import Topo from "@/components/Topo";
import { buscarBarbeiro, ErroDaApi } from "@/lib/api";
import type { Barbeiro } from "@/lib/tipos";

export default function PaginaEditarBarbeiro() {
  const { id } = useParams<{ id: string }>();

  const [barbeiro, setBarbeiro] = useState<Barbeiro | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscarBarbeiro(Number(id))
      .then(setBarbeiro)
      .catch((problema) =>
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui abrir essa ficha."),
      );
  }, [id]);

  if (erro) {
    return (
      <>
        <Topo migalhas={["Barbeiros", "Ficha"]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
          <p className="m-0 font-titulo text-2xl text-tinta">{erro}</p>
          <BotaoLink href="/barbeiros" estilo="principal">
            Voltar para a equipe
          </BotaoLink>
        </div>
      </>
    );
  }

  if (!barbeiro) {
    return (
      <>
        <Topo migalhas={["Barbeiros", "Ficha"]} />
        <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
          Carregando a ficha...
        </div>
      </>
    );
  }

  return (
    <>
      <Topo migalhas={["Barbeiros", barbeiro.nome]} />
      <FormularioBarbeiro key={barbeiro.id} barbeiroExistente={barbeiro} />
    </>
  );
}
