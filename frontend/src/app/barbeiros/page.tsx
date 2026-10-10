"use client";

// Lista da equipe, com busca e o filtro de quem está atendendo.

import { useCallback, useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import Paginacao from "@/components/Paginacao";
import Retrato from "@/components/Retrato";
import Topo from "@/components/Topo";
import { enderecoDaFoto, ErroDaApi, listarBarbeiros } from "@/lib/api";
import { horaCurta } from "@/lib/mascaras";
import { CORES_DA_AGENDA, DIAS_DA_SEMANA, type Barbeiro, type HorarioDoDia } from "@/lib/tipos";

const POR_PAGINA = 8;

// "na agenda" é o padrão porque é quem interessa no dia a dia
const FILTROS = [
  { chave: "ativos", nome: "Na agenda", valor: true },
  { chave: "inativos", nome: "Fora da agenda", valor: false },
  { chave: "todos", nome: "Todos", valor: undefined },
] as const;

type ChaveDoFiltro = (typeof FILTROS)[number]["chave"];

/** ter, qua, qui, sex, sab -> "Ter a Sáb"; dias soltos ficam separados por vírgula. */
function resumirDias(horarios: HorarioDoDia[]): string {
  const posicoes = horarios.map((h) => DIAS_DA_SEMANA.findIndex((dia) => dia.sigla === h.dia)).sort();
  const nomes = posicoes.map((posicao) => DIAS_DA_SEMANA[posicao].nome.slice(0, 3));

  const emSequencia = posicoes.every((posicao, i) => i === 0 || posicao === posicoes[i - 1] + 1);
  if (posicoes.length >= 3 && emSequencia) return `${nomes[0]} a ${nomes[nomes.length - 1]}`;
  return nomes.join(", ");
}

/** Horário mais comum da semana. Se algum dia foge dele, aviso embaixo ("Sáb até 17:00"). */
function resumirHorario(horarios: HorarioDoDia[]): { principal: string; excecoes: string } {
  const faixa = (h: HorarioDoDia) => `${horaCurta(h.entrada)} – ${horaCurta(h.saida)}`;

  const contagem = new Map<string, number>();
  for (const h of horarios) contagem.set(faixa(h), (contagem.get(faixa(h)) ?? 0) + 1);
  const principal = [...contagem.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "—";

  const excecoes = horarios
    .filter((h) => faixa(h) !== principal)
    .map((h) => `${DIAS_DA_SEMANA.find((dia) => dia.sigla === h.dia)?.nome.slice(0, 3)} ${faixa(h)}`)
    .join(" · ");

  return { principal, excecoes };
}

export default function PaginaBarbeiros() {
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<ChaveDoFiltro>("ativos");
  const [pagina, setPagina] = useState(1);
  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [total, setTotal] = useState(0);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const ativo = FILTROS.find((f) => f.chave === filtro)?.valor;
      const resposta = await listarBarbeiros(busca, pagina, POR_PAGINA, ativo);
      setBarbeiros(resposta.itens);
      setTotal(resposta.total);
      setErro("");
    } catch (problema) {
      setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar a equipe.");
      setBarbeiros([]);
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
        migalhas={["Barbeiros", "Equipe"]}
        acao={
          <BotaoLink href="/barbeiros/novo" estilo="principal" className="py-2.5">
            Novo barbeiro
          </BotaoLink>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Barbeiros</h1>
            <p className="m-0 text-sm text-tinta-media">
              {carregando ? "Buscando..." : `${total} ${total === 1 ? "barbeiro" : "barbeiros"} nesta lista`}
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
              placeholder="Buscar por nome ou telefone"
              value={busca}
              onChange={(e) => {
                setBusca(e.target.value);
                setPagina(1);
              }}
              className="w-full min-w-0 flex-1 border border-mogno/30 bg-papel-claro px-3.5 py-2.5 text-[15px] text-tinta-forte outline-none focus:border-terracota focus:shadow-[0_0_0_3px_rgba(201,162,39,.25)] sm:w-75"
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
                {["Barbeiro", "Telefone", "Especialidades", "Dias", "Horário", "Comissão", ""].map((coluna) => (
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
              {barbeiros.map((barbeiro) => {
                const horario = resumirHorario(barbeiro.horarios);
                const cor = CORES_DA_AGENDA.find((opcao) => opcao.chave === barbeiro.cor_agenda)?.fundo;
                const foto = enderecoDaFoto(barbeiro.foto_url);

                return (
                  <tr
                    key={barbeiro.id}
                    className={`border-b border-mogno/10 hover:bg-papel/60 ${barbeiro.ativo ? "" : "opacity-60"}`}
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        {/* miniatura igual à do cartão "como o cliente vê"; a faixa embaixo é a cor na agenda */}
                        <div className="flex shrink-0 flex-col gap-0.5">
                          <Retrato foto={foto} nome={barbeiro.nome_de_chamada} className="size-9.5 p-0.5 text-[13px]" />
                          <span className={`h-0.75 w-full ${cor}`} title="Cor na agenda" />
                        </div>

                        <div>
                          <div className="flex items-center gap-2 text-[15px] text-tinta">
                            {barbeiro.nome}
                            {!barbeiro.ativo && (
                              <span className="border border-mogno/30 px-1.5 py-0.5 font-rotulo text-[8px] tracking-[0.18em] text-tinta-fraca uppercase">
                                Fora da agenda
                              </span>
                            )}
                          </div>
                          {barbeiro.apelido && (
                            <div className="text-[12px] text-tinta-fraca">&ldquo;{barbeiro.apelido}&rdquo;</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                      {barbeiro.telefone_formatado}
                    </td>
                    <td className="max-w-60 px-4 py-3.5 text-[13px] text-tinta-media">
                      {barbeiro.especialidades.join(" · ")}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                      {resumirDias(barbeiro.horarios)}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                      {horario.principal}
                      {horario.excecoes && <div className="text-[12px] text-tinta-fraca">{horario.excecoes}</div>}
                    </td>
                    <td className="px-4 py-3.5 text-[14px] text-tinta-media">{barbeiro.comissao}%</td>
                    <td className="px-4 py-3.5 text-right">
                      <BotaoLink
                        href={`/barbeiros/${barbeiro.id}/editar`}
                        className="px-4 py-2 text-[10px] whitespace-nowrap"
                      >
                        Abrir ficha
                      </BotaoLink>
                    </td>
                  </tr>
                );
              })}

              {!carregando && barbeiros.length === 0 && !erro && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[15px] text-tinta-media">
                    {busca
                      ? "Nenhum barbeiro encontrado com esse termo."
                      : filtro === "inativos"
                        ? "Ninguém fora da agenda — a equipe toda está atendendo."
                        : "Nenhum barbeiro cadastrado ainda. Clique em “Novo barbeiro”."}
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
