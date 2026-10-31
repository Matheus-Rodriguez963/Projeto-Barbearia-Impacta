"use client";

// A agenda do balcão (etapa 3): um dia por vez, um barbeiro por coluna, como no
// protótipo agenda.html. Clicar num cliente abre o detalhe na direita. Passando o mouse
// num espaço vazio aparece o "fantasma" com a hora, e clicando nele a gaveta de marcar
// abre ali mesmo, sem sair da agenda. Pra remarcar, é só arrastar o cliente pra outro
// horário ou pra coluna de outro barbeiro.
//
// Do protótipo eu deixei de fora o bloqueio de horário, o encaixe e o caixa: ainda não
// existem no sistema, e botão que não faz nada só confunde.

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import CalendarioDaAgenda from "@/components/CalendarioDaAgenda";
import GavetaDeAgendamento, { type LugarNaAgenda } from "@/components/GavetaDeAgendamento";
import Retrato from "@/components/Retrato";
import Secao from "@/components/Secao";
import {
  almocoNoDia,
  dataPorExtenso,
  duracaoBonita,
  emMinutos,
  hhmm,
  hoje,
  NOME_DA_SITUACAO,
  reais,
  siglaDoDia,
  somarDias,
} from "@/lib/agenda";
import {
  agendaDoDia,
  enderecoDaFoto,
  ErroDaApi,
  lerErroDoFormulario,
  listarBarbeiros,
  listarServicos,
  mudarSituacao,
  remarcarAgendamento,
} from "@/lib/api";
import type { Agendamento, Barbeiro, CorDaAgenda, Servico, Situacao } from "@/lib/tipos";

// 1,5 px por minuto = 90 px por hora, a mesma medida das linhas do protótipo
const PX = 1.5;

// o fantasma anda de 15 em 15 minutos, que é a linha fraquinha da grade
const PASSO_DO_FANTASMA = 15;

interface Coluna {
  id: number;
  nome: string;
  cor: CorDaAgenda;
  foto: string | null;
  entrada: number | null; // em minutos; null = não trabalha hoje (mas tem cliente marcado)
  saida: number | null;
  intervalo: number;
  almoco: [number, number] | null; // em minutos, já conferido se vale nesse dia
}

/** As cores do barbeiro saem das variáveis do Tailwind; o fundo é a mesma cor bem clarinha. */
function coresDo(cor: CorDaAgenda) {
  const forte = `var(--color-${cor})`;
  return {
    forte,
    clara: `color-mix(in srgb, ${forte} 16%, var(--color-papel-claro))`,
  };
}

function naoEscutaNada() {
  return () => {};
}

function semData() {
  return "";
}

/** Os minutos de agora, atualizados a cada minuto pra linha vermelha andar sozinha. */
function useMinutoAtual() {
  const [minuto, setMinuto] = useState<number | null>(null);
  useEffect(() => {
    const atualizar = () => {
      const agora = new Date();
      setMinuto(agora.getHours() * 60 + agora.getMinutes());
    };
    atualizar();
    const relogio = setInterval(atualizar, 60_000);
    return () => clearInterval(relogio);
  }, []);
  return minuto;
}

