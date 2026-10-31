"use client";

// O calendário pequeno da lateral da agenda (o .cal do protótipo). Serve pra pular direto
// pra um dia, e a barrinha embaixo de cada número mostra o quanto ele já está cheio.

import { useEffect, useState } from "react";

import { ocupacaoDoMes } from "@/lib/api";
import type { DiaDoMes } from "@/lib/tipos";

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
// começo no domingo, que é como os calendários de parede daqui são
const LETRAS = ["D", "S", "T", "Q", "Q", "S", "S"];

/** "2026-10" + 1 -> "2026-11" */
function somarMes(mes: string, quantos: number): string {
  const [ano, numero] = mes.split("-").map(Number);
  const total = ano * 12 + (numero - 1) + quantos;
  return `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
}

interface Props {
  data: string; // o dia aberto na agenda
  hoje: string;
  versao: number; // muda quando alguém marca ou remarca, pra eu buscar as barrinhas de novo
  onEscolher: (data: string) => void;
}

export default function CalendarioDaAgenda({ data, hoje, versao, onEscolher }: Props) {
  // o mês que aparece segue o dia da agenda, a não ser que a pessoa tenha folheado com ‹ ›.
  // guardo junto de qual dia ela folheou: se a agenda mudar de dia, volto a seguir.
  const [folheado, setFolheado] = useState<{ base: string; mes: string } | null>(null);
  const mes = folheado && folheado.base === data ? folheado.mes : data.slice(0, 7);

  const [dias, setDias] = useState<{ chave: string; lista: DiaDoMes[] } | null>(null);
  const chave = `${mes}|${versao}`;

  useEffect(() => {
    let valendo = true;
    const [ano, numero] = mes.split("-").map(Number);
    ocupacaoDoMes(ano, numero)
      .then((lista) => valendo && setDias({ chave: `${mes}|${versao}`, lista }))
      .catch(() => valendo && setDias({ chave: `${mes}|${versao}`, lista: [] }));
    return () => {
      valendo = false;
    };
  }, [mes, versao]);

  // enquanto o mês novo não chega, continuo mostrando as barrinhas antigas se forem do mesmo mês
  const lista = dias && dias.chave.startsWith(mes) ? dias.lista : [];
  const [ano, numero] = mes.split("-").map(Number);
  const vazios = new Date(ano, numero - 1, 1).getDay(); // quantos quadrados antes do dia 1
  const diasNoMes = new Date(ano, numero, 0).getDate();
  const carregando = dias?.chave !== chave;

  function folhear(quantos: number) {
    setFolheado({ base: data, mes: somarMes(mes, quantos) });
  }

  const classeSeta =
    "flex size-7.5 cursor-pointer items-center justify-center border border-mogno/26 text-[15px] text-tinta " +
    "transition-colors hover:border-terracota hover:bg-terracota/5 active:scale-95";

  return (
    <div className="border border-mogno/20 bg-papel-claro px-3.5 pt-3.5 pb-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button type="button" aria-label="Mês anterior" onClick={() => folhear(-1)} className={classeSeta}>
          ‹
        </button>
        <span key={mes} className="animate-surgir font-titulo text-[18px] text-tinta capitalize">
          {MESES[numero - 1]} {ano}
        </span>
        <button type="button" aria-label="Próximo mês" onClick={() => folhear(1)} className={classeSeta}>
          ›
        </button>
      </div>

      <div className={`grid grid-cols-7 gap-0.5 transition-opacity ${carregando ? "opacity-70" : ""}`}>
        {LETRAS.map((letra, posicao) => (
          <span key={posicao} className="pt-1 pb-1.5 text-center font-rotulo text-[9px] tracking-[0.14em] text-rotulo">
            {letra}
          </span>
        ))}

        {Array.from({ length: vazios }, (_, posicao) => (
          <span key={`vazio-${posicao}`} />
        ))}

        {Array.from({ length: diasNoMes }, (_, posicao) => {
          const dia = `${mes}-${String(posicao + 1).padStart(2, "0")}`;
          const info = lista.find((d) => d.data === dia);
          const fechado = info ? !info.trabalha : false;
          const escolhido = dia === data;

          return (
            <button
              key={dia}
              type="button"
              onClick={() => onEscolher(dia)}
              aria-pressed={escolhido}
              aria-label={`${posicao + 1} de ${MESES[numero - 1]}${
                info?.trabalha ? `, ${info.ocupacao}% ocupado` : fechado ? ", ninguém trabalha" : ""
              }`}
              className={`flex h-9 cursor-pointer flex-col items-center justify-center gap-1 text-[13px] transition-colors ${
                escolhido
                  ? "bg-terracota text-creme"
                  : `hover:bg-terracota/7 ${fechado ? "text-[#bfae97]" : "text-tinta"} ${
                      dia === hoje ? "shadow-[inset_0_0_0_1px_var(--color-latao)]" : ""
                    }`
              }`}
            >
              {posicao + 1}
              {/* a barrinha: o fundo é o dia inteiro e o pedaço colorido é o que já está marcado */}
              <i
                className={`block h-0.75 w-[62%] ${fechado ? "invisible" : escolhido ? "bg-white/25" : "bg-mogno/10"}`}
              >
                <b
                  className={`block h-full transition-[width] duration-500 ${escolhido ? "bg-latao-claro" : "bg-oliva"}`}
                  style={{ width: `${info?.ocupacao ?? 0}%` }}
                />
              </i>
            </button>
          );
        })}
      </div>
    </div>
  );
}
