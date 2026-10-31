"use client";

// Procurar o cliente pelo telefone (ou nome) na hora de marcar. Saiu de dentro do
// FormularioAgendamento porque a gaveta da agenda também precisa dela.

import Link from "next/link";
import { useEffect, useState } from "react";

import Botao from "@/components/Botao";
import { classeInput } from "@/components/Campo";
import { listarClientes } from "@/lib/api";

export interface ClienteEscolhido {
  id: number;
  nome: string;
  telefone_formatado: string;
}

interface Props {
  cliente: ClienteEscolhido | null;
  onEscolher: (cliente: ClienteEscolhido | null) => void;
  focar?: boolean; // já abre com o cursor no campo
}

export default function BuscaDeCliente({ cliente, onEscolher, focar = false }: Props) {
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<ClienteEscolhido[]>([]);
  const [buscando, setBuscando] = useState(false);

  // procura enquanto digita, esperando a pessoa parar um pouquinho
  useEffect(() => {
    if (busca.trim().length < 2) return;
    const relogio = setTimeout(() => {
      setBuscando(true);
      listarClientes(busca, 1, 5)
        .then((resposta) => setAchados(resposta.itens))
        .catch(() => setAchados([]))
        .finally(() => setBuscando(false));
    }, 300);
    return () => clearTimeout(relogio);
  }, [busca]);

  if (cliente) {
    return (
      <div className="flex animate-surgir items-center justify-between gap-4 border border-terracota bg-papel-claro px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--color-terracota)]">
        <div>
          <div className="text-[16px] font-medium text-tinta">{cliente.nome}</div>
          <div className="text-[13px] text-tinta-fraca">{cliente.telefone_formatado}</div>
        </div>
        <Botao
          type="button"
          className="px-4 py-2 text-[10px]"
          onClick={() => {
            onEscolher(null);
            setBusca("");
            setAchados([]);
          }}
        >
          Trocar
        </Botao>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        type="search"
        autoComplete="off"
        autoFocus={focar}
        placeholder="Telefone ou nome do cliente"
        value={busca}
        onChange={(e) => {
          setBusca(e.target.value);
          if (e.target.value.trim().length < 2) setAchados([]);
        }}
        className={`${classeInput} border-mogno/30`}
      />
      {busca.trim().length >= 2 && !buscando && achados.length === 0 && (
        <p className="m-0 text-[13px] text-tinta-fraca">
          Ninguém com esse telefone ou nome.{" "}
          <Link href="/clientes/novo" className="border-b border-terracota/35 text-terracota">
            Cadastrar cliente
          </Link>
        </p>
      )}
      {achados.map((achado, posicao) => (
        <button
          key={achado.id}
          type="button"
          onClick={() => onEscolher(achado)}
          style={{ animationDelay: `${posicao * 40}ms` }}
          className="flex animate-surgir cursor-pointer items-center justify-between gap-4 border-b border-dashed border-mogno/20 px-1 py-3 text-left transition-colors hover:bg-papel-claro/70"
        >
          <span className="text-[15px] text-tinta">{achado.nome}</span>
          <span className="text-[13px] text-tinta-fraca tabular-nums">{achado.telefone_formatado}</span>
        </button>
      ))}
    </div>
  );
}
