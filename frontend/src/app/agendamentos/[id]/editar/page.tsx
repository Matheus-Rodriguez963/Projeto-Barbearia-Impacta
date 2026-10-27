"use client";

// Abrir um agendamento: busco pelo id da URL e entrego pro mesmo formulário do "marcar".

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import FormularioAgendamento from "@/components/FormularioAgendamento";
import Topo from "@/components/Topo";
import { buscarAgendamento, ErroDaApi } from "@/lib/api";
import { dataBonita } from "@/lib/mascaras";
import type { Agendamento } from "@/lib/tipos";

export default function PaginaEditarAgendamento() {
  const { id } = useParams<{ id: string }>();

  const [agendamento, setAgendamento] = useState<Agendamento | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscarAgendamento(Number(id))
      .then(setAgendamento)
      .catch((problema) =>
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui abrir esse agendamento."),
      );
  }, [id]);

  if (erro) {
    return (
      <>
        <Topo migalhas={["Agenda", "Agendamento"]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
          <p className="m-0 font-titulo text-2xl text-tinta">{erro}</p>
          <BotaoLink href="/agendamentos" estilo="principal">
            Voltar para a agenda
          </BotaoLink>
        </div>
      </>
    );
  }

  if (!agendamento) {
    return (
      <>
        <Topo migalhas={["Agenda", "Agendamento"]} />
        <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
          Carregando o agendamento...
        </div>
      </>
    );
  }

  return (
    <>
      <Topo migalhas={["Agenda", `${dataBonita(agendamento.data)} · ${agendamento.cliente.nome}`]} />
      <FormularioAgendamento key={agendamento.id} agendamentoExistente={agendamento} />
    </>
  );
}
