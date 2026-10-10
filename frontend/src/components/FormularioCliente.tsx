"use client";

// O formulário do cliente (etapa 1). O mesmo componente serve pra cadastrar e pra editar —
// muda só o que eu recebo por prop.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro, Seletor } from "@/components/Campo";
import Confirmacao from "@/components/Confirmacao";
import FichaResumo from "@/components/FichaResumo";
import Opcao, { GrupoDeOpcoes } from "@/components/Opcao";
import RodapeDoFormulario from "@/components/RodapeDoFormulario";
import Secao from "@/components/Secao";
import { atualizarCliente, cadastrarCliente, excluirCliente, lerErroDoFormulario, listarBarbeiros } from "@/lib/api";
import { conferirIdentificacao, mascaraCpf, mascaraTelefone, soNumeros } from "@/lib/mascaras";
import { ORIGENS, type Cliente, type DadosDoCliente, type Origem } from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

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

/** Validação rápida aqui no navegador. A do servidor continua valendo. */
function conferirCampos(dados: Formulario): Record<string, string> {
  const problemas = conferirIdentificacao(dados);
  if (dados.data_nascimento && dados.data_nascimento > new Date().toISOString().slice(0, 10)) {
    problemas.data_nascimento = "A data não pode estar no futuro.";
  }
  return problemas;
}

/** Monta o corpo do jeito que a API espera (campo em branco vira null). */
function montarEnvio(dados: Formulario): DadosDoCliente {
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

export default function FormularioCliente({ clienteExistente }: { clienteExistente?: Cliente }) {
  const editando = Boolean(clienteExistente);
  const navegador = useRouter();

  const { dados, setDados, erros, setErros, aviso, setAviso, mudar } = useFormulario(() =>
    clienteExistente ? preencherCom(clienteExistente) : FORMULARIO_VAZIO,
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Cliente | null>(null);

  // o "barbeiro preferido" lista a equipe cadastrada (só quem está disponível)
  const [equipe, setEquipe] = useState<string[]>([]);

  useEffect(() => {
    listarBarbeiros("", 1, 100, true)
      .then((resposta) => setEquipe(resposta.itens.map((barbeiro) => barbeiro.nome_de_chamada)))
      .catch(() => setEquipe([])); // sem API o select fica só com "Sem preferência" e o valor atual
  }, []);

  // se o cliente tinha um barbeiro que saiu da equipe, mantenho ele na lista
  // pra não trocar a preferência sem a recepção perceber
  const opcoesDeBarbeiro = ["Sem preferência", ...equipe];
  if (!opcoesDeBarbeiro.includes(dados.barbeiro_preferido)) {
    opcoesDeBarbeiro.push(dados.barbeiro_preferido);
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    const problemas = conferirCampos(dados);
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      setAviso(`Faltando: ${Object.keys(problemas).join(", ")}`);
      return;
    }

    setSalvando(true);
    try {
      const cliente = clienteExistente
        ? await atualizarCliente(clienteExistente.id, montarEnvio(dados))
        : await cadastrarCliente(montarEnvio(dados));
      setSalvo(cliente);
      navegador.refresh(); // pra lista de clientes já vir atualizada
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
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

  if (salvo) {
    return (
      <Confirmacao
        titulo={editando ? "Ficha atualizada." : `${salvo.nome.split(" ")[0]} está na base.`}
        acoes={
          <>
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
          </>
        }
      >
        <p className="m-0">
          {editando
            ? "As alterações já valem para os próximos agendamentos."
            : "Ficha salva. A partir daqui é só marcar o horário."}
        </p>
      </Confirmacao>
    );
  }

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Editar cliente" : "Cadastrar cliente"}
          </h1>
          <p className="mb-7.5 max-w-130 text-sm leading-relaxed text-tinta-media">
            Pergunte o telefone primeiro — é a chave de busca na agenda. O resto pode ser completado depois pelo próprio
            cliente.
          </p>

          <Secao titulo="Identificação" />

          <div className="mb-8.5 grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Telefone / WhatsApp" erro={erros.telefone}>
              <input
                type="tel"
                inputMode="numeric"
                autoComplete="off"
                placeholder="(11) 90000-0000"
                value={dados.telefone}
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

          <div className="mb-8.5 flex flex-col gap-5.5">
            <Campo rotulo="Barbeiro preferido" className="max-w-85">
              <Seletor value={dados.barbeiro_preferido} onChange={(e) => mudar("barbeiro_preferido", e.target.value)}>
                {opcoesDeBarbeiro.map((barbeiro) => (
                  <option key={barbeiro}>{barbeiro}</option>
                ))}
              </Seletor>
            </Campo>

            <GrupoDeOpcoes rotulo="Como nos conheceu">
              {ORIGENS.map((origem) => (
                <Opcao key={origem} marcada={dados.origem === origem} onClick={() => mudar("origem", origem)}>
                  {origem}
                </Opcao>
              ))}
            </GrupoDeOpcoes>

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

      <RodapeDoFormulario
        aviso={aviso}
        salvando={salvando}
        rotuloSalvar={editando ? "Salvar alterações" : "Salvar cliente"}
        voltarPara="/clientes"
        onExcluir={editando ? excluir : undefined}
      />
    </form>
  );
}
