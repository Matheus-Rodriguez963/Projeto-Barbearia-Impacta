"use client";

// Histórico de atendimentos: o que já aconteceu na barbearia, mês a mês.
// À esquerda a lista (com filtros); à direita o ranking de serviços e as duplas que mais se repetem.

import { useEffect, useState } from "react";

import BuscaDeCliente, { type ClienteEscolhido } from "@/components/BuscaDeCliente";
import { classeInput } from "@/components/Campo";
import Paginacao from "@/components/Paginacao";
import RankingDeServicos from "@/components/RankingDeServicos";
import Secao from "@/components/Secao";
import Topo from "@/components/Topo";
import { hoje, NOME_DA_SITUACAO, reais } from "@/lib/agenda";
import { ErroDaApi, listarBarbeiros, listarHistorico, resumoDoMes } from "@/lib/api";
import { dataBonita, horaCurta } from "@/lib/mascaras";
import {
  CORES_DA_AGENDA,
  type Barbeiro,
  type FiltroDeSituacao,
  type ListaDeHistorico,
  type ResumoDoMes,
} from "@/lib/tipos";

const POR_PAGINA = 20;

const MESES = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const SITUACOES: { valor: FiltroDeSituacao; nome: string }[] = [
  { valor: "concluido", nome: "Concluídos" },
  { valor: "faltou", nome: "Faltas" },
  { valor: "cancelado", nome: "Cancelados" },
  { valor: "agendado", nome: "Agendados" },
  { valor: "todas", nome: "Todos" },
];

const classeSeta =
  "flex size-7.5 cursor-pointer items-center justify-center border border-mogno/26 text-[15px] text-tinta " +
  "transition-colors hover:border-terracota hover:bg-terracota/5 active:scale-95";

