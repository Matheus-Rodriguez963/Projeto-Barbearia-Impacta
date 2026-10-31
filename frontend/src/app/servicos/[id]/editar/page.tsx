"use client";

// Edição do serviço: busco o serviço pelo id da URL e entrego pro mesmo formulário do cadastro.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import FormularioServico from "@/components/FormularioServico";
import Topo from "@/components/Topo";
import { buscarServico, ErroDaApi } from "@/lib/api";
import type { Servico } from "@/lib/tipos";

export default function PaginaEditarServico() {
  const { id } = useParams<{ id: string }>();

  const [servico, setServico] = useState<Servico | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscarServico(Number(id))
      .then(setServico)
      .catch((problema) =>
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui abrir esse serviço."),
      );
  }, [id]);

  if (erro) {
    return (
      <>
        <Topo migalhas={["Serviços", "Serviço"]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
          <p className="m-0 font-titulo text-2xl text-tinta">{erro}</p>
          <BotaoLink href="/servicos" estilo="principal">
            Voltar ao cardápio
          </BotaoLink>
        </div>
      </>
    );
  }

  if (!servico) {
    return (
      <>
        <Topo migalhas={["Serviços", "Serviço"]} />
        <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
          Carregando o serviço...
        </div>
      </>
    );
  }

  return (
    <>
      <Topo migalhas={["Serviços", servico.nome]} />
      <FormularioServico key={servico.id} servicoExistente={servico} />
    </>
  );
}
