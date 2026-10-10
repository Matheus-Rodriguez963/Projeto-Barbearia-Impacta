// A tabela "Dias e horários" do cadastro de barbeiro: uma linha por dia,
// com a caixinha de trabalha/folga e o horário de entrada e saída.

import type { Dia, Semana } from "@/lib/semana";
import { DIAS_DA_SEMANA, type DiaDaSemana } from "@/lib/tipos";

interface Props {
  semana: Semana;
  diasComErro: DiaDaSemana[];
  erro?: string;
  onMudarDia: (dia: DiaDaSemana, mudanca: Partial<Dia>) => void;
}

export default function JornadaSemanal({ semana, diasComErro, erro, onMudarDia }: Props) {
  return (
    <div className="mb-8.5">
      <div className={`flex flex-col border bg-papel-claro/60 ${erro ? "border-erro" : "border-mogno/18"}`}>
        {DIAS_DA_SEMANA.map(({ sigla, nome }) => {
          const dia = semana[sigla];
          // classe própria em vez da classeInput: lá tem w-full e py-3, que são do tamanho
          // dos campos grandes e brigariam com o tamanho menor daqui
          const classeHora =
            "w-27 border bg-papel-claro px-2.5 py-2 text-[14px] text-tinta-forte outline-none focus:border-terracota " +
            (diasComErro.includes(sigla) ? "border-erro" : "border-mogno/30");

          return (
            <div
              key={sigla}
              className="grid min-h-14 grid-cols-1 items-center gap-2 border-t border-mogno/10 px-4 py-3 first:border-t-0 sm:grid-cols-[130px_1fr] sm:gap-4.5 sm:py-2"
            >
              <label
                className={`flex cursor-pointer items-center gap-3 text-[14px] ${dia.trabalha ? "text-tinta" : "text-tinta-fraca"}`}
              >
                <input
                  type="checkbox"
                  checked={dia.trabalha}
                  onChange={(e) => onMudarDia(sigla, { trabalha: e.target.checked })}
                  className="m-0 size-4 cursor-pointer accent-terracota"
                />
                {nome}
              </label>

              {dia.trabalha ? (
                <div className="flex items-center gap-2.5">
                  <input
                    type="time"
                    aria-label={`Entrada na ${nome}`}
                    value={dia.entrada}
                    onChange={(e) => onMudarDia(sigla, { entrada: e.target.value })}
                    className={classeHora}
                  />
                  <span className="font-rotulo text-[10px] tracking-[0.18em] text-tinta-fraca uppercase">até</span>
                  <input
                    type="time"
                    aria-label={`Saída na ${nome}`}
                    value={dia.saida}
                    onChange={(e) => onMudarDia(sigla, { saida: e.target.value })}
                    className={classeHora}
                  />
                </div>
              ) : (
                <span className="font-rotulo text-[10px] tracking-[0.2em] text-[#b49b80] uppercase">Folga</span>
              )}
            </div>
          );
        })}
      </div>
      {erro && <span className="mt-1.5 block text-[12px] text-erro">{erro}</span>}
    </div>
  );
}
