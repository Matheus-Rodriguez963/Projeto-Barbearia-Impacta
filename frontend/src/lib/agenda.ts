// As contas de data e hora da agenda. Trabalho com a data em texto ("2026-11-03") e a
// hora em minutos (14:30 = 870): com new Date() puro o fuso horário vive trocando o dia.

import { DIAS_DA_SEMANA, type DiaDaSemana } from "./tipos";

const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

/** Monto a data ao meio-dia pra nenhuma conta de fuso empurrar pro dia anterior. */
function paraDate(data: string): Date {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia, 12);
}

function paraTexto(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Hoje no fuso de quem está usando (o toISOString daria o dia de Londres de noite). */
export function hoje(): string {
  return paraTexto(new Date());
}

export function somarDias(data: string, dias: number): string {
  const nova = paraDate(data);
  nova.setDate(nova.getDate() + dias);
  return paraTexto(nova);
}

/** "2026-11-03" -> "ter", a mesma sigla dos horários do barbeiro. */
export function siglaDoDia(data: string): DiaDaSemana {
  // o getDay começa no domingo; a minha lista começa na segunda
  return DIAS_DA_SEMANA[(paraDate(data).getDay() + 6) % 7].sigla;
}

/** "2026-11-03" -> { semana: "Ter", dia: 3, mes: "nov" } — pros botões de dia. */
export function partesDaData(data: string) {
  const d = paraDate(data);
  const nome = DIAS_DA_SEMANA.find((dia) => dia.sigla === siglaDoDia(data))!.nome;
  return { semana: nome.slice(0, 3), dia: d.getDate(), mes: MESES[d.getMonth()] };
}

/** "2026-11-03" -> "Terça, 3 de novembro" */
export function dataPorExtenso(data: string): string {
  const d = paraDate(data);
  const nome = DIAS_DA_SEMANA.find((dia) => dia.sigla === siglaDoDia(data))!.nome;
  return `${nome}, ${d.getDate()} de ${MESES_LONGOS[d.getMonth()]}`;
}

/** "14:30" ou "14:30:00" -> 870 */
export function emMinutos(hora: string): number {
  const [h, m] = hora.split(":").map(Number);
  return h * 60 + m;
}

/** 870 -> "14:30" */
export function hhmm(minutos: number): string {
  return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
}

/** O almoço daquele dia em minutos [início, fim], ou null se não tiver almoço nesse dia.
 *  Mesma regra do crud/agendamento.py: só vale com trabalho antes e depois dele. */
export function almocoNoDia(
  almoco: string | null,
  duracao: number,
  entrada: number,
  saida: number,
): [number, number] | null {
  if (!almoco) return null;
  const inicio = emMinutos(almoco);
  const fim = inicio + duracao;
  if (inicio <= entrada || fim >= saida) return null;
  return [inicio, fim];
}

/** 55 -> "R$ 55,00" */
export function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** 75 -> "1h15", 45 -> "45 min" */
export function duracaoBonita(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const resto = minutos % 60;
  return `${Math.floor(minutos / 60)}h${resto ? String(resto).padStart(2, "0") : ""}`;
}

// os nomes que aparecem na tela pra cada situação
export const NOME_DA_SITUACAO = {
  agendado: "Agendado",
  concluido: "Concluído",
  faltou: "Faltou",
  cancelado: "Cancelado",
} as const;