export default function PaginaHistorico() {
  // começa no mês de hoje, mas só no navegador (no servidor o "hoje" seria o do build);
  // guardo ano e mês juntos pra virar o ano sem confusão
  const [mes, setMes] = useState<{ ano: number; numero: number } | null>(null);
  const [barbeiroId, setBarbeiroId] = useState("");
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [situacao, setSituacao] = useState<FiltroDeSituacao>("concluido");
  const [pagina, setPagina] = useState(1);

  const [barbeiros, setBarbeiros] = useState<Barbeiro[]>([]);
  const [lista, setLista] = useState<ListaDeHistorico>({ total: 0, itens: [] });
  const [resumo, setResumo] = useState<ResumoDoMes | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    Promise.resolve().then(() => {
      const [ano, numero] = hoje().split("-").map(Number);
      setMes((atual) => atual ?? { ano, numero });
    });
  }, []);

  useEffect(() => {
    listarBarbeiros("", 1, 100)
      .then((resposta) => setBarbeiros(resposta.itens))
      .catch(() => setBarbeiros([]));
  }, []);

  useEffect(() => {
    if (!mes) return; // ainda não sei qual é o mês de hoje
    let valendo = true;
    const idDoBarbeiro = barbeiroId ? Number(barbeiroId) : undefined;

    // o setCarregando fica dentro da promessa pra não disparar render direto de dentro do efeito
    Promise.resolve()
      .then(() => {
        if (valendo) setCarregando(true);
        return Promise.all([
          listarHistorico(
            mes.ano,
            mes.numero,
            { barbeiroId: idDoBarbeiro, clienteId: cliente?.id, situacao },
            pagina,
            POR_PAGINA,
          ),
          resumoDoMes(mes.ano, mes.numero, idDoBarbeiro),
        ]);
      })
      .then(([historico, numeros]) => {
        if (!valendo) return;
        setLista(historico);
        setResumo(numeros);
        setErro("");
      })
      .catch((problema) => {
        if (!valendo) return;
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar o histórico.");
        setLista({ total: 0, itens: [] });
        setResumo(null);
      })
      .finally(() => {
        if (valendo) setCarregando(false);
      });

    return () => {
      valendo = false;
    };
  }, [mes, barbeiroId, cliente, situacao, pagina]);

  function folhear(quantos: number) {
    if (!mes) return;
    const total = mes.ano * 12 + (mes.numero - 1) + quantos;
    setMes({ ano: Math.floor(total / 12), numero: (total % 12) + 1 });
    setPagina(1);
  }

  const ultimaPagina = Math.max(1, Math.ceil(lista.total / POR_PAGINA));

  return (
    <>
      <Topo migalhas={["Histórico", "Atendimentos"]} />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Histórico</h1>
            <p className="m-0 text-sm text-tinta-media">O que já foi atendido, mês a mês.</p>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" aria-label="Mês anterior" onClick={() => folhear(-1)} className={classeSeta}>
              ‹
            </button>
            <span
              key={mes ? `${mes.ano}-${mes.numero}` : "carregando"}
              className="min-w-40 animate-surgir text-center font-titulo text-[20px] text-tinta capitalize"
            >
              {mes ? `${MESES[mes.numero - 1]} ${mes.ano}` : "—"}
            </span>
            <button type="button" aria-label="Próximo mês" onClick={() => folhear(1)} className={classeSeta}>
              ›
            </button>
          </div>
        </div>

        {erro && (
          <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
            {erro} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
          </div>
        )}

        {/* os números do mês */}
        <div className="mb-6 flex flex-wrap items-end gap-x-10 gap-y-4 border border-mogno/15 bg-papel-claro px-5 py-4">
          {[
            { rotulo: "Atendimentos", valor: resumo ? String(resumo.atendimentos) : "—" },
            { rotulo: "Faturamento", valor: resumo ? reais(resumo.faturamento) : "—" },
            { rotulo: "Ticket médio", valor: resumo ? reais(resumo.ticket_medio) : "—" },
          ].map((numero) => (
            <div key={numero.rotulo}>
              <div className="font-rotulo text-[10px] tracking-[0.2em] text-rotulo uppercase">{numero.rotulo}</div>
              <div className="font-titulo text-[28px] leading-tight text-tinta tabular-nums">{numero.valor}</div>
            </div>
          ))}
          <p className="m-0 pb-1 text-[13px] text-tinta-fraca">
            {resumo
              ? `${resumo.faltas} ${resumo.faltas === 1 ? "falta" : "faltas"} · ${resumo.cancelados} ${
                  resumo.cancelados === 1 ? "cancelado" : "cancelados"
                }`
              : ""}
          </p>
        </div>

        <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            <div className="mb-4 grid items-start gap-3 sm:grid-cols-3">
              <select
                aria-label="Barbeiro"
                value={barbeiroId}
                onChange={(e) => {
                  setBarbeiroId(e.target.value);
                  setPagina(1);
                }}
                className={`${classeInput} cursor-pointer border-mogno/30`}
              >
                <option value="">Todos os barbeiros</option>
                {barbeiros.map((barbeiro) => (
                  <option key={barbeiro.id} value={barbeiro.id}>
                    {barbeiro.nome_de_chamada}
                  </option>
                ))}
              </select>

              <select
                aria-label="Situação"
                value={situacao}
                onChange={(e) => {
                  setSituacao(e.target.value as FiltroDeSituacao);
                  setPagina(1);
                }}
                className={`${classeInput} cursor-pointer border-mogno/30`}
              >
                {SITUACOES.map((opcao) => (
                  <option key={opcao.valor} value={opcao.valor}>
                    {opcao.nome}
                  </option>
                ))}
              </select>

              <BuscaDeCliente
                cliente={cliente}
                onEscolher={(escolhido) => {
                  setCliente(escolhido);
                  setPagina(1);
                }}
              />
            </div>

            <div className={`overflow-x-auto border border-mogno/15 bg-papel-claro ${carregando ? "opacity-70" : ""}`}>
              <table className="w-full border-collapse text-left">
                <thead className="bg-papel-claro">
                  <tr className="border-b border-mogno/15">
                    {["Data", "Cliente", "Barbeiro", "Serviços", "Total", "Situação"].map((coluna) => (
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
                  {lista.itens.map((atendimento) => {
                    const cor = CORES_DA_AGENDA.find((opcao) => opcao.chave === atendimento.barbeiro.cor_agenda)?.fundo;

                    return (
                      <tr key={atendimento.id} className="border-b border-mogno/10 hover:bg-papel/60">
                        <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                          {dataBonita(atendimento.data)}
                          <div className="text-[12px] text-tinta-fraca">{horaCurta(atendimento.inicio)}</div>
                        </td>
                        <td className="px-4 py-3.5 text-[15px] text-tinta">{atendimento.cliente.nome}</td>
                        <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                          <span className="flex items-center gap-2">
                            <span className={`size-2.5 flex-none ${cor}`} />
                            {atendimento.barbeiro.nome_de_chamada}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-[14px] text-tinta-media">
                          {atendimento.servicos.map((servico) => servico.nome).join(", ")}
                        </td>
                        <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta tabular-nums">
                          {reais(atendimento.total)}
                        </td>
                        <td className="px-4 py-3.5 text-[14px] text-tinta-media">
                          {NOME_DA_SITUACAO[atendimento.situacao]}
                        </td>
                      </tr>
                    );
                  })}

                  {!carregando && lista.itens.length === 0 && !erro && (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-[15px] text-tinta-media">
                        {cliente || situacao !== "concluido"
                          ? "Nenhum atendimento com esses filtros nesse mês."
                          : "Nenhum atendimento nesse mês."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <Paginacao pagina={pagina} ultima={ultimaPagina} onMudar={setPagina} />
          </div>

          <aside className="min-w-0">
            <Secao titulo="Mais pedidos" />
            {erro ? (
              <p className="m-0 text-[14px] text-tinta-fraca">—</p>
            ) : (
              <RankingDeServicos servicos={resumo?.servicos ?? []} />
            )}

            <Secao titulo="Cliente e barbeiro" />
            {erro ? (
              <p className="m-0 text-[14px] text-tinta-fraca">—</p>
            ) : resumo && resumo.pares.length > 0 ? (
              <ul className="m-0 flex list-none flex-col p-0">
                {resumo.pares.map((par) => (
                  <li
                    key={`${par.cliente.id}-${par.barbeiro.id}`}
                    className="flex items-baseline justify-between gap-3 border-b border-dashed border-mogno/20 py-2.5 text-[14px]"
                  >
                    <span className="text-tinta">
                      {par.cliente.nome}
                      <span className="text-tinta-fraca"> · {par.barbeiro.nome_de_chamada}</span>
                    </span>
                    <span className="text-tinta-media tabular-nums">{par.atendimentos}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="m-0 text-[14px] text-tinta-fraca">Ainda sem duplas nesse mês.</p>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}
