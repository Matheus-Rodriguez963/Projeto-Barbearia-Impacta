// Tudo que fala com o FastAPI passa por aqui. Assim, se o endereço da API mudar,
// eu mexo num lugar só.

import type {
  Agendamento,
  Aparencia,
  Barbeiro,
  Cliente,
  DadosDaAparencia,
  DadosDoAgendamento,
  DadosDoBarbeiro,
  DadosDoCliente,
  DadosDoServico,
  DiaDoMes,
  ErroDeCampo,
  FiltroDeSituacao,
  GradeDoDia,
  ListaDeBarbeiros,
  ListaDeClientes,
  ListaDeHistorico,
  ListaDeServicos,
  ResumoDoMes,
  Servico,
  Situacao,
  UsuarioLogado,
} from "./tipos";

export const URL_DA_API = process.env.NEXT_PUBLIC_URL_API ?? "http://localhost:8000";

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

/** Transforma o erro de um "salvar" em {campo: mensagem} pro formulário pintar os campos certos. */
export function lerErroDoFormulario(erro: unknown): { erros: Record<string, string>; aviso: string } {
  if (!(erro instanceof ErroDaApi)) {
    return { erros: {}, aviso: "Não deu pra salvar agora. Tenta de novo." };
  }

  // 422 traz a lista campo por campo; 409 traz um campo só (telefone/CPF/e-mail repetido)
  const erros = Object.fromEntries(erro.erros.map((e) => [e.campo, e.mensagem]));
  if (erro.campo) erros[erro.campo] = erro.message;

  return { erros, aviso: erro.message };
}

