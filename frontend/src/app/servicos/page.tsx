"use client";

// O cardápio da casa (etapa 3), no mesmo desenho da lista de barbeiros.

import { useCallback, useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import Paginacao from "@/components/Paginacao";
import Topo from "@/components/Topo";
import { duracaoBonita, reais } from "@/lib/agenda";
import { ErroDaApi, listarServicos } from "@/lib/api";
import type { Servico } from "@/lib/tipos";

const POR_PAGINA = 10;

const FILTROS = [
  { chave: "ativos", nome: "No cardápio", valor: true },
  { chave: "inativos", nome: "Fora do cardápio", valor: false },
  { chave: "todos", nome: "Todos", valor: undefined },
] as const;

type ChaveDoFiltro = (typeof FILTROS)[number]["chave"];

export default function PaginaServicos() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<ChaveDoFiltro>("ativos");
  const [pagina, setPagina] = useState(1);
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const ativo = FILTROS.find((f) => f.chave === filtro)?.valor;
      const resposta = await listarServicos(busca, pagina, POR_PAGINA, ativo);
      setServicos(resposta.itens);
      setTotal(resposta.total);
      setErro("");
    } catch (problema) {
      setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar os serviços.");
      setServicos([]);
      setTotal(0);
    } finally {
      setCarregando(false);
    }
  }, [busca, filtro, pagina]);

  useEffect(() => {
    const relogio = setTimeout(carregar, 300);
    return () => clearTimeout(relogio);
  }, [carregar]);

  const ultimaPagina = Math.max(1, Math.ceil(total / POR_PAGINA));

  return (
    <>
      <Topo
        migalhas={["Serviços", "Cardápio"]}
        acao={
          <BotaoLink href="/servicos/novo" estilo="principal" className="py-2.5">
            Novo serviço
          </BotaoLink>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Serviços</h1>
            <p className="m-0 max-w-140 text-sm text-tinta-media">
              {carregando
                ? "Buscando..."
                : "A duração é o tempo de cadeira de cada serviço; a limpeza depois do cliente é o intervalo de cada barbeiro."}
            </p>
          </div>

          <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <div className="flex" role="group" aria-label="Filtrar por situação">
              {FILTROS.map((opcao) => {
                const marcado = filtro === opcao.chave;
                return (
                  <button
                    key={opcao.chave}
                    type="button"
                    aria-pressed={marcado}
                    onClick={() => {
                      setFiltro(opcao.chave);
                      setPagina(1);
                    }}
                    className={`-ml-px cursor-pointer border px-3.5 py-2.75 font-rotulo text-[10px] tracking-[0.18em] uppercase first:ml-0 ${
                      marcado
                        ? "relative border-terracota bg-terracota text-creme"
                        : "border-mogno/30 text-[#6b563f] hover:text-tinta"
                    }`}
                  >
                    {opcao.nome}
                  </button>
                );
              })}
            </div>

            <input
              type="search"
              placeholder="Buscar pelo nome"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="w-full min-w-0 flex-1 border border-mogno/30 bg-papel-claro px-3.5 py-2.5 text-[15px] text-tinta-forte outline-none focus:border-terracota focus:shadow-[0_0_0_3px_rgba(201,162,39,.25)] sm:w-65"
            />
          </div>
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
                {["Serviço", "Duração", "Preço", ""].map((coluna, indice) => (
                  <th
                    key={coluna || indice}
                    className={`px-4 py-3 font-rotulo text-[10px] font-normal tracking-[0.2em] text-rotulo uppercase ${
                      indice === 1 || indice === 2 ? "text-right" : ""
                    }`}
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {servicos.map((servico) => (
                <tr
                  key={servico.id}
                  className={`border-b border-mogno/10 hover:bg-papel/60 ${servico.ativo ? "" : "opacity-60"}`}
                >
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2 text-[15px] text-tinta">
                      {servico.nome}
                      {!servico.ativo && (
                        <span className="border border-mogno/30 px-1.5 py-0.5 font-rotulo text-[8px] tracking-[0.18em] text-tinta-fraca uppercase">
                          Fora do cardápio
                        </span>
                      )}
                    </div>
                    {servico.descricao && <div className="text-[12px] text-tinta-fraca">{servico.descricao}</div>}
                  </td>
                  <td className="px-4 py-3.5 text-right text-[14px] whitespace-nowrap text-tinta-media tabular-nums">
                    {duracaoBonita(servico.duracao)}
                  </td>
                  <td className="px-4 py-3.5 text-right font-titulo text-[17px] whitespace-nowrap text-tinta tabular-nums">
                    {reais(servico.preco)}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <BotaoLink href={`/servicos/${servico.id}/editar`} className="px-4 py-2 text-[10px] whitespace-nowrap">
                      Editar
                    </BotaoLink>
                  </td>
                </tr>
              ))}

              {!carregando && servicos.length === 0 && !erro && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-[15px] text-tinta-media">
                    {busca
                      ? "Nenhum serviço com esse nome."
                      : filtro === "inativos"
                        ? "Nenhum serviço fora do cardápio."
                        : "Nenhum serviço cadastrado ainda. Clique em “Novo serviço”."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <Paginacao pagina={pagina} ultima={ultimaPagina} onMudar={setPagina} />
      </div>
    </>
  );
}
