"use client";

// A agenda (etapa 3): quem vem, com qual barbeiro, a que horas e pra fazer o quê.
// Dá pra ver um dia ou a semana, filtrar por barbeiro e situação, e fechar o atendimento
// (concluir, cancelar, faltou) direto na linha, sem abrir a ficha.

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import { Seletor } from "@/components/Campo";
import Retrato from "@/components/Retrato";
import Topo from "@/components/Topo";
import { atualizarAgendamento, enderecoDaFoto, ErroDaApi, listarAgendamentos, listarBarbeiros } from "@/lib/api";
import { diaISO, diaPorExtenso, horaCurta, reais } from "@/lib/mascaras";
import {
  CORES_DA_AGENDA,
  STATUS_DO_AGENDAMENTO,
  type Agendamento,
  type Barbeiro,
  type StatusDoAgendamento,
} from "@/lib/tipos";

const MODOS = [
  { chave: "dia", nome: "Dia", dias: 1 },
  { chave: "semana", nome: "7 dias", dias: 7 },
] as const;

type Modo = (typeof MODOS)[number]["chave"];

// "abertos" é o padrão: o que ainda vai acontecer é o que interessa no balcão
const FILTROS = [
  { chave: "abertos", nome: "Agendados", status: ["agendado"] },
  { chave: "feitos", nome: "Concluídos", status: ["concluido"] },
  { chave: "perdidos", nome: "Cancelados e faltas", status: ["cancelado", "faltou"] },
  { chave: "todos", nome: "Todos", status: ["agendado", "concluido", "cancelado", "faltou"] },
] as const;

type ChaveDoFiltro = (typeof FILTROS)[number]["chave"];

const ESTILO_DO_STATUS: Record<StatusDoAgendamento, string> = {
  agendado: "border-latao text-[#8a6a1f]",
  concluido: "border-oliva/60 bg-oliva/10 text-oliva",
  cancelado: "border-mogno/30 text-tinta-fraca line-through",
  faltou: "border-erro/50 text-erro",
};

const classeAlternar = (marcado: boolean) =>
  `-ml-px cursor-pointer border px-3.5 py-2.75 font-rotulo text-[10px] tracking-[0.18em] uppercase first:ml-0 ${
    marcado ? "relative border-terracota bg-terracota text-creme" : "border-mogno/30 text-[#6b563f] hover:text-tinta"
  }`;

const classeAcao =
  "cursor-pointer border px-2.5 py-1.5 font-rotulo text-[9px] tracking-[0.16em] uppercase disabled:cursor-not-allowed disabled:opacity-40";

/** Agrupa a lista (que já vem em ordem de data e hora) por dia. */
function porDia(agendamentos: Agendamento[]): [string, Agendamento[]][] {
  const grupos = new Map<string, Agendamento[]>();
  for (const agendamento of agendamentos) {
    grupos.set(agendamento.data, [...(grupos.get(agendamento.data) ?? []), agendamento]);
  }
  return [...grupos.entries()];
}