export default function AgendaDoDia({ dataInicial }: { dataInicial?: string }) {
  const navegador = useRouter();
  const minutoAtual = useMinutoAtual();

  // "hoje" só no navegador: no servidor ficaria a data de quando a página foi montada
  // (mesmo truque do Topo.tsx)
  const diaDeHoje = useSyncExternalStore(naoEscutaNada, hoje, semData);
  const [dataEscolhida, setDataEscolhida] = useState(dataInicial ?? "");
  const data = dataEscolhida || diaDeHoje;

  const [equipe, setEquipe] = useState<Barbeiro[]>([]);
  // guardo a agenda junto com o dia a que ela pertence: se a resposta for de outro dia,
  // é porque ainda está carregando o novo
  const [dia, setDia] = useState<{
    data: string;
    agendamentos: Agendamento[];
    erro: string;
  } | null>(null);
  const [selecionadoId, setSelecionadoId] = useState<number | null>(null);
  const [cardapio, setCardapio] = useState<Servico[]>([]);

  // onde o mouse está (o fantasma), onde clicaram (a gaveta) e o aviso flutuante
  const [fantasma, setFantasma] = useState<{
    colunaId: number;
    minuto: number;
  } | null>(null);
  const [lugar, setLugar] = useState<LugarNaAgenda | null>(null);
  const [recado, setRecado] = useState<{ texto: string; id: number; erro?: boolean } | null>(null);
  const [recemMarcado, setRecemMarcado] = useState<number | null>(null);
  // sobe toda vez que a agenda muda, pro calendário buscar as barrinhas de novo
  const [versao, setVersao] = useState(0);

  // arrastar pra remarcar: a prévia é o que aparece na tela; os refs guardam o que o
  // mouse está fazendo sem redesenhar a tela a cada pixel
  const [previa, setPrevia] = useState<{ id: number; colunaId: number; minuto: number; cabe: boolean } | null>(null);
  const [salvandoId, setSalvandoId] = useState<number | null>(null);
  const colunasNaTela = useRef(new Map<number, HTMLDivElement>());
  const arrastando = useRef<{
    agendamento: Agendamento;
    x: number;
    y: number;
    deslocamento: number; // em que ponto do bloco a pessoa pegou, em minutos
    movendo: boolean;
  } | null>(null);
  const previaAtual = useRef<typeof previa>(null);
  const acabouDeArrastar = useRef(false);
  // cada recado ganha um número novo, pra animação de entrada rodar mesmo se o texto repetir
  const numeroDoRecado = useRef(0);

  useEffect(() => {
    listarBarbeiros("", 1, 100, true)
      .then((resposta) => setEquipe(resposta.itens))
      .catch(() => setEquipe([]));
    listarServicos("", 1, 100, true)
      .then((resposta) => setCardapio(resposta.itens))
      .catch(() => setCardapio([]));
  }, []);

  // o recado some sozinho depois de uns segundos
  useEffect(() => {
    if (!recado) return;
    const relogio = setTimeout(() => setRecado(null), 3200);
    return () => clearTimeout(relogio);
  }, [recado]);

  useEffect(() => {
    if (!data) return;
    let valendo = true; // clicando rápido no ›, ignoro a resposta do dia que já passou
    agendaDoDia(data)
      .then((lista) => valendo && setDia({ data, agendamentos: lista, erro: "" }))
      .catch(
        (problema) =>
          valendo &&
          setDia({
            data,
            agendamentos: [],
            erro: problema instanceof ErroDaApi ? problema.message : "Não consegui carregar a agenda.",
          }),
      );
    return () => {
      valendo = false;
    };
  }, [data]);

  const carregando = dia?.data !== data;
  const agendamentos = carregando ? [] : dia.agendamentos;
  const erro = carregando ? "" : dia.erro;

  function irPara(novaData: string) {
    setDataEscolhida(novaData);
    setSelecionadoId(null);
    // deixo a data no endereço: se der F5 ou voltar da tela de marcar, cai no mesmo dia
    navegador.replace(`/agenda?data=${novaData}`, { scroll: false });
  }

  // cancelado sai da grade: o horário dele já está livre de novo
  const naGrade = agendamentos.filter((a) => a.situacao !== "cancelado");
  const selecionado = agendamentos.find((a) => a.id === selecionadoId) ?? null;

  // as colunas: quem trabalha hoje e, junto, quem tem cliente marcado mesmo sem trabalhar
  // (barbeiro que foi desligado depois de marcar, por exemplo — o cliente não pode sumir)
  const sigla = data ? siglaDoDia(data) : null;
  const colunas: Coluna[] = equipe
    .map((barbeiro) => {
      const expediente = barbeiro.horarios.find((h) => h.dia === sigla);
      return {
        id: barbeiro.id,
        nome: barbeiro.nome_de_chamada,
        cor: barbeiro.cor_agenda,
        foto: enderecoDaFoto(barbeiro.foto_url),
        entrada: expediente ? emMinutos(expediente.entrada) : null,
        saida: expediente ? emMinutos(expediente.saida) : null,
        intervalo: barbeiro.intervalo,
        almoco: expediente
          ? almocoNoDia(
              barbeiro.almoco,
              barbeiro.almoco_duracao,
              emMinutos(expediente.entrada),
              emMinutos(expediente.saida),
            )
          : null,
      };
    })
    .filter((coluna) => coluna.entrada !== null || naGrade.some((a) => a.barbeiro.id === coluna.id));
  for (const agendamento of naGrade) {
    if (!colunas.some((coluna) => coluna.id === agendamento.barbeiro.id)) {
      const b = agendamento.barbeiro;
      colunas.push({
        id: b.id,
        nome: b.nome_de_chamada,
        cor: b.cor_agenda,
        foto: null,
        entrada: null,
        saida: null,
        intervalo: b.intervalo,
        almoco: null,
      });
    }
  }

  // a grade vai da primeira entrada à última saída, em horas cheias; sem ninguém, 9h às 19h
  const limites = [
    ...colunas.flatMap((c) => (c.entrada !== null && c.saida !== null ? [c.entrada, c.saida] : [])),
    ...naGrade.flatMap((a) => [emMinutos(a.inicio), emMinutos(a.fim)]),
  ];
  const abre = limites.length ? Math.floor(Math.min(...limites) / 60) * 60 : 9 * 60;
  const fecha = limites.length ? Math.ceil(Math.max(...limites) / 60) * 60 : 19 * 60;
  const altura = (fecha - abre) * PX;
  const horasCheias = Array.from({ length: (fecha - abre) / 60 + 1 }, (_, i) => abre + i * 60);

  const ehHoje = data === diaDeHoje;
  const mostrarAgora = ehHoje && minutoAtual !== null && minutoAtual >= abre && minutoAtual <= fecha;

  /** Em que minuto do dia o mouse está, arredondado pro passo do fantasma. */
  function minutoNoPonto(evento: React.MouseEvent<HTMLDivElement>): number {
    const y = evento.clientY - evento.currentTarget.getBoundingClientRect().top;
    return Math.floor((abre + y / PX) / PASSO_DO_FANTASMA) * PASSO_DO_FANTASMA;
  }

  /** Cabe um atendimento dessa duração ali? Dentro do expediente, no futuro e sem bater
   *  com outro cliente (contando a limpeza dos dois lados). ignorar = quem está sendo arrastado. */
  function cabeAli(coluna: Coluna, minuto: number, duracao: number, ignorar?: number): boolean {
    if (coluna.entrada === null || coluna.saida === null) return false;
    if (minuto < coluna.entrada || minuto + duracao > coluna.saida) return false;
    if (data < diaDeHoje || (ehHoje && minutoAtual !== null && minuto <= minutoAtual)) return false;
    if (coluna.almoco && minuto < coluna.almoco[1] && coluna.almoco[0] < minuto + duracao) return false;
    return !naGrade.some(
      (a) =>
        a.id !== ignorar &&
        a.barbeiro.id === coluna.id &&
        minuto < emMinutos(a.fim) + coluna.intervalo &&
        emMinutos(a.inicio) < minuto + duracao + coluna.intervalo,
    );
  }

  function aoMoverNaColuna(evento: React.MouseEvent<HTMLDivElement>, coluna: Coluna) {
    if (arrastando.current?.movendo) return; // arrastando, quem aparece é a prévia
    const minuto = minutoNoPonto(evento);
    const novo = cabeAli(coluna, minuto, PASSO_DO_FANTASMA) ? { colunaId: coluna.id, minuto } : null;
    // só mexo no estado quando muda de quadradinho, senão a tela redesenha a cada pixel
    if (novo?.colunaId !== fantasma?.colunaId || novo?.minuto !== fantasma?.minuto) setFantasma(novo);
  }

  function aoClicarNaColuna(evento: React.MouseEvent<HTMLDivElement>, coluna: Coluna) {
    if (acabouDeArrastar.current) return; // o soltar do arraste não conta como clique
    const minuto = minutoNoPonto(evento);
    if (!cabeAli(coluna, minuto, PASSO_DO_FANTASMA)) return;
    setSelecionadoId(null);
    setLugar({
      barbeiroId: coluna.id,
      barbeiroNome: coluna.nome,
      intervalo: coluna.intervalo,
      saida: coluna.saida!,
      almoco: coluna.almoco,
      minuto,
    });
  }

  function aoMarcar(marcado: Agendamento) {
    setLugar(null);
    setFantasma(null);
    setDia((atual) => atual && { ...atual, agendamentos: [...atual.agendamentos, marcado] });
    setSelecionadoId(marcado.id);
    setRecemMarcado(marcado.id);
    setVersao((v) => v + 1);
    setRecado({
      texto: `Horário marcado: ${marcado.cliente.nome}, ${marcado.inicio.slice(0, 5)} com ${marcado.barbeiro.nome_de_chamada}.`,
      id: ++numeroDoRecado.current,
    });
  }

  function mostrarPrevia(nova: typeof previa) {
    const atual = previaAtual.current;
    if (atual?.colunaId === nova?.colunaId && atual?.minuto === nova?.minuto) return;
    previaAtual.current = nova;
    setPrevia(nova);
  }

  /** Começa quando aperta o botão do mouse num cliente. Só vira arraste se o mouse andar
   *  uns 5 px; menos que isso é um clique normal, que abre o detalhe. */
  function comecarArraste(evento: React.PointerEvent, agendamento: Agendamento) {
    if (agendamento.situacao !== "agendado" || evento.button !== 0) return;
    const colunaNaTela = colunasNaTela.current.get(agendamento.barbeiro.id);
    if (!colunaNaTela) return;

    const minutoNoPonteiro = abre + (evento.clientY - colunaNaTela.getBoundingClientRect().top) / PX;
    arrastando.current = {
      agendamento,
      x: evento.clientX,
      y: evento.clientY,
      deslocamento: minutoNoPonteiro - emMinutos(agendamento.inicio),
      movendo: false,
    };

    const mover = (e: PointerEvent) => {
      const atual = arrastando.current;
      if (!atual) return;
      if (!atual.movendo && Math.hypot(e.clientX - atual.x, e.clientY - atual.y) < 5) return;
      atual.movendo = true;
      setFantasma(null);

      // qual coluna está embaixo do mouse
      const alvo = colunas.find((coluna) => {
        const caixa = colunasNaTela.current.get(coluna.id)?.getBoundingClientRect();
        return caixa && e.clientX >= caixa.left && e.clientX < caixa.right;
      });
      if (!alvo) return mostrarPrevia(null);

      const topo = colunasNaTela.current.get(alvo.id)!.getBoundingClientRect().top;
      const bruto = abre + (e.clientY - topo) / PX - atual.deslocamento;
      const minuto = Math.round(bruto / PASSO_DO_FANTASMA) * PASSO_DO_FANTASMA;
      mostrarPrevia({
        id: atual.agendamento.id,
        colunaId: alvo.id,
        minuto,
        cabe: cabeAli(alvo, minuto, atual.agendamento.duracao, atual.agendamento.id),
      });
    };

    const soltar = () => {
      window.removeEventListener("pointermove", mover);
      window.removeEventListener("pointerup", soltar);
      window.removeEventListener("pointercancel", soltar);
      const atual = arrastando.current;
      const destino = previaAtual.current;
      arrastando.current = null;
      mostrarPrevia(null);
      if (!atual?.movendo) return;

      // o navegador ainda vai mandar um "click" depois do soltar; esse eu ignoro
      acabouDeArrastar.current = true;
      setTimeout(() => (acabouDeArrastar.current = false), 0);
      if (destino?.cabe) remarcarArrastando(atual.agendamento, destino.colunaId, destino.minuto);
    };

    window.addEventListener("pointermove", mover);
    window.addEventListener("pointerup", soltar);
    window.addEventListener("pointercancel", soltar);
  }

  async function remarcarArrastando(agendamento: Agendamento, barbeiroId: number, minuto: number) {
    // soltou no mesmo lugar: nada a fazer
    if (barbeiroId === agendamento.barbeiro.id && minuto === emMinutos(agendamento.inicio)) return;

    setSalvandoId(agendamento.id);
    try {
      const remarcado = await remarcarAgendamento(agendamento.id, {
        cliente_id: agendamento.cliente.id,
        barbeiro_id: barbeiroId,
        servicos: agendamento.servicos.map((s) => s.servico_id),
        data: agendamento.data,
        inicio: hhmm(minuto),
      });
      setDia(
        (atual) =>
          atual && {
            ...atual,
            agendamentos: atual.agendamentos.map((a) => (a.id === remarcado.id ? remarcado : a)),
          },
      );
      setSelecionadoId(remarcado.id);
      setRecemMarcado(remarcado.id);
      setVersao((v) => v + 1);
      setRecado({
        texto: `Remarcado: ${remarcado.cliente.nome}, ${remarcado.inicio.slice(0, 5)} com ${remarcado.barbeiro.nome_de_chamada}.`,
        id: ++numeroDoRecado.current,
      });
    } catch (erro) {
      // a API confere tudo de novo (o cliente pode estar em outra cadeira nesse horário, por exemplo)
      setRecado({ texto: lerErroDoFormulario(erro).aviso, id: ++numeroDoRecado.current, erro: true });
    } finally {
      setSalvandoId(null);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3.5 border-b border-mogno/16 px-6 py-4 md:px-7">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Dia anterior"
            onClick={() => irPara(somarDias(data, -1))}
            className="flex size-10 cursor-pointer items-center justify-center border border-mogno/26 text-[18px] text-tinta transition-colors hover:border-terracota hover:bg-terracota/5 active:scale-95"
          >
            ‹
          </button>
          <Botao type="button" onClick={() => irPara(diaDeHoje)} disabled={ehHoje} className="px-4.5 py-2.75">
            Hoje
          </Botao>
          <button
            type="button"
            aria-label="Próximo dia"
            onClick={() => irPara(somarDias(data, 1))}
            className="flex size-10 cursor-pointer items-center justify-center border border-mogno/26 text-[18px] text-tinta transition-colors hover:border-terracota hover:bg-terracota/5 active:scale-95"
          >
            ›
          </button>
          <h1
            key={data}
            className="m-0 ml-3 animate-surgir font-titulo text-[26px] leading-tight font-normal text-tinta"
          >
            {data ? dataPorExtenso(data) : ""}
          </h1>
        </div>

        <BotaoLink href={`/agenda/novo${data ? `?data=${data}` : ""}`} estilo="principal" className="py-3">
          Novo agendamento
        </BotaoLink>
      </div>

      {erro && (
        <div className="mx-6 mt-4 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro md:mx-7">
          {erro} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative min-h-80 min-w-0 flex-1 overflow-auto">
          {colunas.length === 0 && !carregando ? (
            <div className="flex h-full items-center justify-center p-10 text-center text-[15px] text-tinta-media">
              Ninguém da equipe trabalha nesse dia.
            </div>
          ) : (
            <div
              key={carregando ? "carregando" : data}
              className={`grid ${carregando ? "opacity-60 transition-opacity" : "animate-surgir"}`}
              style={{
                gridTemplateColumns: `58px repeat(${colunas.length}, minmax(178px, 1fr))`,
                minWidth: 58 + colunas.length * 178,
              }}
            >
              {/* cabeçalho: o canto vazio e o nome de cada barbeiro */}
              <div className="sticky top-0 left-0 z-8 border-b border-mogno/26 bg-[#f5eee2]" />
              {colunas.map((coluna) => {
                const doBarbeiro = naGrade.filter((a) => a.barbeiro.id === coluna.id);
                // quanto do expediente já está com cliente (falta não conta, a cadeira ficou livre)
                // o almoço sai do total: nele ninguém atende
                const expediente =
                  coluna.entrada !== null && coluna.saida !== null
                    ? coluna.saida - coluna.entrada - (coluna.almoco ? coluna.almoco[1] - coluna.almoco[0] : 0)
                    : 0;
                const marcados = doBarbeiro
                  .filter((a) => a.situacao !== "faltou")
                  .reduce((soma, a) => soma + a.duracao, 0);
                const ocupado = expediente ? Math.min(100, Math.round((100 * marcados) / expediente)) : 0;
                return (
                  <div
                    key={coluna.id}
                    className="sticky top-0 z-6 flex flex-col gap-1.5 border-b border-l border-b-mogno/26 border-l-mogno/16 bg-[#f5eee2] px-3.5 pt-3 pb-2.75"
                  >
                    <div className="flex items-center gap-2.25 font-titulo text-[17px] whitespace-nowrap text-tinta">
                      <Retrato foto={coluna.foto} nome={coluna.nome} className="size-7 p-0.5 text-[11px]" />
                      <span className="size-2.5 flex-none" style={{ background: coresDo(coluna.cor).forte }} />
                      {coluna.nome}
                    </div>
                    <div className="text-[12px] text-tinta-fraca">
                      {coluna.entrada !== null && coluna.saida !== null
                        ? `${hhmm(coluna.entrada)} – ${hhmm(coluna.saida)}`
                        : "Folga"}
                      {coluna.almoco && ` · almoço ${hhmm(coluna.almoco[0])}`}
                      {" · "}
                      {doBarbeiro.length} {doBarbeiro.length === 1 ? "cliente" : "clientes"}
                    </div>
                    {expediente > 0 && (
                      <>
                        <div className="h-1 bg-mogno/10">
                          <i
                            className="block h-full transition-[width] duration-500 ease-out"
                            style={{ width: `${ocupado}%`, background: coresDo(coluna.cor).forte }}
                          />
                        </div>
                        <div className="font-rotulo text-[9px] tracking-[0.18em] text-rotulo uppercase">
                          {ocupado}% ocupado
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

              {/* a régua das horas */}
              <div className="sticky left-0 z-5 border-r border-mogno/26 bg-[#f5eee2]" style={{ height: altura }}>
                {horasCheias.map((minuto, i) => (
                  <span
                    key={minuto}
                    className="absolute right-2 font-rotulo text-[10px] tracking-[0.08em] text-rotulo"
                    style={{
                      top: (minuto - abre) * PX,
                      transform: i === 0 ? "translateY(3px)" : "translateY(-50%)",
                    }}
                  >
                    {hhmm(minuto)}
                  </span>
                ))}
                {mostrarAgora && (
                  <span
                    className="absolute right-1 z-2 bg-[#b23a1c] px-1 pt-0.5 pb-px font-rotulo text-[10px] text-[#fff4e6]"
                    style={{
                      top: (minutoAtual! - abre) * PX,
                      transform: "translateY(-50%)",
                    }}
                  >
                    {hhmm(minutoAtual!)}
                  </span>
                )}
              </div>

              {colunas.map((coluna) => (
                <div
                  key={coluna.id}
                  ref={(elemento) => {
                    if (elemento) colunasNaTela.current.set(coluna.id, elemento);
                    else colunasNaTela.current.delete(coluna.id);
                  }}
                  onClick={(evento) => aoClicarNaColuna(evento, coluna)}
                  onMouseMove={(evento) => aoMoverNaColuna(evento, coluna)}
                  onMouseLeave={() => setFantasma(null)}
                  className={`group relative border-l border-mogno/16 transition-colors hover:bg-terracota/[0.025] ${
                    fantasma?.colunaId === coluna.id ? "cursor-pointer" : ""
                  }`}
                  style={{
                    height: altura,
                    // linha forte a cada hora e fraquinha a cada 15 min, como no protótipo
                    backgroundImage:
                      "repeating-linear-gradient(180deg, rgba(74,27,16,.14) 0 1px, transparent 1px 90px)," +
                      "repeating-linear-gradient(180deg, rgba(74,27,16,.055) 0 1px, transparent 1px 22.5px)",
                  }}
                >
                  {/* o que fica fora do expediente aparece hachurado */}
                  {(coluna.entrada === null
                    ? [[abre, fecha]]
                    : [
                        [abre, coluna.entrada],
                        [coluna.saida!, fecha],
                      ]
                  )
                    .filter(([de, ate]) => ate > de)
                    .map(([de, ate]) => (
                      <div
                        key={de}
                        className="absolute inset-x-0 bg-[#e4d9c6]/65"
                        style={{
                          top: (de - abre) * PX,
                          height: (ate - de) * PX,
                          backgroundImage:
                            "repeating-linear-gradient(135deg, rgba(74,27,16,.06) 0 6px, transparent 6px 12px)",
                        }}
                      />
                    ))}

                  {/* o almoço: a faixa listrada em oliva do protótipo (.ag-pausa) */}
                  {coluna.almoco && (
                    <div
                      className="absolute inset-x-0 z-0 flex items-center justify-center border-y border-dashed border-oliva/45 font-rotulo text-[10px] tracking-[0.24em] text-[#5b6338] uppercase"
                      style={{
                        top: (coluna.almoco[0] - abre) * PX,
                        height: (coluna.almoco[1] - coluna.almoco[0]) * PX,
                        backgroundImage:
                          "repeating-linear-gradient(135deg, rgba(90,98,54,.13) 0 6px, transparent 6px 12px)",
                      }}
                    >
                      Almoço
                    </div>
                  )}

                  {/* o fantasma: mostra a hora e convida a marcar ali */}
                  {fantasma?.colunaId === coluna.id && (
                    <div
                      className="pointer-events-none absolute inset-x-1.25 z-1 flex animate-surgir items-center justify-between border border-dashed border-terracota bg-terracota/7 px-2 font-rotulo text-[10px] tracking-[0.14em] text-terracota transition-[top] duration-100 ease-out"
                      style={{
                        top: (fantasma.minuto - abre) * PX,
                        height: PASSO_DO_FANTASMA * PX,
                      }}
                    >
                      <span>{hhmm(fantasma.minuto)}</span>
                      <span className="opacity-80">+ MARCAR</span>
                    </div>
                  )}

                  {/* a prévia de onde o cliente arrastado vai cair */}
                  {previa?.colunaId === coluna.id &&
                    (() => {
                      const arrastado = naGrade.find((a) => a.id === previa.id);
                      if (!arrastado) return null;
                      return (
                        <div
                          className={`pointer-events-none absolute inset-x-1.25 z-5 flex flex-col justify-center gap-0.5 border-2 border-dashed px-2.5 font-rotulo text-[10px] tracking-[0.14em] uppercase shadow-[0_10px_24px_rgba(58,20,9,.18)] transition-[top] duration-75 ease-out ${
                            previa.cabe
                              ? "border-terracota bg-papel-claro/90 text-terracota"
                              : "border-erro/70 bg-erro/8 text-erro"
                          }`}
                          style={{ top: (previa.minuto - abre) * PX, height: arrastado.duracao * PX }}
                        >
                          <span>
                            {hhmm(previa.minuto)} – {hhmm(previa.minuto + arrastado.duracao)}
                          </span>
                          <span className="opacity-80">{previa.cabe ? "Soltar aqui" : "Não cabe aqui"}</span>
                        </div>
                      );
                    })()}

                  {naGrade
                    .filter((a) => a.barbeiro.id === coluna.id)
                    .map((agendamento, posicao) => (
                      <Bloco
                        key={agendamento.id}
                        posicao={posicao}
                        destacar={agendamento.id === recemMarcado}
                        agendamento={agendamento}
                        topo={(emMinutos(agendamento.inicio) - abre) * PX}
                        selecionado={agendamento.id === selecionadoId}
                        esmaecido={previa?.id === agendamento.id || salvandoId === agendamento.id}
                        onEscolher={() => !acabouDeArrastar.current && setSelecionadoId(agendamento.id)}
                        onPegar={(evento) => comecarArraste(evento, agendamento)}
                      />
                    ))}

                  {mostrarAgora && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-3 border-t-2 border-[#b23a1c]"
                      style={{ top: (minutoAtual! - abre) * PX }}
                    >
                      <span className="absolute -top-1.25 -left-1 size-2 animate-pulsar rounded-full bg-[#b23a1c]" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-5 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-6 py-6 lg:w-80 lg:border-t-0 lg:border-l">
          {data && <CalendarioDaAgenda data={data} hoje={diaDeHoje} versao={versao} onEscolher={irPara} />}

          {selecionado ? (
            <div key={selecionado.id} className="flex animate-surgir flex-col gap-5">
              <Detalhe
                key={selecionado.id}
                agendamento={selecionado}
                onFechar={() => setSelecionadoId(null)}
                onMudou={(atualizado) => {
                  setDia(
                    (atual) =>
                      atual && {
                        ...atual,
                        agendamentos: atual.agendamentos.map((a) => (a.id === atualizado.id ? atualizado : a)),
                      },
                  );
                  setVersao((v) => v + 1); // cancelado libera espaço: a barrinha do calendário muda
                }}
              />
            </div>
          ) : (
            <ResumoDoDia agendamentos={agendamentos} carregando={carregando} />
          )}
        </aside>
      </div>

      {lugar && (
        <GavetaDeAgendamento
          lugar={lugar}
          data={data}
          ocupados={naGrade.filter((a) => a.barbeiro.id === lugar.barbeiroId)}
          cardapio={cardapio}
          onFechar={() => setLugar(null)}
          onMarcado={aoMarcar}
        />
      )}

      {/* o aviso flutuante de "deu certo", igual ao .ag-toast do protótipo */}
      {recado && (
        <div
          key={recado.id}
          role="status"
          className={`pointer-events-none fixed bottom-6.5 left-1/2 z-70 -translate-x-1/2 animate-surgir border bg-mogno px-5.5 py-3.5 text-[14px] text-creme shadow-[0_12px_30px_rgba(0,0,0,.25)] ${
            recado.erro ? "border-erro" : "border-latao"
          }`}
        >
          {recado.erro ? "✕" : "✓"} {recado.texto}
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------- um cliente na grade

function Bloco({
  agendamento,
  posicao,
  destacar,
  topo,
  selecionado,
  esmaecido,
  onEscolher,
  onPegar,
}: {
  agendamento: Agendamento;
  posicao: number; // pra entrar um depois do outro, e não todos de uma vez
  destacar: boolean; // acabou de ser marcado pela gaveta
  topo: number;
  selecionado: boolean;
  esmaecido: boolean; // sendo arrastado ou salvando
  onEscolher: () => void;
  onPegar: (evento: React.PointerEvent) => void;
}) {
  const { forte, clara } = coresDo(agendamento.barbeiro.cor_agenda);
  const curto = agendamento.duracao < 30; // bloco baixinho: tudo numa linha só
  const situacao = agendamento.situacao;
  const arrastavel = situacao === "agendado"; // fechado não muda mais, então nem deixo pegar

  const estilo: React.CSSProperties =
    situacao === "concluido"
      ? {
          background: "#fbf7ef",
          borderColor: "rgba(74,27,16,.25)",
          color: "var(--color-tinta-fraca)",
        }
      : situacao === "faltou"
        ? {
            background: "transparent",
            borderStyle: "dashed",
            borderColor: "rgba(163,52,27,.5)",
            color: "var(--color-erro)",
          }
        : { background: clara, borderColor: forte };

  return (
    <button
      type="button"
      onClick={(evento) => {
        evento.stopPropagation(); // senão o clique cai também no "espaço vazio" da coluna
        onEscolher();
      }}
      onMouseMove={(evento) => evento.stopPropagation()} // em cima do cliente o fantasma some
      onPointerDown={onPegar}
      title={arrastavel ? "Clique pra ver, ou arraste pra remarcar" : undefined}
      className={`absolute inset-x-1.25 z-2 flex animate-surgir flex-col text-left outline-offset-1 transition-[translate,box-shadow,outline-color,opacity] duration-200 select-none hover:z-4 hover:-translate-y-px hover:shadow-[0_6px_16px_rgba(58,20,9,.22)] ${
        arrastavel ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-pointer"
      } ${selecionado ? "z-4 outline-2 outline-latao" : "outline-2 outline-transparent"} ${
        destacar ? "shadow-[0_0_0_4px_rgba(201,162,39,.35)]" : ""
      } ${esmaecido ? "opacity-40" : ""}`}
      style={{ top: topo, animationDelay: `${Math.min(posicao, 8) * 45}ms` }}
    >
      <div
        className={`flex min-h-0 gap-0.5 overflow-hidden border px-2.25 ${
          curto ? "flex-row items-center" : "flex-col py-1.25"
        }`}
        style={{ ...estilo, height: agendamento.duracao * PX }}
      >
        <div className="flex items-baseline gap-1.5 truncate text-[13px] font-medium">
          <b className="font-rotulo text-[11px] font-medium tracking-[0.06em]">{agendamento.inicio.slice(0, 5)}</b>
          <span className={situacao === "faltou" ? "line-through" : ""}>{agendamento.cliente.nome}</span>
        </div>
        {!curto && (
          <div className="truncate text-[12px] opacity-80">{agendamento.servicos.map((s) => s.nome).join(" + ")}</div>
        )}
        {!curto && situacao !== "agendado" && (
          <span className="mt-0.5 w-fit border border-current px-1.25 pt-0.5 pb-px font-rotulo text-[8.5px] tracking-[0.16em] uppercase opacity-85">
            {NOME_DA_SITUACAO[situacao]}
          </span>
        )}
      </div>
      {/* o rabinho tracejado é o intervalo de limpeza do barbeiro depois do cliente */}
      {situacao !== "faltou" && agendamento.barbeiro.intervalo > 0 && (
        <div
          className="flex-none border border-t-0 border-dashed"
          style={{
            height: agendamento.barbeiro.intervalo * PX,
            borderColor: situacao === "concluido" ? "rgba(74,27,16,.25)" : forte,
            backgroundImage: `repeating-linear-gradient(135deg, ${clara} 0 4px, transparent 4px 8px)`,
          }}
        />
      )}
    </button>
  );
}

// ---------------------------------------------------------------- a coluna da direita

function ResumoDoDia({ agendamentos, carregando }: { agendamentos: Agendamento[]; carregando: boolean }) {
  const contar = (situacao: Situacao) => agendamentos.filter((a) => a.situacao === situacao).length;
  // o previsto é o que ainda vai entrar mais o que já foi atendido; falta e cancelado não pagam
  const previsto = agendamentos
    .filter((a) => a.situacao === "agendado" || a.situacao === "concluido")
    .reduce((soma, a) => soma + a.total, 0);

  const linhas: [string, string][] = [
    ["Agendados", String(contar("agendado"))],
    ["Concluídos", String(contar("concluido"))],
    ["Faltas", String(contar("faltou"))],
    ["Cancelados", String(contar("cancelado"))],
  ];

  return (
    <>
      <Secao titulo="O dia" />
      <dl className="m-0 flex flex-col border border-mogno/20 bg-papel-claro px-4.5 py-2">
        {linhas.map(([rotulo, valor]) => (
          <div
            key={rotulo}
            className="flex justify-between border-b border-dashed border-mogno/16 py-2.5 text-[14px] last:border-b-0"
          >
            <dt className="text-tinta-fraca">{rotulo}</dt>
            <dd className="m-0 text-tinta tabular-nums">{carregando ? "…" : valor}</dd>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between border-t-2 border-tinta pt-3 pb-1.5">
          <dt className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">Previsto</dt>
          <dd className="m-0 font-titulo text-[24px] text-tinta">{reais(previsto)}</dd>
        </div>
      </dl>

      <p className="m-0 text-[13px] leading-relaxed text-tinta-fraca">
        Clique num cliente pra ver os detalhes, ou arraste pra remarcar. Num espaço vazio, o clique marca naquele
        horário.
      </p>

      <Secao titulo="Legenda" />
      <div className="grid grid-cols-2 gap-x-3 gap-y-2.5 text-[12px] text-tinta-media">
        <span className="flex items-center gap-2">
          <i className="size-3.5 border border-terracota bg-[#f4e2d7]" />
          Agendado
        </span>
        <span className="flex items-center gap-2">
          <i className="size-3.5 border border-mogno/25 bg-[#fbf7ef]" />
          Concluído
        </span>
        <span className="flex items-center gap-2">
          <i className="size-3.5 border border-dashed border-erro/50" />
          Faltou
        </span>
        <span className="flex items-center gap-2">
          <i
            className="size-3.5 border border-dashed border-terracota"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, #f4e2d7 0 3px, transparent 3px 6px)",
            }}
          />
          Limpeza
        </span>
        <span className="flex items-center gap-2">
          <i
            className="size-3.5 border border-dashed border-oliva/50"
            style={{
              backgroundImage: "repeating-linear-gradient(135deg, rgba(90,98,54,.25) 0 3px, transparent 3px 6px)",
            }}
          />
          Almoço
        </span>
      </div>
    </>
  );
}

function Detalhe({
  agendamento,
  onFechar,
  onMudou,
}: {
  agendamento: Agendamento;
  onFechar: () => void;
  onMudou: (atualizado: Agendamento) => void;
}) {
  const [confirmandoCancelamento, setConfirmandoCancelamento] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");

  // concluído e faltou só depois que o horário chegou (a API confere de novo)
  const [comecou] = useState(() => new Date(`${agendamento.data}T${agendamento.inicio}`) <= new Date());
  const aberto = agendamento.situacao === "agendado";

  async function mudar(situacao: "concluido" | "faltou" | "cancelado") {
    setSalvando(true);
    try {
      onMudou(await mudarSituacao(agendamento.id, situacao));
      setAviso("");
    } catch (erro) {
      setAviso(erro instanceof ErroDaApi ? erro.message : "Não consegui salvar. Tenta de novo.");
    } finally {
      setSalvando(false);
      setConfirmandoCancelamento(false);
    }
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="font-rotulo text-[10px] tracking-[0.26em] text-[#9a5a2e] uppercase">Agendamento</span>
        <button
          type="button"
          onClick={onFechar}
          className="cursor-pointer font-rotulo text-[10px] tracking-[0.2em] text-tinta-media uppercase hover:text-tinta"
        >
          Fechar ✕
        </button>
      </div>

      <div className="flex flex-col gap-3 border border-mogno/20 bg-papel-claro px-4.5 py-4.5">
        <div>
          <div className="font-titulo text-[30px] leading-none text-tinta">
            {agendamento.inicio.slice(0, 5)}
            <span className="text-[20px] text-tinta-fraca"> – {agendamento.fim.slice(0, 5)}</span>
          </div>
          <div className="mt-1.5 text-[13px] text-tinta-media">
            {dataPorExtenso(agendamento.data)} · {duracaoBonita(agendamento.duracao)}
          </div>
        </div>

        <span
          className={`w-fit border px-2 pt-1 pb-0.75 font-rotulo text-[9px] tracking-[0.18em] uppercase ${
            agendamento.situacao === "agendado"
              ? "border-oliva text-oliva"
              : agendamento.situacao === "concluido"
                ? "border-mogno/30 text-tinta-fraca"
                : "border-erro/50 text-erro"
          }`}
        >
          {NOME_DA_SITUACAO[agendamento.situacao]}
        </span>

        <dl className="m-0 flex flex-col text-[14px]">
          <div className="flex justify-between gap-3 border-t border-dashed border-mogno/18 py-2.5">
            <dt className="text-tinta-fraca">Cliente</dt>
            <dd className="m-0 text-right">
              {agendamento.cliente.nome}
              <br />
              <span className="text-[12px] text-tinta-fraca">{agendamento.cliente.telefone_formatado}</span>
            </dd>
          </div>
          <div className="flex justify-between gap-3 border-t border-dashed border-mogno/18 py-2.5">
            <dt className="text-tinta-fraca">Barbeiro</dt>
            <dd className="m-0">{agendamento.barbeiro.nome_de_chamada}</dd>
          </div>
          {agendamento.servicos.map((servico) => (
            <div
              key={servico.servico_id}
              className="flex justify-between gap-3 border-t border-dashed border-mogno/18 py-2.5"
            >
              <dt className="text-tinta">{servico.nome}</dt>
              <dd className="m-0 tabular-nums">{reais(servico.preco)}</dd>
            </div>
          ))}
        </dl>

        <div className="flex items-baseline justify-between border-t-2 border-tinta pt-3">
          <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">Total</span>
          <b className="font-titulo text-[24px] font-normal">{reais(agendamento.total)}</b>
        </div>
      </div>

      {aviso && <p className="m-0 text-[13px] text-erro">{aviso}</p>}

      {aberto && (
        <div className="flex flex-col gap-2.5">
          {comecou && (
            <div className="grid grid-cols-2 gap-2.5">
              <Botao
                type="button"
                estilo="oliva"
                disabled={salvando}
                onClick={() => mudar("concluido")}
                className="px-3"
              >
                Concluído
              </Botao>
              <Botao type="button" disabled={salvando} onClick={() => mudar("faltou")} className="px-3">
                Faltou
              </Botao>
            </div>
          )}

          <BotaoLink href={`/agenda/${agendamento.id}/remarcar`}>Remarcar</BotaoLink>

          {confirmandoCancelamento ? (
            <div className="flex items-center justify-between gap-2.5">
              <span className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">Cancelar mesmo?</span>
              <div className="flex gap-2">
                <Botao type="button" className="px-4 py-2.5" onClick={() => setConfirmandoCancelamento(false)}>
                  Não
                </Botao>
                <Botao
                  type="button"
                  disabled={salvando}
                  onClick={() => mudar("cancelado")}
                  className="border-erro px-4 py-2.5 text-erro hover:bg-erro/10"
                >
                  Sim
                </Botao>
              </div>
            </div>
          ) : (
            <Botao type="button" onClick={() => setConfirmandoCancelamento(true)} className="border-erro/50 text-erro">
              Cancelar horário
            </Botao>
          )}
        </div>
      )}
    </>
  );
}
