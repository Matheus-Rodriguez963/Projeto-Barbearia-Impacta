"use client";

// O formulário do barbeiro (etapa 2). Igual ao do cliente: o mesmo componente cadastra
// e edita, e o cartão da direita vai mostrando como o cliente vai ver o barbeiro.

import { useRouter } from "next/navigation";
import { useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro, Seletor } from "@/components/Campo";
import Confirmacao from "@/components/Confirmacao";
import EscolherFoto, { useFotoDePerfil } from "@/components/EscolherFoto";
import FichaBarbeiro from "@/components/FichaBarbeiro";
import JornadaSemanal from "@/components/JornadaSemanal";
import Opcao, { GrupoDeOpcoes } from "@/components/Opcao";
import RodapeDoFormulario from "@/components/RodapeDoFormulario";
import Secao from "@/components/Secao";
import { atualizarBarbeiro, cadastrarBarbeiro, enderecoDaFoto, excluirBarbeiro, lerErroDoFormulario } from "@/lib/api";
import { conferirIdentificacao, mascaraCpf, mascaraTelefone, soNumeros } from "@/lib/mascaras";
import {
  diasComHorarioErrado,
  diasTrabalhados,
  horariosDa,
  semanaDe,
  semanaPadrao,
  type Dia,
  type Semana,
} from "@/lib/semana";
import {
  CORES_DA_AGENDA,
  ESPECIALIDADES,
  INTERVALOS,
  type Barbeiro,
  type CorDaAgenda,
  type DadosDoBarbeiro,
  type DiaDaSemana,
  type Especialidade,
} from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

interface Formulario {
  nome: string;
  apelido: string;
  telefone: string;
  email: string;
  cpf: string;
  desde: string; // "2019-08" — o input de mês devolve assim
  especialidades: Especialidade[];
  comissao: string; // string porque é o que o input devolve; viro número só no envio
  intervalo: number;
  cor_agenda: CorDaAgenda;
  semana: Semana;
  ativo: boolean;
}

function formularioVazio(): Formulario {
  return {
    nome: "",
    apelido: "",
    telefone: "",
    email: "",
    cpf: "",
    // em branco de propósito: essa tela é montada no build do Next, e o mês atual
    // ficaria congelado no mês do build. Em branco, a API usa o dia de hoje.
    desde: "",
    especialidades: ["Corte clássico", "Barba na navalha"],
    comissao: "40",
    intervalo: 5,
    cor_agenda: "terracota",
    semana: semanaPadrao(),
    ativo: true,
  };
}

function preencherCom(barbeiro: Barbeiro): Formulario {
  return {
    nome: barbeiro.nome,
    apelido: barbeiro.apelido ?? "",
    telefone: barbeiro.telefone_formatado,
    email: barbeiro.email ?? "",
    cpf: barbeiro.cpf_formatado,
    desde: barbeiro.data_admissao.slice(0, 7),
    especialidades: barbeiro.especialidades,
    comissao: String(barbeiro.comissao),
    intervalo: barbeiro.intervalo,
    cor_agenda: barbeiro.cor_agenda,
    semana: semanaDe(barbeiro.horarios),
    ativo: barbeiro.ativo,
  };
}

/** "2026-10" no fuso daqui (o toISOString daria o mês de Londres na virada do mês). */
function mesAtual(): string {
  const agora = new Date();
  return `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}`;
}

/** Validação rápida aqui no navegador. A do servidor continua valendo. */
function conferirCampos(dados: Formulario): Record<string, string> {
  const problemas = conferirIdentificacao(dados);
  const comissao = Number(dados.comissao);

  if (dados.desde > mesAtual()) {
    problemas.data_admissao = "Não pode ser um mês que ainda não chegou.";
  }
  if (dados.especialidades.length === 0) {
    problemas.especialidades = "Marque pelo menos uma especialidade.";
  }
  if (dados.comissao === "" || !Number.isInteger(comissao) || comissao < 0 || comissao > 100) {
    problemas.comissao = "Use um número inteiro de 0 a 100.";
  }
  if (diasTrabalhados(dados.semana).length === 0) {
    problemas.horarios = "Marque pelo menos um dia de trabalho.";
  } else if (diasComHorarioErrado(dados.semana).length > 0) {
    problemas.horarios = "Nos dias marcados em vermelho, a saída tem que ser depois da entrada.";
  }

  return problemas;
}

