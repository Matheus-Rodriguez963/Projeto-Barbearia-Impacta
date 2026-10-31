"use client";

// A gaveta que abre da direita quando a recepção clica num horário vazio da agenda,
// igual à .ag-gaveta do protótipo. Barbeiro, dia e hora já vêm do clique: falta só
// dizer quem é o cliente e o que ele vai fazer.
//
// O aviso de "cabe / não cabe" é só pra ajudar quem está marcando. Quem decide de verdade
// continua sendo a API, que confere tudo de novo na hora de salvar.

import { useEffect, useState } from "react";

import Botao from "@/components/Botao";
import BuscaDeCliente, { type ClienteEscolhido } from "@/components/BuscaDeCliente";
import Opcao from "@/components/Opcao";
import Secao from "@/components/Secao";
import { dataPorExtenso, duracaoBonita, emMinutos, hhmm, reais } from "@/lib/agenda";
import { lerErroDoFormulario, marcarAgendamento } from "@/lib/api";
import type { Agendamento, Servico } from "@/lib/tipos";

// quanto tempo a animação de saída leva (tem que bater com o animate-gaveta-saindo)
const SAIDA_MS = 220;

export interface LugarNaAgenda {
  barbeiroId: number;
  barbeiroNome: string;
  intervalo: number; // limpeza depois de cada cliente
  saida: number; // em minutos
  almoco: [number, number] | null; // o almoço do barbeiro nesse dia
  minuto: number; // a hora clicada, em minutos
}

interface Props {
  lugar: LugarNaAgenda;
  data: string;
  ocupados: Agendamento[]; // os clientes que esse barbeiro já tem no dia
  cardapio: Servico[];
  onFechar: () => void;
  onMarcado: (agendamento: Agendamento) => void;
}

