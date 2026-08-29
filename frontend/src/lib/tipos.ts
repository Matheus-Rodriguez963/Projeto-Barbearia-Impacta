// Os tipos que a API devolve. Deixei igualzinho aos schemas do FastAPI
// pra não me perder na hora de ler o JSON.

export type Origem = "Indicação" | "Passou na porta" | "Instagram" | "Google";

export const ORIGENS: Origem[] = ["Indicação", "Passou na porta", "Instagram", "Google"];

export const BARBEIROS = ["Sem preferência", "Seu Alfredo", "Tião da Navalha", "Marcos", "Beto"];

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
