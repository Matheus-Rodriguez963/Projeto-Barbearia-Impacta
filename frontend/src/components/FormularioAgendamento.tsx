"use client";

// Marcar (e remarcar) um horário — etapa 3.
//
// A ordem da tela é a ordem da conversa no balcão: quem é o cliente, o que ele quer fazer,
// com quem e em que dia. Com barbeiro, serviço e dia escolhidos, a API devolve só os horários
// que cabem (expediente, intervalo e quem já está marcado), então a recepção não tem como
// escolher um horário ocupado.

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import Confirmacao from "@/components/Confirmacao";
import Opcao, { GrupoDeOpcoes } from "@/components/Opcao";
import RodapeDoFormulario from "@/components/RodapeDoFormulario";
import Secao from "@/components/Secao";
import {
  atualizarAgendamento,
  buscarHorariosLivres,
  ErroDaApi,
  excluirAgendamento,
  lerErroDoFormulario,
  listarBarbeiros,
  listarClientes,
  listarServicos,
  marcarHorario,
} from "@/lib/api";
import { dataBonita, diaISO, diaPorExtenso, duracaoBonita, horaCurta, reais } from "@/lib/mascaras";
import {
  CORES_DA_AGENDA,
  STATUS_DO_AGENDAMENTO,
  type Agendamento,
  type Barbeiro,
  type Cliente,
  type Servico,
  type StatusDoAgendamento,
} from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

/** O cliente escolhido: só o que a tela precisa mostrar. */
interface ClienteEscolhido {
  id: number;
  nome: string;
  telefone_formatado: string;
  barbeiro_preferido?: string;
}

interface Formulario {
  cliente: ClienteEscolhido | null;
  servico_id: number | null;
  barbeiro_id: number | null;
  data: string;
  hora: string; // "14:30"
  status: StatusDoAgendamento;
  observacoes: string;
}

function formularioVazio(): Formulario {
  return {
    cliente: null,
    servico_id: null,
    barbeiro_id: null,
    data: diaISO(),
    hora: "",
    status: "agendado",
    observacoes: "",
  };
}

function preencherCom(agendamento: Agendamento): Formulario {
  return {
    cliente: agendamento.cliente,
    servico_id: agendamento.servico.id,
    barbeiro_id: agendamento.barbeiro.id,
    data: agendamento.data,
    hora: horaCurta(agendamento.hora),
    status: agendamento.status,
    observacoes: agendamento.observacoes ?? "",
  };
}

function conferirCampos(dados: Formulario): Record<string, string> {
  const problemas: Record<string, string> = {};
  if (!dados.cliente) problemas.cliente_id = "Escolha o cliente.";
  if (!dados.servico_id) problemas.servico_id = "Escolha o serviço.";
  if (!dados.barbeiro_id) problemas.barbeiro_id = "Escolha o barbeiro.";
  if (!dados.data) problemas.data = "Escolha o dia.";
  if (!dados.hora) problemas.hora = "Escolha um horário livre.";
  return problemas;
}

