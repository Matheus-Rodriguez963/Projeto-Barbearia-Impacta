"use client";

// Marcar e remarcar horário (etapa 3). Segui o protótipo agendamento.html, só que do lado
// do balcão: em vez do cliente logado, a recepção procura o cliente pelo telefone primeiro.
//
// Os horários livres vêm da API. Eu poderia calcular aqui com o expediente do barbeiro,
// mas aí teria a regra de choque escrita duas vezes; a API é quem sabe o que está ocupado.

import Link from "next/link";
import { useEffect, useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import BuscaDeCliente, { type ClienteEscolhido } from "@/components/BuscaDeCliente";
import Confirmacao from "@/components/Confirmacao";
import Retrato from "@/components/Retrato";
import {
  dataPorExtenso,
  duracaoBonita,
  emMinutos,
  hhmm,
  hoje,
  partesDaData,
  reais,
  siglaDoDia,
  somarDias,
} from "@/lib/agenda";
import {
  enderecoDaFoto,
  horariosLivres,
  lerErroDoFormulario,
  listarBarbeiros,
  listarServicos,
  marcarAgendamento,
  remarcarAgendamento,
} from "@/lib/api";
import type { Agendamento, Barbeiro, GradeDoDia, Servico } from "@/lib/tipos";

// quantos dias pra frente a tela mostra, igual ao protótipo
const DIAS_NA_TELA = 14;

export interface Preenchimento {
  barbeiro?: number;
  data?: string;
  hora?: string; // "09:30"
}

interface Props {
  agendamentoExistente?: Agendamento; // com isso é remarcação
  inicial?: Preenchimento; // vem da agenda, quando clicam num espaço vazio da grade
}

/** O cabeçalho de cada etapa: "I. Serviço" com o aviso do lado. */
function Etapa({ numero, titulo, nota, erro, children }: {
  numero: string;
  titulo: string;
  nota?: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-11">
      <div className="mb-5 flex items-baseline gap-4 border-b border-mogno/16 pb-3">
        <span className="min-w-7 font-titulo text-[22px] text-latao italic">{numero}.</span>
        <h2 className="m-0 font-titulo text-[26px] font-normal text-tinta">{titulo}</h2>
        {nota && <span className="ml-auto font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">{nota}</span>}
      </div>
      {erro && <p className="-mt-2 mb-4 text-[13px] text-erro">{erro}</p>}
      {children}
    </section>
  );
}

function Vazio({ children }: { children: React.ReactNode }) {
  return (
    <div className="border border-dashed border-mogno/26 p-5.5 text-center text-[14px] leading-relaxed text-tinta-fraca">
      {children}
    </div>
  );
}

export default function FormularioAgendamento({ agendamentoExistente, inicial = {} }: Props) {
  const remarcando = Boolean(agendamentoExistente);

  // o que vem da API uma vez só
  const [cardapio, setCardapio] = useState<Servico[] | null>(null);
  const [equipe, setEquipe] = useState<Barbeiro[]>([]);
  const [primeiroDia, setPrimeiroDia] = useState(""); // hoje, mas só no navegador
  const [erroAoCarregar, setErroAoCarregar] = useState("");

  // as escolhas
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(agendamentoExistente?.cliente ?? null);
  const [servicos, setServicos] = useState<number[]>(
    agendamentoExistente?.servicos.map((s) => s.servico_id) ?? [],
  );
  const [barbeiroId, setBarbeiroId] = useState<number | null>(
    agendamentoExistente?.barbeiro.id ?? inicial.barbeiro ?? null,
  );
  const [data, setData] = useState(agendamentoExistente?.data ?? inicial.data ?? "");
  const [hora, setHora] = useState<string | null>(agendamentoExistente?.inicio.slice(0, 5) ?? inicial.hora ?? null);

  // a grade de horários, guardada com a "chave" do pedido pra eu saber se está atualizada
  const [grade, setGrade] = useState<(GradeDoDia & { chave: string }) | null>(null);

  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Agendamento | null>(null);

  useEffect(() => {
    Promise.all([listarServicos("", 1, 100, true), listarBarbeiros("", 1, 100, true)])
      .then(([listaDeServicos, listaDeBarbeiros]) => {
        setCardapio(listaDeServicos.itens);
        setEquipe(listaDeBarbeiros.itens);
        setPrimeiroDia(hoje());
        setData((atual) => atual || hoje());
      })
      .catch((erro) => setErroAoCarregar(lerErroDoFormulario(erro).aviso));
  }, []);

  const escolhidos = (cardapio ?? []).filter((s) => servicos.includes(s.id));
  const duracao = escolhidos.reduce((soma, s) => soma + s.duracao, 0);
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const barbeiro = equipe.find((b) => b.id === barbeiroId) ?? null;

  // sem serviço marcado ainda, mostro a grade como se fosse meia hora (igual ao protótipo)
  const chaveDaGrade = barbeiroId && data ? `${barbeiroId}|${data}|${duracao || 30}` : "";

  useEffect(() => {
    if (!chaveDaGrade) return;
    let valendo = true; // se a pessoa trocar de dia rápido, ignoro a resposta velha
    const [idDoBarbeiro, dia, minutos] = chaveDaGrade.split("|");
    horariosLivres(Number(idDoBarbeiro), dia, Number(minutos), agendamentoExistente?.id)
      .then((resposta) => valendo && setGrade({ ...resposta, chave: chaveDaGrade }))
      .catch(() => valendo && setGrade({ trabalha: false, entrada: null, saida: null, horarios: [], chave: chaveDaGrade }));
    return () => {
      valendo = false;
    };
  }, [chaveDaGrade, agendamentoExistente?.id]);

  const gradeAtual = grade?.chave === chaveDaGrade ? grade : null;
  // a hora escolhida só vale se ainda estiver livre na grade de agora
  // (trocar o serviço por um mais longo pode fazer ela não caber mais)
  const horaValida =
    hora && gradeAtual?.horarios.some((h) => h.hora.slice(0, 5) === hora && h.livre) ? hora : null;

  function limparErro(campo: string) {
    setErros((atual) => {
      const semEsse = { ...atual };
      delete semEsse[campo];
      return semEsse;
    });
    setAviso("");
  }

  function escolherBarbeiro(id: number) {
    setBarbeiroId(id);
    setHora(null);
    limparErro("barbeiro_id");
    // se ele folga no dia que estava marcado, pulo pro primeiro dia em que ele trabalha
    const escolhido = equipe.find((b) => b.id === id);
    const trabalha = (dia: string) => escolhido?.horarios.some((h) => h.dia === siglaDoDia(dia));
    if (escolhido && data && !trabalha(data)) {
      const proximo = Array.from({ length: DIAS_NA_TELA }, (_, i) => somarDias(primeiroDia, i)).find(trabalha);
      if (proximo) setData(proximo);
    }
  }

  async function confirmar(evento: React.FormEvent) {
    evento.preventDefault();
    if (!cliente || !barbeiroId || !horaValida || servicos.length === 0) return;

    setSalvando(true);
    const pedido = { cliente_id: cliente.id, barbeiro_id: barbeiroId, servicos, data, inicio: horaValida };
    try {
      const agendamento = agendamentoExistente
        ? await remarcarAgendamento(agendamentoExistente.id, pedido)
        : await marcarAgendamento(pedido);
      setSalvo(agendamento);
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
      // alguém pode ter marcado esse horário por outro computador: busco a grade de novo
      setGrade(null);
      setHora(null);
    } finally {
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <Confirmacao
        titulo={remarcando ? "Horário remarcado." : "Cadeira reservada."}
        acoes={
          <>
            {!remarcando && (
              <Botao
                onClick={() => {
                  setSalvo(null);
                  setCliente(null);
                  setServicos([]);
                  setHora(null);
                  setGrade(null);
                }}
              >
                Marcar outro
              </Botao>
            )}
            <BotaoLink href={`/agenda?data=${salvo.data}`} estilo="principal">
              Ver na agenda
            </BotaoLink>
          </>
        }
      >
        <p className="m-0 font-titulo text-[30px] leading-tight text-tinta">
          {salvo.inicio.slice(0, 5)} – {salvo.fim.slice(0, 5)}
        </p>
        <p className="m-0">
          {dataPorExtenso(salvo.data)}, com {salvo.barbeiro.nome_de_chamada}.
          <br />
          {salvo.cliente.nome} · {salvo.servicos.map((s) => s.nome).join(", ")} · {reais(salvo.total)}
        </p>
      </Confirmacao>
    );
  }

  if (erroAoCarregar) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
        <p className="m-0 font-titulo text-2xl text-tinta">{erroAoCarregar}</p>
        <p className="m-0 text-sm text-tinta-media">
          Confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
        </p>
      </div>
    );
  }

  if (!cardapio) {
    return (
      <div className="flex flex-1 items-center justify-center p-10 font-rotulo text-[11px] tracking-[0.2em] text-tinta-media uppercase">
        Carregando...
      </div>
    );
  }

  const dias = Array.from({ length: DIAS_NA_TELA }, (_, i) => somarDias(primeiroDia, i));
  const pronto = Boolean(cliente && barbeiroId && horaValida && servicos.length > 0);
  const turnos = [
    { nome: "Manhã", horarios: gradeAtual?.horarios.filter((h) => emMinutos(h.hora) < 12 * 60) ?? [] },
    { nome: "Tarde", horarios: gradeAtual?.horarios.filter((h) => emMinutos(h.hora) >= 12 * 60) ?? [] },
  ].filter((turno) => turno.horarios.length > 0);

  const falta = (texto: string) => <dd className="m-0 text-right text-[#b49b80] italic">{texto}</dd>;
  const linhas: [string, React.ReactNode][] = [
    ["Cliente", cliente ? <dd className="m-0 text-right">{cliente.nome}</dd> : falta("Escolha o cliente")],
    ["Serviço", escolhidos.length ? <dd className="m-0 text-right">{escolhidos.map((s) => s.nome).join(", ")}</dd> : falta("Escolha um serviço")],
    ["Barbeiro", barbeiro ? <dd className="m-0 text-right">{barbeiro.nome_de_chamada}</dd> : falta("Escolha o barbeiro")],
    ["Dia", data ? <dd className="m-0 text-right">{dataPorExtenso(data)}</dd> : falta("—")],
    [
      "Horário",
      horaValida ? (
        <dd className="m-0 text-right">
          {/* sem serviço ainda não dá pra saber a que horas termina */}
          {duracao ? `${horaValida} – ${hhmm(emMinutos(horaValida) + duracao)}` : horaValida}
        </dd>
      ) : (
        falta("Escolha um horário")
      ),
    ],
    ["Duração", <dd key="d" className="m-0 text-right">{duracao ? duracaoBonita(duracao) : "—"}</dd>],
  ];

  return (
    <form onSubmit={confirmar} className="min-h-0 flex-1 overflow-auto" noValidate>
      <div className="grid grid-cols-1 items-start gap-10 px-6 py-8.5 md:px-10 xl:grid-cols-[minmax(0,1fr)_340px] xl:gap-12">
        <div className="min-w-0">
          <h1 className="mb-8 font-titulo text-[32px] leading-tight text-tinta">
            {remarcando ? "Remarcar horário" : "Novo agendamento"}
          </h1>

          <Etapa numero="I" titulo="Cliente" nota="Busque pelo telefone" erro={erros.cliente_id}>
            <BuscaDeCliente
              cliente={cliente}
              focar={!remarcando}
              onEscolher={(escolhido) => {
                setCliente(escolhido);
                if (escolhido) limparErro("cliente_id");
              }}
            />
          </Etapa>

          <Etapa numero="II" titulo="Serviço" nota="Pode marcar mais de um" erro={erros.servicos}>
            {cardapio.length === 0 ? (
              <Vazio>
                Nenhum serviço no cardápio.{" "}
                <Link href="/servicos/novo" className="text-terracota">Cadastre um serviço</Link> antes de marcar.
              </Vazio>
            ) : (
              <div className="flex flex-col">
                {cardapio.map((servico) => {
                  const marcado = servicos.includes(servico.id);
                  return (
                    <button
                      key={servico.id}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => {
                        setServicos(marcado ? servicos.filter((id) => id !== servico.id) : [...servicos, servico.id]);
                        limparErro("servicos");
                      }}
                      className="grid w-full cursor-pointer grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-4.5 border-b border-dashed border-mogno/20 px-1 py-4 text-left hover:bg-papel-claro/60"
                    >
                      <span
                        className={`relative size-5 border-[1.5px] ${
                          marcado ? "border-terracota bg-terracota" : "border-mogno/26"
                        }`}
                      >
                        {marcado && (
                          <span className="absolute top-0.5 left-1.5 h-2.5 w-1.25 rotate-45 border-r-2 border-b-2 border-creme" />
                        )}
                      </span>
                      <span className="flex min-w-0 flex-col gap-0.75">
                        <b className="text-[16px] font-medium text-tinta">{servico.nome}</b>
                        {servico.descricao && <small className="text-[13px] text-tinta-fraca">{servico.descricao}</small>}
                      </span>
                      <span className="flex flex-col items-end gap-0.75">
                        <b className="font-titulo text-[19px] font-normal text-tinta">{reais(servico.preco)}</b>
                        <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                          {servico.duracao} min
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </Etapa>

          <Etapa numero="III" titulo="Barbeiro" erro={erros.barbeiro_id}>
            {equipe.length === 0 ? (
              <Vazio>Nenhum barbeiro disponível para agendamento.</Vazio>
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(132px,1fr))] gap-3.5">
                {equipe.map((pessoa) => {
                  const marcado = pessoa.id === barbeiroId;
                  return (
                    <button
                      key={pessoa.id}
                      type="button"
                      aria-pressed={marcado}
                      onClick={() => escolherBarbeiro(pessoa.id)}
                      className={`flex cursor-pointer flex-col items-center gap-2.5 border px-2.5 pt-4.5 pb-4 text-center ${
                        marcado
                          ? "border-terracota bg-papel-claro shadow-[inset_0_0_0_1px_var(--color-terracota),0_0_0_3px_rgba(201,162,39,.3)]"
                          : "border-mogno/26 bg-papel-claro/55 hover:border-terracota"
                      }`}
                    >
                      <Retrato
                        foto={enderecoDaFoto(pessoa.foto_url)}
                        nome={pessoa.nome_de_chamada}
                        className="size-16 p-0.75 text-[21px]"
                      />
                      <b className="text-[14px] font-medium text-tinta">{pessoa.nome_de_chamada}</b>
                      <small className="text-[12px] leading-snug text-tinta-fraca">
                        {pessoa.especialidades.slice(0, 2).join(" · ")}
                      </small>
                    </button>
                  );
                })}
              </div>
            )}
          </Etapa>

          <Etapa numero="IV" titulo="Dia e horário" erro={erros.data ?? erros.inicio}>
            <div className="mb-6.5 flex gap-2 overflow-x-auto pb-1.5">
              {dias.map((dia) => {
                const partes = partesDaData(dia);
                const trabalha = !barbeiro || barbeiro.horarios.some((h) => h.dia === siglaDoDia(dia));
                const marcado = dia === data;
                return (
                  <button
                    key={dia}
                    type="button"
                    disabled={!trabalha}
                    aria-pressed={marcado}
                    onClick={() => {
                      setData(dia);
                      setHora(null);
                      limparErro("data");
                      limparErro("inicio");
                    }}
                    className={`flex w-17 flex-none flex-col items-center gap-1 border px-1 pt-3 pb-2.75 ${
                      marcado
                        ? "cursor-pointer border-terracota bg-terracota text-creme"
                        : trabalha
                          ? "cursor-pointer border-mogno/26 bg-papel-claro/55 hover:border-terracota"
                          : "cursor-not-allowed border-dashed border-mogno/26"
                    }`}
                  >
                    <span
                      className={`font-rotulo text-[10px] tracking-[0.18em] uppercase ${marcado ? "" : "text-rotulo"}`}
                    >
                      {partes.semana}
                    </span>
                    <span
                      className={`font-titulo text-[24px] leading-none ${
                        marcado ? "" : trabalha ? "text-tinta" : "text-[#c4b39c]"
                      }`}
                    >
                      {partes.dia}
                    </span>
                    <span
                      className={`font-rotulo text-[9px] tracking-[0.16em] uppercase ${
                        marcado ? "" : trabalha ? "text-tinta-fraca" : "text-[#b49b80]"
                      }`}
                    >
                      {!trabalha ? "Folga" : dia === primeiroDia ? "Hoje" : partes.mes}
                    </span>
                  </button>
                );
              })}
            </div>

            {!barbeiro ? (
              <Vazio>Escolha o barbeiro pra ver os horários.</Vazio>
            ) : !gradeAtual ? (
              <Vazio>Buscando os horários...</Vazio>
            ) : !gradeAtual.trabalha ? (
              <Vazio>{barbeiro.nome_de_chamada} folga nesse dia.</Vazio>
            ) : !gradeAtual.horarios.some((h) => h.livre) ? (
              <Vazio>Dia lotado. Tente outro dia ou outro barbeiro.</Vazio>
            ) : (
              turnos.map((turno) => (
                <div key={turno.nome} className="mb-5">
                  <span className="mb-2.5 block font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                    {turno.nome}
                  </span>
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(78px,1fr))] gap-2">
                    {turno.horarios.map((h) => {
                      const valor = h.hora.slice(0, 5);
                      const marcado = valor === horaValida;
                      return (
                        <button
                          key={valor}
                          type="button"
                          disabled={!h.livre}
                          aria-pressed={marcado}
                          onClick={() => {
                            setHora(valor);
                            limparErro("inicio");
                          }}
                          className={`border px-1 py-2.75 text-[15px] ${
                            marcado
                              ? "cursor-pointer border-oliva bg-oliva text-[#f4eedc]"
                              : h.livre
                                ? "cursor-pointer border-mogno/26 bg-papel-claro/55 text-tinta hover:border-oliva"
                                : "cursor-not-allowed border-transparent text-[#bba88f] line-through"
                          }`}
                        >
                          {valor}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </Etapa>
        </div>

        {/* o resumo na moldura dourada, que fica parado enquanto a página rola */}
        <aside className="moldura-latao sticky top-0 p-2 shadow-[0_24px_50px_rgba(58,20,9,.25)]">
          <div className="border border-[rgba(60,32,6,.4)] bg-papel-claro px-6 pt-6.5 pb-6">
            <h3 className="m-0 mb-1 text-center font-titulo text-[24px] font-normal">
              {remarcando ? "Nova reserva" : "A reserva"}
            </h3>
            <p className="m-0 mb-5 text-center font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
              Barbearia Dom Alfredo
            </p>

            <dl className="m-0 flex flex-col">
              {linhas.map(([rotulo, valor]) => (
                <div
                  key={rotulo}
                  className="flex justify-between gap-3.5 border-t border-dashed border-mogno/18 py-2.75 text-[14px]"
                >
                  <dt className="flex-none text-tinta-fraca">{rotulo}</dt>
                  {valor}
                </div>
              ))}
            </dl>

            <div className="mt-1.5 mb-5 flex items-baseline justify-between border-t-2 border-tinta pt-3.5">
              <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">Total</span>
              <b className="font-titulo text-[28px] font-normal">{reais(total)}</b>
            </div>

            {aviso && <p className="m-0 mb-3.5 text-center text-[13px] leading-snug text-erro">{aviso}</p>}

            <Botao type="submit" estilo="principal" disabled={!pronto || salvando} className="w-full py-4">
              {salvando ? "Salvando..." : remarcando ? "Confirmar remarcação" : "Confirmar horário"}
            </Botao>
            <BotaoLink href={data ? `/agenda?data=${data}` : "/agenda"} className="mt-2.5 w-full py-3">
              Voltar à agenda
            </BotaoLink>
          </div>
        </aside>
      </div>
    </form>
  );
}
