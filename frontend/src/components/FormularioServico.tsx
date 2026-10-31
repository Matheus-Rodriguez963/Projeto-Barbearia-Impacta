"use client";

// O formulário do serviço (etapa 3). Mesmo esquema do cliente e do barbeiro: um componente
// só pra cadastrar e editar, e na direita o serviço do jeito que aparece na hora de marcar.

import { useRouter } from "next/navigation";
import { useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import Chave from "@/components/Chave";
import Confirmacao from "@/components/Confirmacao";
import RodapeDoFormulario from "@/components/RodapeDoFormulario";
import Secao from "@/components/Secao";
import { duracaoBonita, reais } from "@/lib/agenda";
import { atualizarServico, cadastrarServico, ErroDaApi, excluirServico, lerErroDoFormulario } from "@/lib/api";
import type { DadosDoServico, Servico } from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

interface Formulario {
  nome: string;
  descricao: string;
  duracao: string; // texto porque é o que o input devolve; viro número no envio
  preco: string; // a recepção digita "55,00" com vírgula
  ativo: boolean;
}

function formularioVazio(): Formulario {
  return { nome: "", descricao: "", duracao: "30", preco: "", ativo: true };
}

function preencherCom(servico: Servico): Formulario {
  return {
    nome: servico.nome,
    descricao: servico.descricao ?? "",
    duracao: String(servico.duracao),
    preco: servico.preco.toFixed(2).replace(".", ","),
    ativo: servico.ativo,
  };
}

/** "55,90" ou "55.90" -> 55.9. Texto que não é número vira NaN e a conferência pega. */
function lerPreco(texto: string): number {
  const limpo = texto.trim();
  if (!limpo) return NaN;
  // com vírgula, o ponto é separador de milhar (1.000,00); sem vírgula, o ponto é o decimal
  return Number(limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo);
}

function conferirCampos(dados: Formulario): Record<string, string> {
  const problemas: Record<string, string> = {};
  const duracao = Number(dados.duracao);
  const preco = lerPreco(dados.preco);

  if (dados.nome.trim().length < 3) problemas.nome = "Dê um nome com pelo menos 3 letras.";
  if (!Number.isInteger(duracao) || duracao < 5 || duracao > 240 || duracao % 5 !== 0) {
    problemas.duracao = "De 5 a 240 minutos, de 5 em 5.";
  }
  if (!(preco > 0) || preco > 1000) problemas.preco = "Use um valor entre R$ 0,01 e R$ 1.000,00.";

  return problemas;
}

function montarEnvio(dados: Formulario): DadosDoServico {
  return {
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim() || null,
    duracao: Number(dados.duracao),
    preco: Math.round(lerPreco(dados.preco) * 100) / 100,
    ativo: dados.ativo,
  };
}

const NOMES_DOS_CAMPOS: Record<string, string> = { descricao: "descrição", duracao: "duração", preco: "preço" };

export default function FormularioServico({ servicoExistente }: { servicoExistente?: Servico }) {
  const editando = Boolean(servicoExistente);
  const navegador = useRouter();

  const { dados, setDados, erros, setErros, aviso, setAviso, mudar } = useFormulario(() =>
    servicoExistente ? preencherCom(servicoExistente) : formularioVazio(),
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Servico | null>(null);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();

    const problemas = conferirCampos(dados);
    if (Object.keys(problemas).length > 0) {
      setErros(problemas);
      setAviso(`Confira: ${Object.keys(problemas).map((campo) => NOMES_DOS_CAMPOS[campo] ?? campo).join(", ")}`);
      return;
    }

    setSalvando(true);
    try {
      const servico = servicoExistente
        ? await atualizarServico(servicoExistente.id, montarEnvio(dados))
        : await cadastrarServico(montarEnvio(dados));
      setSalvo(servico);
      navegador.refresh();
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!servicoExistente) return;

    setSalvando(true);
    try {
      await excluirServico(servicoExistente.id);
      navegador.push("/servicos");
      navegador.refresh();
    } catch (erro) {
      // serviço que já foi marcado não sai: a API pede pra tirar do cardápio
      setAviso(erro instanceof ErroDaApi ? erro.message : "Não consegui excluir esse serviço.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <Confirmacao
        titulo={editando ? "Serviço atualizado." : `${salvo.nome} entrou no cardápio.`}
        acoes={
          <>
            <Botao
              onClick={() => {
                setSalvo(null);
                if (!editando) setDados(formularioVazio());
              }}
            >
              {editando ? "Voltar ao serviço" : "Cadastrar outro"}
            </Botao>
            <BotaoLink href="/servicos" estilo="principal">
              Ver cardápio
            </BotaoLink>
          </>
        }
      >
        <p className="m-0">
          {salvo.ativo
            ? `${duracaoBonita(salvo.duracao)} por ${reais(salvo.preco)}. Já aparece na hora de marcar.`
            : "Está fora do cardápio, então não aparece na hora de marcar."}
        </p>
        {editando && (
          <p className="m-0 text-[13px]">Quem já estava marcado continua com o preço e o tempo de quando marcou.</p>
        )}
      </Confirmacao>
    );
  }

  const precoNaTela = lerPreco(dados.preco);
  const duracaoNaTela = Number(dados.duracao);

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <h1 className="mb-7.5 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Editar serviço" : "Cadastrar serviço"}
          </h1>

          <Secao titulo="O serviço" />

          <div className="mb-8.5 grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Nome" erro={erros.nome}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Ex: Corte clássico"
                value={dados.nome}
                onChange={(e) => mudar("nome", e.target.value)}
                className={classeInputComErro(Boolean(erros.nome))}
              />
            </Campo>

            <Campo rotulo="Descrição" opcional erro={erros.descricao}>
              <input
                type="text"
                autoComplete="off"
                maxLength={120}
                placeholder="O que vem incluído"
                value={dados.descricao}
                onChange={(e) => mudar("descricao", e.target.value)}
                className={classeInputComErro(Boolean(erros.descricao))}
              />
            </Campo>
          </div>

          <Secao titulo="Tempo e preço" />

          <div className="grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Duração" erro={erros.duracao}>
              <span className="relative block">
                <input
                  type="number"
                  inputMode="numeric"
                  min={5}
                  max={240}
                  step={5}
                  value={dados.duracao}
                  onChange={(e) => mudar("duracao", e.target.value)}
                  className={`${classeInputComErro(Boolean(erros.duracao))} pr-13`}
                />
                <span className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 font-rotulo text-[10px] text-rotulo">
                  MIN
                </span>
              </span>
            </Campo>

            <Campo rotulo="Preço" erro={erros.preco}>
              <span className="relative block">
                <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 font-rotulo text-[11px] text-rotulo">
                  R$
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0,00"
                  value={dados.preco}
                  onChange={(e) => mudar("preco", e.target.value.replace(/[^\d,.]/g, ""))}
                  className={`${classeInputComErro(Boolean(erros.preco))} pl-10`}
                />
              </span>
            </Campo>
          </div>
        </div>

        <aside className="flex w-full shrink-0 flex-col gap-6 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-7 py-8 lg:w-82.5 lg:border-t-0 lg:border-l">
          <Secao titulo="Na hora de marcar" />

          {/* o mesmo desenho da linha de serviço da tela de agendamento */}
          <div className="flex items-center gap-4 border border-mogno/20 bg-papel-claro px-4 py-4">
            <span className="size-5 shrink-0 border-[1.5px] border-terracota bg-terracota" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.75">
              <b className="truncate text-[16px] font-medium text-tinta">{dados.nome.trim() || "Novo serviço"}</b>
              {dados.descricao.trim() && <small className="text-[13px] text-tinta-fraca">{dados.descricao.trim()}</small>}
            </span>
            <span className="flex flex-col items-end gap-0.75">
              <b className="font-titulo text-[19px] font-normal whitespace-nowrap text-tinta">
                {precoNaTela > 0 ? reais(precoNaTela) : "R$ —"}
              </b>
              <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
                {duracaoNaTela > 0 ? `${duracaoNaTela} min` : "— min"}
              </span>
            </span>
          </div>

          <Chave
            id="rotulo-cardapio"
            rotulo="No cardápio"
            dica="Desligue pra parar de oferecer sem perder o histórico."
            ligada={dados.ativo}
            onMudar={(ativo) => mudar("ativo", ativo)}
          />
        </aside>
      </div>

      <RodapeDoFormulario
        aviso={aviso}
        salvando={salvando}
        rotuloSalvar={editando ? "Salvar alterações" : "Salvar serviço"}
        voltarPara="/servicos"
        onExcluir={editando ? excluir : undefined}
      />
    </form>
  );
}
