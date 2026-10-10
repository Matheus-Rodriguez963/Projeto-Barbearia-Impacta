// Coluna da direita do cadastro de barbeiro: o cartão de "como o cliente vê"
// e a chave de disponível para agendamento.
// O cartão é só visual (vai mudando enquanto digito); a chave muda o formulário pelo onMudarAtivo.

import Retrato from "@/components/Retrato";
import Secao from "@/components/Secao";
import { mesEAno } from "@/lib/mascaras";
import { CORES_DA_AGENDA, DIAS_DA_SEMANA, type CorDaAgenda, type DiaDaSemana } from "@/lib/tipos";

interface Props {
  nomeExibido: string; // nome na cadeira, ou o nome completo se ainda não tiver
  desde: string; // "2019-08"
  especialidades: string[];
  diasTrabalhados: DiaDaSemana[];
  cor: CorDaAgenda;
  foto: string | null; // endereço da imagem (a que já está salva ou a que acabou de ser escolhida)
  ativo: boolean;
  onMudarAtivo: (ativo: boolean) => void;
}

export default function FichaBarbeiro(props: Props) {
  const { nomeExibido, desde, especialidades, diasTrabalhados, cor, foto, ativo, onMudarAtivo } = props;

  const faixa = CORES_DA_AGENDA.find((opcao) => opcao.chave === cor)?.fundo ?? "bg-terracota";

  return (
    <aside className="flex w-full shrink-0 flex-col gap-6 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-7 py-8 lg:w-82.5 lg:border-t-0 lg:border-l">
      <Secao titulo="Como o cliente vê" />

      <div className="flex flex-col items-center gap-3.5 border border-mogno/20 bg-papel-claro px-5 pt-6.5 pb-5.5 text-center">
        <Retrato foto={foto} nome={nomeExibido} className="size-23 p-0.75 text-[30px]" />

        <div className="font-titulo text-[22px] leading-tight text-tinta">{nomeExibido.trim() || "Novo barbeiro"}</div>
        <div className="-mt-2 font-rotulo text-[9px] tracking-[0.24em] text-[#9a5a2e] uppercase">
          Na casa desde {mesEAno(desde)}
        </div>

        {especialidades.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1.5">
            {especialidades.map((especialidade) => (
              <span
                key={especialidade}
                className="border border-oliva/40 px-2.25 pt-1.25 pb-1 font-rotulo text-[9px] tracking-[0.16em] text-oliva uppercase"
              >
                {especialidade}
              </span>
            ))}
          </div>
        )}

        {/* a semana inteira aparece; os dias de folga ficam vazios */}
        <div className="flex w-full justify-center gap-1 border-t border-mogno/12 pt-3.5">
          {DIAS_DA_SEMANA.map((dia) => {
            const trabalha = diasTrabalhados.includes(dia.sigla);
            return (
              <span
                key={dia.sigla}
                title={`${dia.nome}: ${trabalha ? "trabalha" : "folga"}`}
                className={`flex size-7 items-center justify-center border font-rotulo text-[10px] ${
                  trabalha ? "border-oliva bg-oliva text-[#f4eedc]" : "border-mogno/18 text-[#b49b80]"
                }`}
              >
                {dia.letra}
              </span>
            );
          })}
        </div>

        {/* a faixa embaixo é a cor que ele vai ter na agenda */}
        <div className={`mt-0.5 h-1 w-full ${faixa}`} />
      </div>

      <div className="flex items-center justify-between gap-4 border border-mogno/20 bg-papel-claro px-3.5 py-3.5">
        <div className="flex flex-col gap-1">
          <span id="rotulo-disponivel" className="text-[13px] text-tinta">
            Disponível para agendamento
          </span>
          <span className="text-[11px] leading-snug text-tinta-fraca">Desligue em férias ou afastamento.</span>
        </div>

        {/* role="switch" faz o leitor de tela anunciar como liga/desliga, não como botão comum */}
        <button
          type="button"
          role="switch"
          aria-checked={ativo}
          aria-labelledby="rotulo-disponivel"
          onClick={() => onMudarAtivo(!ativo)}
          className={`relative h-5 w-8 shrink-0 cursor-pointer border transition-colors ${
            ativo ? "border-oliva bg-oliva" : "border-mogno/30 bg-papel"
          }`}
        >
          <span
            className={`absolute top-0.5 size-3.5 transition-all ${
              ativo ? "left-3.75 bg-creme" : "left-0.5 bg-tinta-fraca"
            }`}
          />
        </button>
      </div>
    </aside>
  );
}