async function requisitar<T>(caminho: string, opcoes: RequestInit = {}): Promise<T> {
  let resposta: Response;

  try {
    resposta = await fetch(`${URL_DA_API}${caminho}`, {
      // no upload da foto o corpo é um FormData, e aí o próprio navegador
      // precisa montar o Content-Type (ele coloca o "boundary" que separa as partes)
      headers: opcoes.body instanceof FormData ? {} : { "Content-Type": "application/json" },
      cache: "no-store", // cadastro tem que aparecer na hora, sem cache
      credentials: "include", // manda o cookie da sessão (o site e a API estão em portas diferentes)
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

  // sessão vencida (ou acesso bloqueado no meio do uso): volta pra tela de login.
  // O 401 do próprio login é só "senha errada", e a tela de login não se redireciona.
  if (
    resposta.status === 401 &&
    typeof window !== "undefined" &&
    caminho !== "/api/login" &&
    window.location.pathname !== "/login"
  ) {
    window.location.replace("/login");
  }

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

// ---------------------------------------------------------------- barbeiros (etapa 2)

/** ativo: true = só quem está trabalhando, false = só os desligados, undefined = todos */
export function listarBarbeiros(busca = "", pagina = 1, tamanho = 20, ativo?: boolean) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(tamanho) });
  if (busca.trim()) parametros.set("busca", busca.trim());
  if (ativo !== undefined) parametros.set("ativo", String(ativo));

  return requisitar<ListaDeBarbeiros>(`/api/barbeiros?${parametros}`);
}

export function buscarBarbeiro(id: number) {
  return requisitar<Barbeiro>(`/api/barbeiros/${id}`);
}

export function cadastrarBarbeiro(dados: DadosDoBarbeiro) {
  return requisitar<Barbeiro>("/api/barbeiros", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarBarbeiro(id: number, dados: Partial<DadosDoBarbeiro>) {
  return requisitar<Barbeiro>(`/api/barbeiros/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

/** O foto_url que a API devolve é só o caminho; aqui eu junto com o endereço da API. */
export function enderecoDaFoto(fotoUrl: string | null) {
  return fotoUrl ? `${URL_DA_API}${fotoUrl}` : null;
}

export function enviarFotoBarbeiro(id: number, foto: Blob) {
  const corpo = new FormData();
  corpo.append("foto", foto, "foto.jpg");
  return requisitar<Barbeiro>(`/api/barbeiros/${id}/foto`, { method: "PUT", body: corpo });
}

export function removerFotoBarbeiro(id: number) {
  return requisitar<Barbeiro>(`/api/barbeiros/${id}/foto`, { method: "DELETE" });
}

export function excluirBarbeiro(id: number) {
  return requisitar<void>(`/api/barbeiros/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- serviços (etapa 3)

/** ativo: true = só o que está no cardápio, undefined = todos */
export function listarServicos(busca = "", pagina = 1, tamanho = 20, ativo?: boolean) {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanho: String(tamanho) });
  if (busca.trim()) parametros.set("busca", busca.trim());
  if (ativo !== undefined) parametros.set("ativo", String(ativo));

  return requisitar<ListaDeServicos>(`/api/servicos?${parametros}`);
}

export function buscarServico(id: number) {
  return requisitar<Servico>(`/api/servicos/${id}`);
}

export function cadastrarServico(dados: DadosDoServico) {
  return requisitar<Servico>("/api/servicos", { method: "POST", body: JSON.stringify(dados) });
}

export function atualizarServico(id: number, dados: Partial<DadosDoServico>) {
  return requisitar<Servico>(`/api/servicos/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

export function excluirServico(id: number) {
  return requisitar<void>(`/api/servicos/${id}`, { method: "DELETE" });
}

// ---------------------------------------------------------------- agendamentos (etapa 3)

/** A agenda inteira de um dia ("2026-11-03"), inclusive os cancelados. */
export function agendaDoDia(data: string) {
  return requisitar<Agendamento[]>(`/api/agendamentos?data=${data}`);
}

export function buscarAgendamento(id: number) {
  return requisitar<Agendamento>(`/api/agendamentos/${id}`);
}

/** Os horários que dá pra oferecer. ignorar = o próprio agendamento, quando é remarcação. */
export function horariosLivres(barbeiroId: number, data: string, duracao: number, ignorar?: number) {
  const parametros = new URLSearchParams({ barbeiro_id: String(barbeiroId), data, duracao: String(duracao) });
  if (ignorar !== undefined) parametros.set("ignorar", String(ignorar));

  return requisitar<GradeDoDia>(`/api/agendamentos/horarios?${parametros}`);
}

export function marcarAgendamento(dados: DadosDoAgendamento) {
  return requisitar<Agendamento>("/api/agendamentos", { method: "POST", body: JSON.stringify(dados) });
}

export function remarcarAgendamento(id: number, dados: DadosDoAgendamento) {
  return requisitar<Agendamento>(`/api/agendamentos/${id}`, { method: "PUT", body: JSON.stringify(dados) });
}

export function mudarSituacao(id: number, situacao: Exclude<Situacao, "agendado">) {
  return requisitar<Agendamento>(`/api/agendamentos/${id}/situacao`, {
    method: "PUT",
    body: JSON.stringify({ situacao }),
  });
}

/** Quanto cada dia do mês está ocupado, pras barrinhas do calendário. */
export function ocupacaoDoMes(ano: number, mes: number) {
  return requisitar<DiaDoMes[]>(`/api/agendamentos/ocupacao?ano=${ano}&mes=${mes}`);
}

// ---------------------------------------------------------------- histórico

export interface FiltrosDoHistorico {
  barbeiroId?: number;
  clienteId?: number;
  situacao?: FiltroDeSituacao;
}

/** Os atendimentos de um mês, do mais recente pro mais antigo. */
export function listarHistorico(ano: number, mes: number, filtros: FiltrosDoHistorico = {}, pagina = 1, tamanho = 20) {
  const parametros = new URLSearchParams({
    ano: String(ano),
    mes: String(mes),
    pagina: String(pagina),
    tamanho: String(tamanho),
  });
  if (filtros.barbeiroId !== undefined) parametros.set("barbeiro_id", String(filtros.barbeiroId));
  if (filtros.clienteId !== undefined) parametros.set("cliente_id", String(filtros.clienteId));
  if (filtros.situacao) parametros.set("situacao", filtros.situacao);

  return requisitar<ListaDeHistorico>(`/api/historico?${parametros}`);
}

/** Os números do mês: atendimentos, faturamento, ranking de serviços e duplas mais frequentes. */
export function resumoDoMes(ano: number, mes: number, barbeiroId?: number) {
  const parametros = new URLSearchParams({ ano: String(ano), mes: String(mes) });
  if (barbeiroId !== undefined) parametros.set("barbeiro_id", String(barbeiroId));

  return requisitar<ResumoDoMes>(`/api/historico/resumo?${parametros}`);
}

// ---------------------------------------------------------------- aparência

export function pegarAparencia() {
  return requisitar<Aparencia>("/api/aparencia");
}

export function salvarAparencia(dados: DadosDaAparencia) {
  return requisitar<Aparencia>("/api/aparencia", { method: "PUT", body: JSON.stringify(dados) });
}

/** O logo_url que a API devolve é só o caminho; aqui eu junto com o endereço da API. */
export function enderecoDaLogo(logoUrl: string) {
  return `${URL_DA_API}${logoUrl}`;
}

export function enviarLogo(logo: Blob) {
  const corpo = new FormData();
  corpo.append("logo", logo, "logo.png");
  return requisitar<Aparencia>("/api/aparencia/logo", { method: "PUT", body: corpo });
}

export function removerLogo() {
  return requisitar<Aparencia>("/api/aparencia/logo", { method: "DELETE" });
}

// ---------------------------------------------------------------- login

export function entrar(login: string, senha: string) {
  return requisitar<UsuarioLogado>("/api/login", { method: "POST", body: JSON.stringify({ login, senha }) });
}

export function sair() {
  return requisitar<void>("/api/logout", { method: "POST" });
}

/** Quem está logado agora; dá 401 (ErroDaApi) se não tem sessão válida. */
export function pegarEu() {
  return requisitar<UsuarioLogado>("/api/eu");
}
