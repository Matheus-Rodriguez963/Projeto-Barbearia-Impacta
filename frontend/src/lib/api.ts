// Tudo que fala com o FastAPI passa por aqui. Assim, se o endereço da API mudar,
// eu mexo num lugar só.

import type { Cliente, DadosDoCliente, ErroDeCampo, ListaDeClientes } from "./tipos";

const URL_DA_API = process.env.NEXT_PUBLIC_URL_API ?? "http://localhost:8000";

/** Erro meu, pra conseguir mostrar a mensagem no campo certo do formulário. */
export class ErroDaApi extends Error {
  status: number;
  erros: ErroDeCampo[];
  campo?: string;

  constructor(mensagem: string, status: number, erros: ErroDeCampo[] = [], campo?: string) {
    super(mensagem);
    this.name = "ErroDaApi";
    this.status = status;
    this.erros = erros;
    this.campo = campo;
  }
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(`${URL_DA_API}${caminho}`, {
      headers: { "Content-Type": "application/json" },
      cache: "no-store", // cadastro tem que aparecer na hora, sem cache
      ...opcoes,
    });
  } catch {
    // caiu aqui = nem chegou na API (normalmente o uvicorn não está rodando)
    throw new ErroDaApi("Não consegui falar com a API. Ela está rodando na porta 8000?", 0);
  }

  if (resposta.status === 204) {
    return undefined as T; // o DELETE não devolve corpo nenhum
  }

  const conteudo = await resposta.json().catch(() => ({}));

  if (!resposta.ok) {
    throw new ErroDaApi(
      conteudo.detail ?? "Deu algum problema ao falar com a API.",
      resposta.status,
      conteudo.erros ?? [],
      conteudo.campo,
    );
  }

  return conteudo as T;
}

export function listarClientes(busca = "", pagina = 1, tamanho = 20) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(tamanho) });
  if (busca.trim()) parametros.set("busca", busca.trim());

  return requisitar<ListaDeClientes>(`/api/clientes?${parametros}`);
}

export function buscarCliente(id: number) {
  return requisitar<Cliente>(`/api/clientes/${id}`);
}

export function buscarClientePorTelefone(telefone: string) {
  return requisitar<Cliente>(`/api/clientes/telefone/${encodeURIComponent(telefone)}`);
}

export function cadastrarCliente(dados: DadosDoCliente) {
  return requisitar<Cliente>("/api/clientes", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarCliente(id: number, dados: Partial<DadosDoCliente>) {
  return requisitar<Cliente>(`/api/clientes/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirCliente(id: number) {
  return requisitar<void>(`/api/clientes/${id}`, { method: "DELETE" });
}
