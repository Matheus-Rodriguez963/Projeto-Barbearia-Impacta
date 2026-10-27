// Os tipos que a API devolve. Deixei igualzinho aos schemas do FastAPI
// pra não me perder na hora de ler o JSON.

export type Origem = "Indicação" | "Passou na porta" | "Instagram" | "Google";

export const ORIGENS: Origem[] = ["Indicação", "Passou na porta", "Instagram", "Google"];

export interface Cliente {
  id: number;
  nome: string;
  apelido: string | null;
  telefone: string; // só os números, ex: 11990001234
  cpf: string; // só os números, ex: 52998224725
  email: string | null;
  data_nascimento: string | null; // vem como "2000-05-17"
  barbeiro_preferido: string;
  origem: Origem;
  observacoes: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  telefone_formatado: string; // a API já manda com a máscara
  cpf_formatado: string;
}

// O que eu mando no POST/PUT (sem id e sem as datas de controle)
export interface DadosDoCliente {
  nome: string;
  telefone: string;
  cpf: string;
  apelido?: string | null;
  email?: string | null;
  data_nascimento?: string | null;
  barbeiro_preferido?: string;
  origem?: Origem;
  observacoes?: string | null;
}

export interface ListaDeClientes {
  total: number;
  itens: Cliente[];
}

// Erro de validação: a API diz qual campo deu problema e o porquê
export interface ErroDeCampo {
  campo: string;
  mensagem: string;
}

// ---------------------------------------------------------------- etapa 2: barbeiros

// mesma lista e mesma ordem do schemas/barbeiro.py
export const ESPECIALIDADES = [
  "Corte clássico",
  "Degradê",
  "Barba na navalha",
  "Toalha quente",
  "Pigmentação",
  "Infantil",
] as const;

export type Especialidade = (typeof ESPECIALIDADES)[number];

// a API guarda a sigla; a tela usa o nome na tabela de horários e a letra no cartão
export const DIAS_DA_SEMANA = [
  { sigla: "seg", nome: "Segunda", letra: "S" },
  { sigla: "ter", nome: "Terça", letra: "T" },
  { sigla: "qua", nome: "Quarta", letra: "Q" },
  { sigla: "qui", nome: "Quinta", letra: "Q" },
  { sigla: "sex", nome: "Sexta", letra: "S" },
  { sigla: "sab", nome: "Sábado", letra: "S" },
  { sigla: "dom", nome: "Domingo", letra: "D" },
] as const;

export type DiaDaSemana = (typeof DIAS_DA_SEMANA)[number]["sigla"];

// as classes têm que estar escritas por inteiro, senão o Tailwind não gera a cor
export const CORES_DA_AGENDA = [
  { chave: "terracota", nome: "Terracota", fundo: "bg-terracota" },
  { chave: "oliva", nome: "Oliva", fundo: "bg-oliva" },
  { chave: "latao", nome: "Latão", fundo: "bg-latao" },
  { chave: "petroleo", nome: "Azul-petróleo", fundo: "bg-petroleo" },
] as const;

export type CorDaAgenda = (typeof CORES_DA_AGENDA)[number]["chave"];

export const INTERVALOS = [0, 5, 10, 15] as const;

export interface HorarioDoDia {
  dia: DiaDaSemana;
  entrada: string; // a API devolve "09:00:00" e aceita "09:00"
  saida: string;
}

export interface Barbeiro {
  id: number;
  nome: string;
  apelido: string | null;
  telefone: string;
  cpf: string;
  email: string | null;
  data_admissao: string; // "2019-03-01" — a tela só usa mês e ano
  especialidades: Especialidade[];
  comissao: number;
  intervalo: number;
  cor_agenda: CorDaAgenda;
  horarios: HorarioDoDia[]; // só os dias trabalhados; o que não está aqui é folga
  ativo: boolean; // "disponível para agendamento"
  observacoes: string | null;
  criado_em: string | null;
  atualizado_em: string | null;
  telefone_formatado: string;
  cpf_formatado: string;
  nome_de_chamada: string; // apelido, ou o primeiro nome se não tiver apelido
  foto_url: string | null; // caminho na API, ex: "/api/barbeiros/3/foto?v=1760000000"
}

export interface DadosDoBarbeiro {
  nome: string;
  telefone: string;
  cpf: string;
  apelido?: string | null;
  email?: string | null;
  data_admissao?: string;
  especialidades: Especialidade[];
  comissao?: number;
  intervalo?: number;
  cor_agenda?: CorDaAgenda;
  horarios: HorarioDoDia[];
  ativo?: boolean;
  observacoes?: string | null;
}

export interface ListaDeBarbeiros {
  total: number;
  itens: Barbeiro[];
}

// ---------------------------------------------------------------- etapa 3: serviços e agenda

export interface Servico {
  id: number;
  nome: string;
  descricao: string | null;
  duracao: number; // minutos de cadeira
  preco: number; // em reais: 45.5
  ativo: boolean; // "no cardápio"
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface DadosDoServico {
  nome: string;
  descricao?: string | null;
  duracao: number;
  preco: number;
  ativo?: boolean;
}

export interface ListaDeServicos {
  total: number;
  itens: Servico[];
}

// mesma lista do schemas/agendamento.py; o nome é como aparece na tela
export const STATUS_DO_AGENDAMENTO = [
  { chave: "agendado", nome: "Agendado" },
  { chave: "concluido", nome: "Concluído" },
  { chave: "cancelado", nome: "Cancelado" },
  { chave: "faltou", nome: "Faltou" },
] as const;

export type StatusDoAgendamento = (typeof STATUS_DO_AGENDAMENTO)[number]["chave"];

export interface Agendamento {
  id: number;
  data: string; // "2026-10-28"
  hora: string; // "14:30:00"
  hora_fim: string; // a API já soma a duração
  duracao: number;
  preco: number; // o preço combinado na hora de marcar
  status: StatusDoAgendamento;
  observacoes: string | null;
  cliente: { id: number; nome: string; apelido: string | null; telefone_formatado: string };
  barbeiro: { id: number; nome: string; nome_de_chamada: string; cor_agenda: CorDaAgenda; foto_url: string | null };
  servico: { id: number; nome: string };
  criado_em: string | null;
  atualizado_em: string | null;
}

export interface DadosDoAgendamento {
  cliente_id: number;
  barbeiro_id: number;
  servico_id: number;
  data: string;
  hora: string; // "14:30"
  observacoes?: string | null;
}

export interface ListaDeAgendamentos {
  total: number;
  itens: Agendamento[];
}

export interface HorariosLivres {
  data: string;
  horarios: string[]; // "09:00", "09:15"...
  motivo: string | null; // quando não sobra horário, o porquê
}
