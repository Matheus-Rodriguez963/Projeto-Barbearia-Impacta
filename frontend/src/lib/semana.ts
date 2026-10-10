// A semana de trabalho do barbeiro do jeito que a tela usa: os 7 dias, cada um com
// "trabalha ou não" e o horário. A API só conhece os dias trabalhados (HorarioDoDia[]),
// então aqui ficam as contas pra ir de um formato pro outro.

import { horaCurta } from "@/lib/mascaras";
import { DIAS_DA_SEMANA, type DiaDaSemana, type HorarioDoDia } from "@/lib/tipos";

/** Guardo a hora mesmo quando é folga: se desmarcar e marcar de novo, o horário volta. */
export interface Dia {
  trabalha: boolean;
  entrada: string;
  saida: string;
}

export type Semana = Record<DiaDaSemana, Dia>;

const SIGLAS = DIAS_DA_SEMANA.map((dia) => dia.sigla);

/** O horário da casa: terça a sexta das 9h às 19h, sábado até as 17h. */
export function semanaPadrao(): Semana {
  const dia = (trabalha: boolean, saida = "19:00"): Dia => ({ trabalha, entrada: "09:00", saida });
  return {
    seg: dia(false),
    ter: dia(true),
    qua: dia(true),
    qui: dia(true),
    sex: dia(true),
    sab: dia(true, "17:00"),
    dom: dia(false),
  };
}

/** O que veio da API vira a semana da tela (quem não veio é folga). */
export function semanaDe(horarios: HorarioDoDia[]): Semana {
  const semana = semanaPadrao();
  for (const sigla of SIGLAS) semana[sigla].trabalha = false;
  for (const h of horarios) {
    semana[h.dia] = { trabalha: true, entrada: horaCurta(h.entrada), saida: horaCurta(h.saida) };
  }
  return semana;
}

export function diasTrabalhados(semana: Semana): DiaDaSemana[] {
  return SIGLAS.filter((sigla) => semana[sigla].trabalha);
}

/** A semana da tela vira o que a API espera: só os dias trabalhados. */
export function horariosDa(semana: Semana): HorarioDoDia[] {
  return diasTrabalhados(semana).map((dia) => ({ dia, entrada: semana[dia].entrada, saida: semana[dia].saida }));
}

/** Dias marcados com a saída antes (ou igual) da entrada.
 *  "09:00" e "19:00" comparam certo como texto porque têm sempre o mesmo tamanho. */
export function diasComHorarioErrado(semana: Semana): DiaDaSemana[] {
  return diasTrabalhados(semana).filter((dia) => {
    const { entrada, saida } = semana[dia];
    return !entrada || !saida || saida <= entrada;
  });
}