/** "14:30" + 45 min -> "15:15" */
function somarMinutos(hora: string, minutos: number): string {
  const [h, m] = hora.split(":").map(Number);
  const total = h * 60 + m + minutos;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

export default function FormularioAgendamento({ agendamentoExistente }: { agendamentoExistente?: Agendamento }) {
  const editando = Boolean(agendamentoExistente);
  const navegador = useRouter();

  const { dados, setDados, erros, setErros, aviso, setAviso, mudar, limparErro } = useFormulario(() =>
    agendamentoExistente ? preencherCom(agendamentoExistente) : formularioVazio(),
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Agendamento | null>(null);

  // o que vem da API pra montar as opções
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [equipe, setEquipe] = useState<Barbeiro[]>([]);
  const [livres, setLivres] = useState<{ chave: string; horarios: string[]; motivo: string | null } | null>(null);
  const [rodada, setRodada] = useState(0); // aumenta quando preciso buscar os horários de novo

  // busca de cliente
  const [busca, setBusca] = useState("");
  const [encontrados, setEncontrados] = useState<Cliente[]>([]);

  useEffect(() => {
    listarServicos(true)
      .then((resposta) => setServicos(resposta.itens))
      .catch(() => setAviso("Não consegui carregar os serviços. A API está rodando?"));
    listarBarbeiros("", 1, 100, true)
      .then((resposta) => setEquipe(resposta.itens))
      .catch(() => setEquipe([]));
  }, [setAviso]);

  useEffect(() => {
    if (busca.trim().length < 2) return;
    const relogio = setTimeout(() => {
      listarClientes(busca, 1, 6)
        .then((resposta) => setEncontrados(resposta.itens))
        .catch(() => setEncontrados([]));
    }, 300);
    return () => clearTimeout(relogio);
  }, [busca]);

  // a chave diz pra qual combinação os horários foram buscados; se mudar, os antigos não valem mais
  const chaveDosLivres = `${dados.barbeiro_id}|${dados.servico_id}|${dados.data}|${rodada}`;
  const prontoPraBuscar = Boolean(dados.barbeiro_id && dados.servico_id && dados.data);

  useEffect(() => {
    if (!dados.barbeiro_id || !dados.servico_id || !dados.data) return;
    let valendo = true; // se a pessoa trocar o dia rápido, ignoro a resposta velha

    buscarHorariosLivres(dados.barbeiro_id, dados.servico_id, dados.data, agendamentoExistente?.id)
      .then((resposta) => {
        if (valendo) setLivres({ chave: chaveDosLivres, horarios: resposta.horarios, motivo: resposta.motivo });
      })
      .catch(() => {
        if (valendo) setLivres({ chave: chaveDosLivres, horarios: [], motivo: "Não consegui buscar os horários." });
      });

    return () => {
      valendo = false;
    };
  }, [dados.barbeiro_id, dados.servico_id, dados.data, chaveDosLivres, agendamentoExistente?.id]);

  const horariosNaTela = livres?.chave === chaveDosLivres ? livres : null;

  // na edição, o horário que já estava marcado continua aparecendo mesmo se a API não devolver
  // (um atendimento de ontem, por exemplo, só pra marcar como concluído)
  const original = agendamentoExistente ? preencherCom(agendamentoExistente) : null;
  const mesmoHorarioDeAntes =
    original !== null &&
    original.barbeiro_id === dados.barbeiro_id &&
    original.servico_id === dados.servico_id &&
    original.data === dados.data;
  const opcoesDeHora = [...(horariosNaTela?.horarios ?? [])];
  if (mesmoHorarioDeAntes && original && !opcoesDeHora.includes(original.hora)) {
    opcoesDeHora.push(original.hora);
    opcoesDeHora.sort();
  }
  const horaValida = dados.hora !== "" && opcoesDeHora.includes(dados.hora);

  const servico = servicos.find((s) => s.id === dados.servico_id);
  const barbeiro = equipe.find((b) => b.id === dados.barbeiro_id);
  // o barbeiro do agendamento pode ter saído da equipe ativa; aí uso o que veio no agendamento
  const nomeDoBarbeiro =
    barbeiro?.nome_de_chamada ??
    (agendamentoExistente?.barbeiro.id === dados.barbeiro_id ? agendamentoExistente?.barbeiro.nome_de_chamada : "");
  const duracao = servico?.duracao ?? agendamentoExistente?.duracao ?? 0;

  function escolherCliente(cliente: Cliente) {
    // se o cliente tem barbeiro preferido e ninguém foi escolhido ainda, já deixo marcado
    const preferido = equipe.find((b) => b.nome_de_chamada === cliente.barbeiro_preferido);
    setDados((atual) => ({
      ...atual,
      cliente,
      barbeiro_id: atual.barbeiro_id ?? preferido?.id ?? null,
    }));
    setBusca("");
    setEncontrados([]);
    limparErro("cliente_id");
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    const problemas = conferirCampos(dados);
    if (dados.hora && !horaValida) problemas.hora = "Esse horário não está mais livre. Escolha outro.";
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      setAviso("Faltando: " + Object.values(problemas).join(" "));
      return;
    }

    const envio = {
      barbeiro_id: dados.barbeiro_id!,
      servico_id: dados.servico_id!,
      data: dados.data,
      hora: dados.hora,
      observacoes: dados.observacoes.trim() || null,
    };

    setSalvando(true);
    try {
      const agendamento = agendamentoExistente
        ? await atualizarAgendamento(agendamentoExistente.id, { ...envio, status: dados.status })
        : await marcarHorario({ ...envio, cliente_id: dados.cliente!.id });
      setSalvo(agendamento);
      navegador.refresh();
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
      // alguém pode ter pegado o horário enquanto a tela estava aberta: busco de novo
      setRodada((atual) => atual + 1);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!agendamentoExistente) return;

    setSalvando(true);
    try {
      await excluirAgendamento(agendamentoExistente.id);
      navegador.push(`/agendamentos?data=${agendamentoExistente.data}`);
      navegador.refresh();
    } catch (erro) {
      setAviso(erro instanceof ErroDaApi ? erro.message : "Não consegui excluir esse agendamento.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <Confirmacao
        titulo={editando ? "Agendamento atualizado." : "Horário marcado."}
        acoes={
          <>
            {!editando && (
              <Botao
                onClick={() => {
                  setSalvo(null);
                  setDados(formularioVazio());
                }}
              >
                Marcar outro
              </Botao>
            )}
            <BotaoLink href={`/agendamentos?data=${salvo.data}`} estilo="principal">
              Ver a agenda do dia
            </BotaoLink>
          </>
        }
      >
        <p className="m-0">
          <strong className="font-medium text-tinta">{salvo.cliente.nome}</strong> com{" "}
          <strong className="font-medium text-tinta">{salvo.barbeiro.nome_de_chamada}</strong>,{" "}
          {diaPorExtenso(salvo.data)}, das {horaCurta(salvo.hora)} às {horaCurta(salvo.hora_fim)}.
        </p>
        <p className="m-0">
          {salvo.servico.nome} · {reais(salvo.preco)}
        </p>
      </Confirmacao>
    );
  }

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Agendamento" : "Marcar horário"}
          </h1>
          <p className="mb-7.5 max-w-130 text-sm leading-relaxed text-tinta-media">
            {editando
              ? "Dá pra remarcar (dia, hora, barbeiro ou serviço) ou fechar o atendimento mudando a situação."
              : "Comece pelo cliente. Escolhidos o serviço, o barbeiro e o dia, aparecem só os horários livres."}
          </p>

          {/* ---------------------------------------------------------------- cliente */}
          <Secao titulo="Cliente" />

          <div className="mb-8.5 max-w-130">
            {dados.cliente ? (
              <div className="flex items-center justify-between gap-4 border border-mogno/22 bg-papel-claro px-4 py-3">
                <div>
                  <div className="text-[15px] text-tinta">{dados.cliente.nome}</div>
                  <div className="text-[13px] text-tinta-fraca">{dados.cliente.telefone_formatado}</div>
                </div>
                {!editando && (
                  <Botao
                    type="button"
                    className="px-4 py-2 text-[10px]"
                    onClick={() => mudar("cliente", null, "cliente_id")}
                  >
                    Trocar
                  </Botao>
                )}
              </div>
            ) : (
              <Campo rotulo="Buscar por nome ou telefone" erro={erros.cliente_id}>
                <input
                  type="search"
                  autoComplete="off"
                  placeholder="Digite pelo menos 2 letras ou números"
                  value={busca}
                  onChange={(e) => {
                    setBusca(e.target.value);
                    if (e.target.value.trim().length < 2) setEncontrados([]);
                  }}
                  className={classeInputComErro(Boolean(erros.cliente_id))}
                />
              </Campo>
            )}

            {!dados.cliente && busca.trim().length >= 2 && (
              <ul className="m-0 mt-2 flex list-none flex-col border border-mogno/15 bg-papel-claro p-0">
                {encontrados.map((cliente) => (
                  <li key={cliente.id} className="border-b border-mogno/10 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => escolherCliente(cliente)}
                      className="flex w-full cursor-pointer items-center justify-between gap-4 px-4 py-2.5 text-left hover:bg-papel/60"
                    >
                      <span className="text-[15px] text-tinta">{cliente.nome}</span>
                      <span className="text-[13px] whitespace-nowrap text-tinta-fraca">
                        {cliente.telefone_formatado}
                      </span>
                    </button>
                  </li>
                ))}
                {encontrados.length === 0 && (
                  <li className="px-4 py-3 text-[13px] text-tinta-media">
                    Nenhum cliente com esse nome ou telefone.{" "}
                    <Link href="/clientes/novo" className="text-terracota underline">
                      Cadastrar cliente novo
                    </Link>
                  </li>
                )}
              </ul>
            )}
          </div>

          {/* ---------------------------------------------------------------- serviço e barbeiro */}
          <Secao titulo="Serviço e barbeiro" />

          <div className="mb-8.5 flex flex-col gap-5.5">
            <GrupoDeOpcoes rotulo="Serviço" erro={erros.servico_id}>
              {servicos.map((opcao) => (
                <Opcao
                  key={opcao.id}
                  marcada={dados.servico_id === opcao.id}
                  onClick={() => mudar("servico_id", opcao.id)}
                >
                  {opcao.nome} · {reais(opcao.preco)}
                </Opcao>
              ))}
              {servicos.length === 0 && (
                <span className="text-[13px] text-tinta-media">Nenhum serviço no cardápio.</span>
              )}
            </GrupoDeOpcoes>

            <GrupoDeOpcoes rotulo="Barbeiro" erro={erros.barbeiro_id}>
              {equipe.map((opcao) => {
                const cor = CORES_DA_AGENDA.find((c) => c.chave === opcao.cor_agenda)?.fundo;
                return (
                  <Opcao
                    key={opcao.id}
                    marcada={dados.barbeiro_id === opcao.id}
                    onClick={() => mudar("barbeiro_id", opcao.id)}
                  >
                    <span className={`mr-2 inline-block size-2 align-middle ${cor}`} />
                    {opcao.nome_de_chamada}
                  </Opcao>
                );
              })}
            </GrupoDeOpcoes>
          </div>

          {/* ---------------------------------------------------------------- dia e hora */}
          <Secao titulo="Dia e horário" />

          <div className="mb-8.5 flex flex-col gap-5.5">
            <Campo rotulo="Dia" erro={erros.data} className="max-w-60">
              <input
                type="date"
                min={editando ? undefined : diaISO()}
                value={dados.data}
                onChange={(e) => mudar("data", e.target.value)}
                className={classeInputComErro(Boolean(erros.data))}
              />
            </Campo>

            <div className="flex flex-col gap-2.25">
              <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                Horários livres{servico ? ` · ${duracaoBonita(servico.duracao)} de cadeira` : ""}
              </span>

              {!prontoPraBuscar && (
                <span className="text-[13px] text-tinta-media">Escolha o serviço, o barbeiro e o dia.</span>
              )}
              {prontoPraBuscar && !horariosNaTela && <span className="text-[13px] text-tinta-media">Buscando...</span>}
              {horariosNaTela && opcoesDeHora.length === 0 && (
                <span className="text-[13px] text-tinta-media">{horariosNaTela.motivo}</span>
              )}

              {opcoesDeHora.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {opcoesDeHora.map((hora) => (
                    <Opcao key={hora} marcada={dados.hora === hora} onClick={() => mudar("hora", hora)}>
                      {hora}
                    </Opcao>
                  ))}
                </div>
              )}
              {erros.hora && <span className="text-[12px] text-erro">{erros.hora}</span>}
            </div>
          </div>

          {/* ---------------------------------------------------------------- situação e observação */}
          <Secao titulo={editando ? "Situação" : "Observação"} />

          <div className="mb-8.5 flex flex-col gap-5.5">
            {editando && (
              <GrupoDeOpcoes rotulo="Situação do atendimento" erro={erros.status}>
                {STATUS_DO_AGENDAMENTO.map((opcao) => (
                  <Opcao
                    key={opcao.chave}
                    marcada={dados.status === opcao.chave}
                    onClick={() => mudar("status", opcao.chave)}
                  >
                    {opcao.nome}
                  </Opcao>
                ))}
              </GrupoDeOpcoes>
            )}

            <Campo rotulo="Observação" opcional erro={erros.observacoes} className="max-w-130">
              <textarea
                rows={2}
                maxLength={300}
                placeholder="Quer manter o topete, vem com o filho."
                value={dados.observacoes}
                onChange={(e) => mudar("observacoes", e.target.value)}
                className={`${classeInputComErro(Boolean(erros.observacoes))} resize-y text-[15px] leading-relaxed`}
              />
            </Campo>
          </div>
        </div>

        {/* resumo do que vai ser marcado, enquanto escolhe */}
        <aside className="flex w-full shrink-0 flex-col gap-5.5 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-7.5 py-8.5 lg:w-82.5 lg:border-t-0 lg:border-l">
          <Secao titulo="Resumo" />

          <div className="flex flex-col gap-4 border border-mogno/22 bg-papel-claro px-5 py-5.5">
            <div>
              <div className="font-titulo text-[30px] leading-none text-tinta">
                {horaValida ? dados.hora : "--:--"}
                {horaValida && duracao > 0 && (
                  <span className="text-[18px] text-tinta-media"> – {somarMinutos(dados.hora, duracao)}</span>
                )}
              </div>
              <div className="mt-1.5 font-rotulo text-[9px] tracking-[0.2em] text-[#9a5a2e] uppercase">
                {dados.data ? diaPorExtenso(dados.data) : "Dia não escolhido"}
              </div>
            </div>

            <div className="h-px bg-mogno/14" />

            <dl className="flex flex-col gap-2.75">
              {[
                { rotulo: "Cliente", valor: dados.cliente?.nome ?? "—" },
                { rotulo: "Serviço", valor: servico?.nome ?? agendamentoExistente?.servico.nome ?? "—" },
                { rotulo: "Barbeiro", valor: nomeDoBarbeiro || "—" },
                { rotulo: "Data", valor: dados.data ? dataBonita(dados.data) : "—" },
                {
                  rotulo: "Valor",
                  valor: servico
                    ? reais(servico.preco)
                    : agendamentoExistente
                      ? reais(agendamentoExistente.preco)
                      : "—",
                },
              ].map((linha) => (
                <div key={linha.rotulo} className="flex justify-between gap-3 text-[13px] leading-[normal]">
                  <dt className="text-tinta-fraca">{linha.rotulo}</dt>
                  <dd className="m-0 truncate text-right text-tinta">{linha.valor}</dd>
                </div>
              ))}
            </dl>
          </div>
        </aside>
      </div>

      <RodapeDoFormulario
        aviso={aviso}
        salvando={salvando}
        rotuloSalvar={editando ? "Salvar alterações" : "Marcar horário"}
        voltarPara={agendamentoExistente ? `/agendamentos?data=${agendamentoExistente.data}` : "/agendamentos"}
        onExcluir={editando ? excluir : undefined}
      />
    </form>
  );
}