function Agenda() {
  // a confirmação do "marcar" manda pra cá com ?data=2026-10-28, já no dia certo
  const parametros = useSearchParams();
  const [dia, setDia] = useState(() => parametros.get("data") ?? diaISO());
  const [modo, setModo] = useState<Modo>("dia");
  const [filtro, setFiltro] = useState<ChaveDoFiltro>("abertos");
  const [barbeiroId, setBarbeiroId] = useState(0); // 0 = todos

  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([]);
  const [equipe, setEquipe] = useState<Barbeiro[]>([]);
  const [carregadoPara, setCarregadoPara] = useState(""); // pra qual período/barbeiro a lista é
  const [erro, setErro] = useState("");
  const [mexendoEm, setMexendoEm] = useState<number | null>(null); // linha que está salvando

  const dias = MODOS.find((m) => m.chave === modo)!.dias;
  const ate = diaISO(dias - 1, new Date(`${dia}T12:00`));

  // enquanto a lista na tela for de outro período (ou outro barbeiro), está carregando
  const consulta = `${dia}|${ate}|${barbeiroId}`;
  const carregando = carregadoPara !== consulta;

  useEffect(() => {
    let valendo = true; // se trocar de dia rápido, ignoro a resposta do dia anterior

    listarAgendamentos({ de: dia, ate, barbeiroId: barbeiroId || undefined })
      .then((resposta) => {
        if (!valendo) return;
        setAgendamentos(resposta.itens);
        setErro("");
      })
      .catch((problema) => {
        if (!valendo) return;
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar a agenda.");
        setAgendamentos([]);
      })
      .finally(() => valendo && setCarregadoPara(consulta));

    return () => {
      valendo = false;
    };
  }, [dia, ate, barbeiroId, consulta]);

  useEffect(() => {
    // no filtro entra a equipe toda, até quem saiu da agenda, porque pode ter histórico
    listarBarbeiros("", 1, 100)
      .then((resposta) => setEquipe(resposta.itens))
      .catch(() => setEquipe([]));
  }, []);

  async function mudarStatus(agendamento: Agendamento, status: StatusDoAgendamento) {
    setMexendoEm(agendamento.id);
    try {
      const atualizado = await atualizarAgendamento(agendamento.id, { status });
      setAgendamentos((lista) => lista.map((a) => (a.id === atualizado.id ? atualizado : a)));
    } catch (problema) {
      setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui mudar a situação.");
    } finally {
      setMexendoEm(null);
    }
  }

  function andar(quantos: number) {
    setDia(diaISO(quantos * dias, new Date(`${dia}T12:00`)));
  }

  const statusDoFiltro: readonly string[] = FILTROS.find((f) => f.chave === filtro)!.status;
  const visiveis = agendamentos.filter((a) => statusDoFiltro.includes(a.status));
  const marcados = agendamentos.filter((a) => a.status === "agendado").length;
  // o que entra no caixa: o que ainda vai acontecer e o que já foi feito
  const previsto = agendamentos
    .filter((a) => a.status === "agendado" || a.status === "concluido")
    .reduce((soma, a) => soma + a.preco, 0);

  return (
    <>
      <Topo
        migalhas={["Agenda", modo === "dia" ? "Dia" : "Semana"]}
        acao={
          <BotaoLink href="/agendamentos/novo" estilo="principal" className="py-2.5">
            Marcar horário
          </BotaoLink>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col px-6 py-8 md:px-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta first-letter:uppercase">
              {modo === "dia" ? diaPorExtenso(dia) : `${diaPorExtenso(dia)} a ${diaPorExtenso(ate).split(", ")[1]}`}
            </h1>
            <p className="m-0 text-sm text-tinta-media">
              {carregando
                ? "Buscando..."
                : `${marcados} ${marcados === 1 ? "horário marcado" : "horários marcados"} · ${reais(previsto)} previstos`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex" role="group" aria-label="Andar na agenda">
              <button type="button" onClick={() => andar(-1)} className={classeAlternar(false)} aria-label="Anterior">
                ‹
              </button>
              <button type="button" onClick={() => setDia(diaISO())} className={classeAlternar(dia === diaISO())}>
                Hoje
              </button>
              <button type="button" onClick={() => andar(1)} className={classeAlternar(false)} aria-label="Próximo">
                ›
              </button>
            </div>

            <input
              type="date"
              aria-label="Escolher o dia"
              value={dia}
              onChange={(e) => e.target.value && setDia(e.target.value)}
              className="border border-mogno/30 bg-papel-claro px-3 py-2 text-[15px] text-tinta-forte outline-none focus:border-terracota"
            />

            <div className="flex" role="group" aria-label="Período">
              {MODOS.map((opcao) => (
                <button
                  key={opcao.chave}
                  type="button"
                  aria-pressed={modo === opcao.chave}
                  onClick={() => setModo(opcao.chave)}
                  className={classeAlternar(modo === opcao.chave)}
                >
                  {opcao.nome}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap" role="group" aria-label="Filtrar por situação">
            {FILTROS.map((opcao) => (
              <button
                key={opcao.chave}
                type="button"
                aria-pressed={filtro === opcao.chave}
                onClick={() => setFiltro(opcao.chave)}
                className={classeAlternar(filtro === opcao.chave)}
              >
                {opcao.nome}
              </button>
            ))}
          </div>

          <div className="w-full sm:w-56">
            <Seletor
              aria-label="Filtrar por barbeiro"
              value={barbeiroId}
              onChange={(e) => setBarbeiroId(Number(e.target.value))}
            >
              <option value={0}>Todos os barbeiros</option>
              {equipe.map((barbeiro) => (
                <option key={barbeiro.id} value={barbeiro.id}>
                  {barbeiro.nome_de_chamada}
                </option>
              ))}
            </Seletor>
          </div>
        </div>

        {erro && (
          <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
            {erro} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto border border-mogno/15 bg-papel-claro">
          <table className="w-full border-collapse text-left">
            <thead className="sticky top-0 z-10 bg-papel-claro">
              <tr className="border-b border-mogno/15">
                {["Horário", "Cliente", "Serviço", "Barbeiro", "Valor", "Situação", ""].map((coluna) => (
                  <th
                    key={coluna}
                    className="px-4 py-3 font-rotulo text-[10px] font-normal tracking-[0.2em] text-rotulo uppercase"
                  >
                    {coluna}
                  </th>
                ))}
              </tr>
            </thead>

            {porDia(visiveis).map(([data, doDia]) => (
              <tbody key={data}>
                {/* na semana, cada dia ganha um título; no modo dia o título já está lá em cima */}
                {modo === "semana" && (
                  <tr className="border-b border-mogno/15 bg-papel/70">
                    <td
                      colSpan={7}
                      className="px-4 py-2 font-rotulo text-[10px] tracking-[0.22em] text-[#9a5a2e] uppercase"
                    >
                      {diaPorExtenso(data)}
                    </td>
                  </tr>
                )}

                {doDia.map((agendamento) => {
                  const cor = CORES_DA_AGENDA.find((c) => c.chave === agendamento.barbeiro.cor_agenda)?.fundo;
                  const situacao = STATUS_DO_AGENDAMENTO.find((s) => s.chave === agendamento.status)!;
                  const aberto = agendamento.status === "agendado";
                  const ocupado = mexendoEm === agendamento.id;

                  return (
                    <tr
                      key={agendamento.id}
                      className={`border-b border-mogno/10 hover:bg-papel/60 ${aberto ? "" : "opacity-70"}`}
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {/* a faixa da cor do barbeiro, igual à da lista da equipe */}
                        <div className="flex items-stretch gap-3">
                          <span className={`w-1 shrink-0 ${cor}`} />
                          <div>
                            <div className="font-titulo text-[19px] leading-tight text-tinta">
                              {horaCurta(agendamento.hora)}
                            </div>
                            <div className="text-[12px] text-tinta-fraca">até {horaCurta(agendamento.hora_fim)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="text-[15px] text-tinta">{agendamento.cliente.nome}</div>
                        <div className="text-[12px] text-tinta-fraca">{agendamento.cliente.telefone_formatado}</div>
                        {agendamento.observacoes && (
                          <div className="mt-0.5 max-w-70 text-[12px] text-tinta-media italic">
                            {agendamento.observacoes}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-[14px] text-tinta-media">
                        {agendamento.servico.nome}
                        <div className="text-[12px] text-tinta-fraca">{agendamento.duracao} min</div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5 text-[14px] whitespace-nowrap text-tinta-media">
                          <Retrato
                            foto={enderecoDaFoto(agendamento.barbeiro.foto_url)}
                            nome={agendamento.barbeiro.nome_de_chamada}
                            className="size-8 p-0.5 text-[11px]"
                          />
                          {agendamento.barbeiro.nome_de_chamada}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-[14px] whitespace-nowrap text-tinta-media">
                        {reais(agendamento.preco)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`border px-2 py-1 font-rotulo text-[9px] tracking-[0.18em] whitespace-nowrap uppercase ${
                            ESTILO_DO_STATUS[agendamento.status]
                          }`}
                        >
                          {situacao.nome}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex justify-end gap-1.5">
                          {aberto && (
                            <>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => mudarStatus(agendamento, "concluido")}
                                className={`${classeAcao} border-oliva/55 text-oliva hover:bg-oliva/10`}
                              >
                                Concluir
                              </button>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => mudarStatus(agendamento, "cancelado")}
                                className={`${classeAcao} border-erro/40 text-erro hover:bg-erro/5`}
                              >
                                Cancelar
                              </button>
                            </>
                          )}
                          <BotaoLink
                            href={`/agendamentos/${agendamento.id}/editar`}
                            className="px-2.5 py-1.5 text-[9px] whitespace-nowrap"
                          >
                            Abrir
                          </BotaoLink>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}

            {!carregando && visiveis.length === 0 && !erro && (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-[15px] text-tinta-media">
                    {agendamentos.length > 0
                      ? "Nada nessa situação. Troque o filtro para ver os outros."
                      : modo === "dia"
                        ? "Nenhum horário marcado nesse dia."
                        : "Nenhum horário marcado nesses 7 dias."}
                  </td>
                </tr>
              </tbody>
            )}
          </table>
        </div>
      </div>
    </>
  );
}

// o useSearchParams precisa de um Suspense em volta, senão o Next reclama no build
export default function PaginaAgenda() {
  return (
    <Suspense>
      <Agenda />
    </Suspense>
  );
}
