"use client";

// Coração da etapa 1: o formulário de cadastro do cliente.
// O mesmo componente serve pra cadastrar e pra editar — muda só o que eu recebo por prop.

import { useRouter } from "next/navigation";
import { useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import FichaResumo from "@/components/FichaResumo";
import Secao from "@/components/Secao";
import { atualizarCliente, cadastrarCliente, ErroDaApi, excluirCliente } from "@/lib/api";
import { cpfValido, mascaraCpf, mascaraTelefone, soNumeros, telefoneValido } from "@/lib/mascaras";
import { BARBEIROS, ORIGENS, type Cliente, type DadosDoCliente, type Origem } from "@/lib/tipos";

/** O formulário em si — tudo string, que é o que o input devolve. */
interface Formulario {
  nome: string;
  apelido: string;
  telefone: string;
  cpf: string;
  email: string;
  data_nascimento: string;
  barbeiro_preferido: string;
  origem: Origem;
  observacoes: string;
}

const FORMULARIO_VAZIO: Formulario = {
  nome: "",
  apelido: "",
  telefone: "",
  cpf: "",
  email: "",
  data_nascimento: "",
  barbeiro_preferido: "Sem preferência",
  origem: "Indicação",
  observacoes: "",
};

/** Pega o cliente que veio da API e joga nos campos do formulário (modo edição). */
function preencherCom(cliente: Cliente): Formulario {
  return {
    nome: cliente.nome,
    apelido: cliente.apelido ?? "",
    telefone: cliente.telefone_formatado,
    cpf: cliente.cpf_formatado,
    email: cliente.email ?? "",
    data_nascimento: cliente.data_nascimento ?? "",
    barbeiro_preferido: cliente.barbeiro_preferido,
    origem: cliente.origem,
    observacoes: cliente.observacoes ?? "",
  };
}

export default function FormularioCliente({ clienteExistente }: { clienteExistente?: Cliente }) {
  const editando = Boolean(clienteExistente);
  const navegador = useRouter();

  const [dados, setDados] = useState<Formulario>(
    clienteExistente ? preencherCom(clienteExistente) : FORMULARIO_VAZIO,
  );
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Cliente | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);

  /** Atualiza um campo e já limpa o erro dele (senão o vermelho fica na tela pra sempre). */
  function mudar<C extends keyof Formulario>(campo: C, valor: Formulario[C]) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    setErros((atual) => {
      const semEsse = { ...atual };
      delete semEsse[campo];
      return semEsse;
    });
    setAviso("");
  }

  /** Validação rápida aqui no navegador. A do servidor continua valendo. */
  function conferirCampos(): Record<string, string> {
    const problemas: Record<string, string> = {};

    if (dados.nome.trim().split(/\s+/).filter(Boolean).length < 2) {
      problemas.nome = "Informe o nome completo (nome e sobrenome).";
    }
    if (!telefoneValido(dados.telefone)) {
      problemas.telefone = "Telefone inválido. Ex: (11) 99000-1234";
    }
    if (!cpfValido(dados.cpf)) {
      problemas.cpf = "CPF inválido. Confira os números.";
    }
    if (dados.email.trim() && !dados.email.includes("@")) {
      problemas.email = "E-mail inválido.";
    }
    if (dados.data_nascimento && dados.data_nascimento > new Date().toISOString().slice(0, 10)) {
      problemas.data_nascimento = "A data não pode estar no futuro.";
    }

    return problemas;
  }

  /** Monta o corpo do jeito que a API espera (campo em branco vira null). */
  function montarEnvio(): DadosDoCliente {
    return {
      nome: dados.nome.trim(),
      telefone: soNumeros(dados.telefone),
      cpf: soNumeros(dados.cpf),
      apelido: dados.apelido.trim() || null,
      email: dados.email.trim() || null,
      data_nascimento: dados.data_nascimento || null,
      barbeiro_preferido: dados.barbeiro_preferido,
      origem: dados.origem,
      observacoes: dados.observacoes.trim() || null,
    };
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    const problemas = conferirCampos();
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      setAviso(`Faltando: ${Object.keys(problemas).join(", ")}`);
      return;
    }

    setSalvando(true);
    setErros({});
    setAviso("");

    try {
      const cliente = clienteExistente
        ? await atualizarCliente(clienteExistente.id, montarEnvio())
        : await cadastrarCliente(montarEnvio());

      setSalvo(cliente);
      navegador.refresh(); // pra lista de clientes já vir atualizada
    } catch (erro) {
      if (erro instanceof ErroDaApi) {
        // 422: a API diz campo por campo o que está errado
        if (erro.erros.length > 0) {
          setErros(Object.fromEntries(erro.erros.map((e) => [e.campo, e.mensagem])));
        }
        // 409: telefone/CPF/e-mail já cadastrado em outra ficha
        if (erro.campo) {
          setErros((atual) => ({ ...atual, [erro.campo as string]: erro.message }));
        }
        setAviso(erro.message);
      } else {
        setAviso("Não deu pra salvar agora. Tenta de novo.");
      }
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!clienteExistente) return;

    setSalvando(true);
    try {
      await excluirCliente(clienteExistente.id);
      navegador.push("/clientes");
      navegador.refresh();
    } catch {
      setAviso("Não consegui excluir esse cadastro.");
      setSalvando(false);
    }
  }

  // ---------------------------------------------------------------- tela de "deu certo"
  if (salvo) {
    const primeiroNome = salvo.nome.split(" ")[0];

    return (
      <section className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
        <div className="flex size-15 items-center justify-center border border-latao text-[26px] text-terracota">
          ✓
        </div>
        <h2 className="m-0 font-titulo text-[34px] leading-tight text-tinta">
          {editando ? "Ficha atualizada." : `${primeiroNome} está na base.`}
        </h2>
        <p className="m-0 max-w-110 text-[15px] leading-relaxed text-tinta-media">
          {editando
            ? "As alterações já valem para os próximos agendamentos."
            : "Ficha salva. A partir daqui é só marcar o horário."}
        </p>

        <div className="mt-2 flex flex-wrap justify-center gap-3.5">
          <Botao
            onClick={() => {
              // volto pro formulário: se cadastrei, começo outro do zero
              setSalvo(null);
              if (!editando) setDados(FORMULARIO_VAZIO);
            }}
          >
            {editando ? "Voltar à ficha" : "Cadastrar outro"}
          </Botao>
          <BotaoLink href="/clientes" estilo="principal">
            Ver lista de clientes
          </BotaoLink>
        </div>
      </section>
    );
  }

  // ---------------------------------------------------------------- formulário
  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8 md:px-10">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Editar cliente" : "Cadastrar cliente"}
          </h1>
          <p className="mb-7 max-w-130 text-sm leading-relaxed text-tinta-media">
            Pergunte o telefone primeiro — é a chave de busca na agenda. O resto pode ser completado
            depois pelo próprio cliente.
          </p>

          <Secao titulo="Identificação" />

          <div className="mb-8 grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2">
            <Campo rotulo="Telefone / WhatsApp" erro={erros.telefone}>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="(11) 90000-0000"
                value={dados.telefone}
                // a máscara é aplicada a cada tecla digitada
                onChange={(e) => mudar("telefone", mascaraTelefone(e.target.value))}
                className={classeInputComErro(Boolean(erros.telefone))}
              />
            </Campo>

            <Campo rotulo="Nome completo" erro={erros.nome}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Nome do cliente"
                value={dados.nome}
                onChange={(e) => mudar("nome", e.target.value)}
                className={classeInputComErro(Boolean(erros.nome))}
              />
            </Campo>

            <Campo rotulo="Como chamar" opcional erro={erros.apelido}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Apelido"
                value={dados.apelido}
                onChange={(e) => mudar("apelido", e.target.value)}
                className={classeInputComErro(Boolean(erros.apelido))}
              />
            </Campo>

            <Campo rotulo="E-mail" opcional erro={erros.email}>
              <input
                type="email"
                autoComplete="off"
                placeholder="voce@email.com"
                value={dados.email}
                onChange={(e) => mudar("email", e.target.value)}
                className={classeInputComErro(Boolean(erros.email))}
              />
            </Campo>

            <Campo rotulo="Data de nascimento" opcional erro={erros.data_nascimento}>
              <input
                type="date"
                value={dados.data_nascimento}
                onChange={(e) => mudar("data_nascimento", e.target.value)}
                className={classeInputComErro(Boolean(erros.data_nascimento))}
              />
            </Campo>

            <Campo rotulo="CPF" erro={erros.cpf}>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="000.000.000-00"
                value={dados.cpf}
                onChange={(e) => mudar("cpf", mascaraCpf(e.target.value))}
                className={classeInputComErro(Boolean(erros.cpf))}
              />
            </Campo>
          </div>

          <Secao titulo="Preferências" />

          <div className="mb-8 flex flex-col gap-5">
            <Campo rotulo="Barbeiro preferido" className="max-w-85">
              <span className="relative block">
                <select
                  value={dados.barbeiro_preferido}
                  onChange={(e) => mudar("barbeiro_preferido", e.target.value)}
                  className={`${classeInputComErro(false)} cursor-pointer appearance-none pr-9`}
                >
                  {BARBEIROS.map((barbeiro) => (
                    <option key={barbeiro}>{barbeiro}</option>
                  ))}
                </select>
                <span className="pointer-events-none absolute top-4 right-3.5 text-[11px] text-[#9a5a2e]">▼</span>
              </span>
            </Campo>

            <div className="flex flex-col gap-2.5">
              <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                Como nos conheceu
              </span>
              <div className="flex flex-wrap gap-2.5">
                {ORIGENS.map((origem) => {
                  const marcada = dados.origem === origem;
                  return (
                    <button
                      key={origem}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => mudar("origem", origem)}
                      className={`cursor-pointer border px-4 py-2.5 font-rotulo text-[10px] tracking-[0.18em] uppercase ${
                        marcada
                          ? "border-terracota bg-terracota text-creme"
                          : "border-mogno/30 text-[#6b563f] hover:border-terracota hover:text-tinta"
                      }`}
                    >
                      {origem}
                    </button>
                  );
                })}
              </div>
            </div>

            <Campo rotulo="Observações internas" opcional className="max-w-130">
              <textarea
                rows={3}
                placeholder="Máquina 2 nas laterais, não gosta de conversa antes do café."
                value={dados.observacoes}
                onChange={(e) => mudar("observacoes", e.target.value)}
                className={`${classeInputComErro(false)} resize-y text-[15px] leading-relaxed`}
              />
            </Campo>
          </div>
        </div>

        <FichaResumo
          nome={dados.nome}
          telefone={dados.telefone}
          email={dados.email}
          barbeiro={dados.barbeiro_preferido}
          origem={dados.origem}
          status={editando ? "Cadastro já existente" : undefined}
        />
      </div>

      {/* rodapé com os botões */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-mogno/15 bg-papel-claro/70 px-6 py-5 md:px-10">
        <div className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">{aviso}</div>

        <div className="ml-auto flex flex-wrap items-center gap-3.5">
          {editando &&
            (confirmandoExclusao ? (
              // confirmação na própria tela, sem popup do navegador
              <>
                <span className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">
                  Excluir mesmo?
                </span>
                <Botao type="button" onClick={() => setConfirmandoExclusao(false)}>
                  Não
                </Botao>
                <Botao
                  type="button"
                  onClick={excluir}
                  disabled={salvando}
                  className="border-erro text-erro hover:bg-erro/10"
                >
                  Sim, excluir
                </Botao>
              </>
            ) : (
              <Botao type="button" onClick={() => setConfirmandoExclusao(true)} className="border-erro/50 text-erro">
                Excluir
              </Botao>
            ))}

          <BotaoLink href="/clientes">Cancelar</BotaoLink>

          <Botao type="submit" estilo="principal" disabled={salvando}>
            {salvando ? "Salvando..." : editando ? "Salvar alterações" : "Salvar cliente"}
          </Botao>
        </div>
      </footer>
    </form>
  );
}
