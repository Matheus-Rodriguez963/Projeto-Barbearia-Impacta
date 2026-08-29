"use client";

// Tela de edição: busco a ficha na API pelo id da URL e entrego pro mesmo formulário.

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import FormularioCliente from "@/components/FormularioCliente";
import Topo from "@/components/Topo";
import { BotaoLink } from "@/components/Botao";
import { buscarCliente, ErroDaApi } from "@/lib/api";
import type { Cliente } from "@/lib/tipos";

export default function PaginaEditarCliente() {
  const { id } = useParams<{ id: string }>();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    buscarCliente(Number(id))
      .then(setCliente)
      .catch((problema) =>
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui abrir essa ficha."),
      );
  }, [id]);

  if (erro) {
    return (
      <>
        <Topo migalhas={["Clientes", "Ficha"]} />
        <div className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
          <p className="m-0 font-titulo text-2xl text-tinta">{erro}</p>
          <BotaoLink href="/clientes" estilo="principal">
            Voltar para a lista
          </BotaoLink>
        </div>
      </>
    );
  }

  if (!cliente) {
    return (
      <>
        <Topo migalhas={["Clientes", "Ficha"]} />
        <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
          Carregando a ficha...
        </div>
      </>
    );
  }

  return (
    <>
      <Topo migalhas={["Clientes", cliente.nome]} />
      {/* a key força o formulário a recarregar se eu trocar de cliente sem sair da página */}
      <FormularioCliente key={cliente.id} clienteExistente={cliente} />
    </>
  );
}