export default function GavetaDeAgendamento({ lugar, data, ocupados, cardapio, onFechar, onMarcado }: Props) {
  const [cliente, setCliente] = useState<ClienteEscolhido | null>(null);
  const [servicos, setServicos] = useState<number[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState("");
  const [saindo, setSaindo] = useState(false);

  function fechar(depois?: () => void) {
    setSaindo(true);
    setTimeout(() => (depois ?? onFechar)(), SAIDA_MS);
  }

  // Esc fecha a gaveta, como qualquer janela
  useEffect(() => {
    const aoApertar = (evento: KeyboardEvent) => evento.key === "Escape" && fechar();
    window.addEventListener("keydown", aoApertar);
    return () => window.removeEventListener("keydown", aoApertar);
  });

  const escolhidos = cardapio.filter((s) => servicos.includes(s.id));
  const duracao = escolhidos.reduce((soma, s) => soma + s.duracao, 0);
  const total = escolhidos.reduce((soma, s) => soma + s.preco, 0);
  const fim = lugar.minuto + duracao;

  // a mesma conta da API, só pra avisar antes de clicar em confirmar
  const passaDaSaida = duracao > 0 && fim > lugar.saida;
  const caiNoAlmoco = duracao > 0 && lugar.almoco !== null && lugar.minuto < lugar.almoco[1] && lugar.almoco[0] < fim;
  const bate = duracao
    ? ocupados.find(
        (o) => lugar.minuto < emMinutos(o.fim) + lugar.intervalo && emMinutos(o.inicio) < fim + lugar.intervalo,
      )
    : undefined;

  async function confirmar() {
    if (!cliente || servicos.length === 0) return;
    setSalvando(true);
    try {
      const marcado = await marcarAgendamento({
        cliente_id: cliente.id,
        barbeiro_id: lugar.barbeiroId,
        servicos,
        data,
        inicio: hhmm(lugar.minuto),
      });
      fechar(() => onMarcado(marcado));
    } catch (erro) {
      setAviso(lerErroDoFormulario(erro).aviso);
      setSalvando(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Marcar horário">
      <div
        onClick={() => fechar()}
        className={`absolute inset-0 bg-[rgba(23,17,14,.45)] ${saindo ? "animate-fundo-saindo" : "animate-fundo"}`}
      />

      <div
        className={`papel-pautado relative flex h-full w-118 max-w-full flex-col gap-5 overflow-auto bg-papel px-7.5 pt-7 pb-6.5 shadow-[-24px_0_60px_rgba(0,0,0,.3)] ${
          saindo ? "animate-gaveta-saindo" : "animate-gaveta"
        }`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="font-rotulo text-[10px] tracking-[0.26em] text-[#9a5a2e] uppercase">Novo agendamento</span>
            <h2 className="m-0 mt-1.5 mb-1 font-titulo text-[28px] leading-tight font-normal text-tinta">
              {hhmm(lugar.minuto)} com {lugar.barbeiroNome}
            </h2>
            <span className="text-[14px] text-tinta-fraca">{dataPorExtenso(data)}</span>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={() => fechar()}
            className="flex size-9 cursor-pointer items-center justify-center border border-mogno/26 text-tinta-media transition-colors hover:border-terracota hover:text-tinta"
          >
            ✕
          </button>
        </div>

        <div>
          <Secao titulo="Cliente" />
          <BuscaDeCliente
            cliente={cliente}
            focar
            onEscolher={(escolhido) => {
              setCliente(escolhido);
              setAviso("");
            }}
          />
        </div>

        <div>
          <Secao titulo="Serviços" />
          {cardapio.length === 0 ? (
            <p className="m-0 text-[13px] text-tinta-fraca">Nenhum serviço no cardápio ainda.</p>
          ) : (
            <div className="flex flex-wrap gap-2.5">
              {cardapio.map((servico) => {
                const marcado = servicos.includes(servico.id);
                return (
                  <Opcao
                    key={servico.id}
                    marcada={marcado}
                    onClick={() => {
                      setServicos(marcado ? servicos.filter((id) => id !== servico.id) : [...servicos, servico.id]);
                      setAviso("");
                    }}
                  >
                    {servico.nome} · {servico.duracao} min
                  </Opcao>
                );
              })}
            </div>
          )}
        </div>

        {/* a conta do tempo, no mesmo desenho do .ag-dur do protótipo */}
        <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1.5 border border-dashed border-mogno/25 px-3.5 py-3 text-[13px] text-tinta-media">
          {duracao ? (
            <>
              <span>
                <b className="font-medium text-tinta">{duracaoBonita(duracao)}</b> · até {hhmm(fim)}
              </span>
              {lugar.intervalo > 0 && <span>+ {lugar.intervalo} min de limpeza</span>}
            </>
          ) : (
            <span>Escolha os serviços pra ver até que horas vai.</span>
          )}
          <span className="ml-auto font-titulo text-[20px] text-tinta">{reais(total)}</span>
        </div>

        {duracao > 0 && (passaDaSaida || caiNoAlmoco || bate) ? (
          <div className="animate-surgir border border-erro/35 bg-erro/6 px-3.5 py-3 text-[13px] leading-relaxed text-[#8a2b16]">
            {passaDaSaida
              ? `Não cabe: ${lugar.barbeiroNome} sai às ${hhmm(lugar.saida)}.`
              : caiNoAlmoco
                ? `Não cabe: ${lugar.barbeiroNome} almoça das ${hhmm(lugar.almoco![0])} às ${hhmm(lugar.almoco![1])}.`
                : `Não cabe: bate com ${bate!.cliente.nome}, das ${bate!.inicio.slice(0, 5)} às ${bate!.fim.slice(0, 5)}${
                    lugar.intervalo ? " (contando a limpeza)" : ""
                  }.`}
          </div>
        ) : (
          duracao > 0 && (
            <div className="animate-surgir border border-oliva/40 bg-oliva/8 px-3.5 py-3 text-[13px] text-[#4c5330]">
              Cabe certinho na agenda de {lugar.barbeiroNome}.
            </div>
          )
        )}

        {aviso && (
          <div className="animate-surgir border border-erro/35 bg-erro/6 px-3.5 py-3 text-[13px] text-[#8a2b16]">
            {aviso}
          </div>
        )}

        <div className="mt-auto flex flex-wrap items-center justify-end gap-2.5 border-t border-mogno/16 pt-4.5">
          <Botao type="button" onClick={() => fechar()}>
            Voltar
          </Botao>
          <Botao
            type="button"
            estilo="principal"
            disabled={!cliente || servicos.length === 0 || salvando}
            onClick={confirmar}
          >
            {salvando ? "Marcando..." : "Confirmar horário"}
          </Botao>
        </div>
      </div>
    </div>
  );
}
