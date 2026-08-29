"use client";

// Lista de clientes cadastrados, com busca por nome/telefone/CPF.
// Serve pra provar que o que foi cadastrado realmente ficou no PostgreSQL.

import { useCallback, useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import Topo from "@/components/Topo";
import { ErroDaApi, listarClientes } from "@/lib/api";
import { dataBonita } from "@/lib/mascaras";
import type { Cliente } from "@/lib/tipos";

const POR_PAGINA = 8;

export default function PaginaClientes() {
  const [busca, setBusca] = useState("");
  const [pagina, setPagina] = useState(1);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const resposta = await listarClientes(busca, pagina, POR_PAGINA);
      setClientes(resposta.itens);
      setTotal(resposta.total);
      setErro("");
    } catch (problema) {
      setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar a lista.");
      setClientes([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [busca, pagina]);

  useEffect(() => {
    // espero meio segundo depois da última tecla pra não chamar a API a cada letra
    const relogio = setTimeout(carregar, 300);
    return () => clearTimeout(relogio);
  }, [carregar]);

  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <Topo
        migalhas={["Clientes", "Cadastrados"]}
        acao={
          <BotaoLink href="/clientes/novo" estilo="principal" className="py-2.5">
            Novo cadastro
          </BotaoLink>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Clientes</h1>
            <p className="m-0 text-sm text-tinta-media">
              {carregando ? "Buscando..." : `${total} ${total === 1 ? "cliente cadastrado" : "clientes cadastrados"}`}
            </p>
          </div>

          <input
            type="search"
            placeholder="Buscar por nome, telefone ou CPF"
            value={busca}
            onChange={(e) => {
              setBusca(e.target.value);
              setPagina(1); // toda busca nova começa da primeira página
            }}
            className="w-full max-w-85 border border-mogno/30 bg-papel-claro px-3.5 py-2.5 text-[15px] text-tinta-forte outline-none focus:border-terracota focus:shadow-[0_0_0_3px_rgba(201,162,39,.25)]"
          />
        </div>

        {erro && (
          <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
            {erro} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto border border-mogno/15 bg-papel-claro">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 bg-papel-claro">
              <tr className="border-b border-mogno/15">
                {["Cliente", "Telefone", "CPF", "Barbeiro", "Nascimento", ""].map((coluna) => (
                  <th
                    key={coluna}
                    className="px-4 py-3 font-rotulo text-[10px] font-normal tracking-[0.2em] text-rotulo uppercase"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id} className="border-b border-mogno/10 hover:bg-papel/60">
                  <td className="px-4 py-3.5">
                    <div className="text-[15px] text-tinta">{cliente.nome}</div>
                    {cliente.apelido && (
                      <div className="text-[12px] text-tinta-fraca">&ldquo;{cliente.apelido}&rdquo;</div>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-[14px] text-tinta-media">{cliente.telefone_formatado}</td>
                  <td className="px-4 py-3.5 text-[14px] text-tinta-media">{cliente.cpf_formatado}</td>
                  <td className="px-4 py-3.5 text-[14px] text-tinta-media">{cliente.barbeiro_preferido}</td>
                  <td className="px-4 py-3.5 text-[14px] text-tinta-media">
                    {dataBonita(cliente.data_nascimento) || "—"}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <BotaoLink href={`/clientes/${cliente.id}/editar`} className="px-4 py-2 text-[10px]">
                      Abrir ficha
                    </BotaoLink>
                  </td>
                </tr>
              ))}

              {!carregando && clientes.length === 0 && !erro && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[15px] text-tinta-media">
                    {busca
                      ? "Nenhum cliente encontrado com esse termo."
                      : "Nenhum cliente cadastrado ainda. Clique em “Novo cadastro”."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* paginação simples, só com anterior/próxima */}
        {ultimaPagina > 1 && (
          <div className="mt-5 flex items-center justify-end gap-4">
            <button
              type="button"
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={pagina === 1}
              className="cursor-pointer border border-mogno/30 px-4 py-2 font-rotulo text-[10px] tracking-[0.2em] text-tinta-media uppercase disabled:cursor-not-allowed disabled:opacity-40"
            >
              Anterior
            </button>
            <span className="font-rotulo text-[10px] tracking-[0.2em] text-rotulo uppercase">
              Página {pagina} de {ultimaPagina}
            </span>
            <button
              type="button"
              onClick={() => setPagina((p) => Math.min(ultimaPagina, p + 1))}
              disabled={pagina === ultimaPagina}
              className="cursor-pointer border border-mogno/30 px-4 py-2 font-rotulo text-[10px] tracking-[0.2em] text-tinta-media uppercase disabled:cursor-not-allowed disabled:opacity-40"
            >
              Próxima
            </button>
          </div>
        )}
      </div>
    </>
  );
}