function montarEnvio(dados: Formulario): DadosDoBarbeiro {
  return {
    nome: dados.nome.trim(),
    apelido: dados.apelido.trim() || null,
    telefone: soNumeros(dados.telefone),
    cpf: soNumeros(dados.cpf),
    email: dados.email.trim() || null,
    // a tela pede só mês e ano, então mando o dia 1. Em branco nem mando (a API usa hoje)
    data_admissao: dados.desde ? `${dados.desde}-01` : undefined,
    especialidades: dados.especialidades,
    comissao: Number(dados.comissao),
    intervalo: dados.intervalo,
    cor_agenda: dados.cor_agenda,
    horarios: horariosDa(dados.semana),
    ativo: dados.ativo,
  };
}

// os nomes que aparecem no aviso do rodapé quando falta alguma coisa
const NOMES_DOS_CAMPOS: Record<string, string> = {
  cpf: "CPF",
  email: "e-mail",
  data_admissao: "na casa desde",
  comissao: "comissão",
  cor_agenda: "cor",
  horarios: "dias e horários",
};

export default function FormularioBarbeiro({ barbeiroExistente }: { barbeiroExistente?: Barbeiro }) {
  const editando = Boolean(barbeiroExistente);
  const navegador = useRouter();

  const { dados, setDados, erros, setErros, aviso, setAviso, mudar, limparErro } = useFormulario(() =>
    barbeiroExistente ? preencherCom(barbeiroExistente) : formularioVazio(),
  );
  const foto = useFotoDePerfil(enderecoDaFoto(barbeiroExistente?.foto_url ?? null));
  const [diasComErro, setDiasComErro] = useState<DiaDaSemana[]>([]);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Barbeiro | null>(null);
  const [avisoDaFoto, setAvisoDaFoto] = useState("");

  function mudarDia(dia: DiaDaSemana, mudanca: Partial<Dia>) {
    setDados((atual) => ({ ...atual, semana: { ...atual.semana, [dia]: { ...atual.semana[dia], ...mudanca } } }));
    setDiasComErro((atual) => atual.filter((d) => d !== dia));
    limparErro("horarios");
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    const problemas = conferirCampos(dados);
    setDiasComErro(diasComHorarioErrado(dados.semana));
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      setAviso(
        `Confira: ${Object.keys(problemas)
          .map((campo) => NOMES_DOS_CAMPOS[campo] ?? campo)
          .join(", ")}`,
      );
      return;
    }

    setSalvando(true);
    let barbeiro: Barbeiro;
    try {
      barbeiro = barbeiroExistente
        ? await atualizarBarbeiro(barbeiroExistente.id, montarEnvio(dados))
        : await cadastrarBarbeiro(montarEnvio(dados));
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
      setSalvando(false);
      return;
    }

    // a ficha já está salva aqui. Se só a foto falhar, não desfaço o cadastro: aviso
    // e a pessoa troca a foto depois pela edição.
    try {
      barbeiro = await foto.sincronizar(barbeiro);
      setAvisoDaFoto("");
    } catch (erro) {
      setAvisoDaFoto(
        `A ficha foi salva, mas a foto não (${lerErroDoFormulario(erro).aviso}). Escolha de novo pela edição.`,
      );
    }

    setSalvo(barbeiro);
    setSalvando(false);
    navegador.refresh();
  }

  async function excluir() {
    if (!barbeiroExistente) return;

    setSalvando(true);
    try {
      await excluirBarbeiro(barbeiroExistente.id);
      navegador.push("/barbeiros");
      navegador.refresh();
    } catch {
      setAviso("Não consegui excluir esse cadastro.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <Confirmacao
        titulo={editando ? "Ficha atualizada." : `${salvo.nome_de_chamada} entrou para a equipe.`}
        acoes={
          <>
            <Botao
              onClick={() => {
                setSalvo(null);
                if (!editando) {
                  setDados(formularioVazio());
                  foto.recomecar();
                }
              }}
            >
              {editando ? "Voltar à ficha" : "Cadastrar outro"}
            </Botao>
            <BotaoLink href="/barbeiros" estilo="principal">
              Ver equipe
            </BotaoLink>
          </>
        }
      >
        <p className="m-0">
          {salvo.ativo
            ? "Já aparece como opção de barbeiro preferido na ficha dos clientes."
            : "Está fora do agendamento, então não aparece para os clientes escolherem."}
        </p>
        {avisoDaFoto && <p className="m-0 text-[13px] text-erro">{avisoDaFoto}</p>}
      </Confirmacao>
    );
  }

  const nomeExibido = dados.apelido.trim() || dados.nome.trim();

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <h1 className="mb-7.5 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Editar barbeiro" : "Cadastrar barbeiro"}
          </h1>

          <EscolherFoto foto={foto} />

          <Secao titulo="Dados pessoais" />

          <div className="mb-8.5 grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Nome completo" erro={erros.nome}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Nome do barbeiro"
                value={dados.nome}
                onChange={(e) => mudar("nome", e.target.value)}
                className={classeInputComErro(Boolean(erros.nome))}
              />
            </Campo>

            <Campo rotulo="Nome na cadeira" opcional erro={erros.apelido}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Como o cliente vai ver"
                value={dados.apelido}
                onChange={(e) => mudar("apelido", e.target.value)}
                className={classeInputComErro(Boolean(erros.apelido))}
              />
            </Campo>

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

            <Campo rotulo="E-mail" opcional erro={erros.email}>
              <input
                type="email"
                autoComplete="off"
                placeholder="barbeiro@email.com"
                value={dados.email}
                onChange={(e) => mudar("email", e.target.value)}
                className={classeInputComErro(Boolean(erros.email))}
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

            <Campo rotulo="Na casa desde" opcional erro={erros.data_admissao}>
              <input
                type="month"
                title="Em branco, fica registrado o mês atual"
                value={dados.desde}
                onChange={(e) => mudar("desde", e.target.value, "data_admissao")}
                className={classeInputComErro(Boolean(erros.data_admissao))}
              />
            </Campo>
          </div>

          <Secao titulo="Ofício" />

          <div className="mb-8.5 flex flex-col gap-5.5">
            <GrupoDeOpcoes rotulo="Especialidades" erro={erros.especialidades}>
              {ESPECIALIDADES.map((especialidade) => {
                const marcada = dados.especialidades.includes(especialidade);
                const outras = dados.especialidades.filter((e) => e !== especialidade);
                return (
                  <Opcao
                    key={especialidade}
                    marcada={marcada}
                    onClick={() => mudar("especialidades", marcada ? outras : [...outras, especialidade])}
                  >
                    {especialidade}
                  </Opcao>
                );
              })}
            </GrupoDeOpcoes>

            <div className="grid grid-cols-1 items-end gap-x-6 gap-y-5 sm:grid-cols-3">
              <Campo rotulo="Comissão" erro={erros.comissao}>
                <span className="relative block">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={100}
                    step={1}
                    value={dados.comissao}
                    onChange={(e) => mudar("comissao", e.target.value)}
                    className={`${classeInputComErro(Boolean(erros.comissao))} pr-13`}
                  />
                  <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-rotulo text-[10px] text-rotulo">
                    %
                  </span>
                </span>
              </Campo>

              <Campo rotulo="Intervalo" erro={erros.intervalo}>
                <Seletor
                  temErro={Boolean(erros.intervalo)}
                  value={dados.intervalo}
                  onChange={(e) => mudar("intervalo", Number(e.target.value))}
                >
                  {INTERVALOS.map((minutos) => (
                    <option key={minutos} value={minutos}>
                      {minutos === 0 ? "Nenhum" : `${minutos} min`}
                    </option>
                  ))}
                </Seletor>
              </Campo>

              <div className="flex flex-col gap-1.5">
                <span id="rotulo-cor" className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                  Cor na agenda
                </span>
                <div role="radiogroup" aria-labelledby="rotulo-cor" className="flex gap-2.5 pb-2">
                  {CORES_DA_AGENDA.map((cor) => (
                    <button
                      key={cor.chave}
                      type="button"
                      role="radio"
                      aria-checked={dados.cor_agenda === cor.chave}
                      aria-label={cor.nome}
                      title={cor.nome}
                      onClick={() => mudar("cor_agenda", cor.chave)}
                      className={`size-8.5 cursor-pointer border border-mogno/30 outline-2 outline-offset-3 ${cor.fundo} ${
                        dados.cor_agenda === cor.chave ? "outline-latao" : "outline-transparent hover:opacity-85"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <Secao titulo="Dias e horários" />

          <JornadaSemanal semana={dados.semana} diasComErro={diasComErro} erro={erros.horarios} onMudarDia={mudarDia} />
        </div>

        <FichaBarbeiro
          nomeExibido={nomeExibido}
          desde={dados.desde}
          especialidades={dados.especialidades}
          diasTrabalhados={diasTrabalhados(dados.semana)}
          cor={dados.cor_agenda}
          foto={foto.naTela}
          ativo={dados.ativo}
          onMudarAtivo={(ativo) => mudar("ativo", ativo)}
        />
      </div>

      <RodapeDoFormulario
        aviso={aviso}
        salvando={salvando || foto.preparando}
        rotuloSalvar={editando ? "Salvar alterações" : "Salvar barbeiro"}
        voltarPara="/barbeiros"
        onExcluir={editando ? excluir : undefined}
      />
    </form>
  );
}
