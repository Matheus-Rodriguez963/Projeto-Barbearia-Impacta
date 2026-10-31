"use client";

// Remarcação: busco o agendamento pelo id da URL e entrego pro mesmo formulário de marcar.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import FormularioAgendamento from "@/components/FormularioAgendamento";
import Topo from "@/components/Topo";
import { buscarAgendamento, ErroDaApi } from "@/lib/api";
import type { Agendamento } from "@/lib/tipos";

export default function PaginaRemarcar() {
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

  // só "agendado" pode ser remarcado; os outros a API recusa, então nem mostro o formulário
  const fechado = agendamento && agendamento.situacao !== "agendado";

  if (erro || fechado) {
    return (
      <>
        <Topo migalhas={["Agenda", "Remarcar"]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
          <p className="m-0 font-titulo text-2xl text-tinta">
            {erro || "Esse agendamento já foi fechado e não pode mais ser remarcado."}
          </p>
          <BotaoLink href={agendamento ? `/agenda?data=${agendamento.data}` : "/agenda"} estilo="principal">
            Voltar à agenda
          </BotaoLink>
        </div>
      </>
    );
  }

  if (!agendamento) {
    return (
      <>
        <Topo migalhas={["Agenda", "Remarcar"]} />
        <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
          Carregando o agendamento...
        </div>
      </>
    );
  }

  return (
    <>
      <Topo migalhas={["Agenda", "Remarcar", agendamento.cliente.nome]} />
      <FormularioAgendamento key={agendamento.id} agendamentoExistente={agendamento} />
    </>
  );
}
