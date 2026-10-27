"use client";

// O formulário do serviço (etapa 3). Mesmo esquema do cliente: um componente
// pra cadastrar e editar, e o cartão da direita mostrando como fica no cardápio.

import { useRouter } from "next/navigation";
import { useState } from "react";

import Botao, { BotaoLink } from "@/components/Botao";
import Campo, { classeInputComErro, Seletor } from "@/components/Campo";
import Confirmacao from "@/components/Confirmacao";
import Opcao, { GrupoDeOpcoes } from "@/components/Opcao";
import RodapeDoFormulario from "@/components/RodapeDoFormulario";
import Secao from "@/components/Secao";
import { atualizarServico, cadastrarServico, ErroDaApi, excluirServico, lerErroDoFormulario } from "@/lib/api";
import { duracaoBonita, reais } from "@/lib/mascaras";
import type { DadosDoServico, Servico } from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

// de 5 em 5 minutos até 4 horas, igual à regra da API
const DURACOES = Array.from({ length: 48 }, (_, i) => (i + 1) * 5);

interface Formulario {
  nome: string;
  descricao: string;
  duracao: number;
  preco: string; // do jeito que digita: "45,50"
  ativo: boolean;
}

const FORMULARIO_VAZIO: Formulario = { nome: "", descricao: "", duracao: 30, preco: "", ativo: true };

function preencherCom(servico: Servico): Formulario {
  return {
    nome: servico.nome,
    descricao: servico.descricao ?? "",
    duracao: servico.duracao,
    preco: servico.preco.toFixed(2).replace(".", ","),
    ativo: servico.ativo,
  };
}

/** "45,50" ou "45.5" -> 45.5; vazio ou texto -> NaN */
function lerPreco(valor: string): number {
  return valor.trim() ? Number(valor.replace(/\s|R\$/g, "").replace(",", ".")) : NaN;
}

function conferirCampos(dados: Formulario): Record<string, string> {
  const problemas: Record<string, string> = {};
  if (dados.nome.trim().length < 3) problemas.nome = "Dê um nome ao serviço (pelo menos 3 letras).";

  const preco = lerPreco(dados.preco);
  if (Number.isNaN(preco) || preco < 0) problemas.preco = "Informe o preço, ex: 45,00";
  return problemas;
}

function montarEnvio(dados: Formulario): DadosDoServico {
  return {
    nome: dados.nome.trim(),
    descricao: dados.descricao.trim() || null,
    duracao: dados.duracao,
    preco: Math.round(lerPreco(dados.preco) * 100) / 100,
    ativo: dados.ativo,
  };
}

export default function FormularioServico({ servicoExistente }: { servicoExistente?: Servico }) {
  const editando = Boolean(servicoExistente);
  const navegador = useRouter();

  const { dados, setDados, erros, setErros, aviso, setAviso, mudar } = useFormulario(() =>
    servicoExistente ? preencherCom(servicoExistente) : FORMULARIO_VAZIO,
  );
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState<Servico | null>(null);

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
      // o caso comum é o serviço já ter agendamento: a API explica o que fazer
      setAviso(erro instanceof ErroDaApi ? erro.message : "Não consegui excluir esse serviço.");
      setSalvando(false);
    }
  }

  if (salvo) {
    return (
      <Confirmacao
        titulo={editando ? "Serviço atualizado." : `${salvo.nome} está no cardápio.`}
        acoes={
          <>
            <Botao
              onClick={() => {
                setSalvo(null);
                if (!editando) setDados(FORMULARIO_VAZIO);
              }}
            >
              {editando ? "Voltar ao serviço" : "Cadastrar outro"}
            </Botao>
            <BotaoLink href="/servicos" estilo="principal">
              Ver o cardápio
            </BotaoLink>
          </>
        }
      >
        <p className="m-0">
          {salvo.ativo
            ? "Já aparece como opção na hora de marcar um horário."
            : "Está fora do cardápio, então não aparece na hora de marcar."}
        </p>
      </Confirmacao>
    );
  }

  const preco = lerPreco(dados.preco);

  return (
    <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">
            {editando ? "Editar serviço" : "Novo serviço"}
          </h1>
          <p className="mb-7.5 max-w-130 text-sm leading-relaxed text-tinta-media">
            A duração é o tempo de cadeira: é com ela que a agenda calcula até que horas o barbeiro fica ocupado. Mudar
            o preço não altera o que já foi marcado.
          </p>

          <Secao titulo="O serviço" />

          <div className="mb-8.5 grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Nome" erro={erros.nome}>
              <input
                type="text"
                autoComplete="off"
                placeholder="Corte com barba"
                value={dados.nome}
                onChange={(e) => mudar("nome", e.target.value)}
                className={classeInputComErro(Boolean(erros.nome))}
              />
            </Campo>

            <div className="grid grid-cols-2 gap-x-5">
              <Campo rotulo="Duração" erro={erros.duracao}>
                <Seletor
                  temErro={Boolean(erros.duracao)}
                  value={dados.duracao}
                  onChange={(e) => mudar("duracao", Number(e.target.value))}
                >
                  {DURACOES.map((minutos) => (
                    <option key={minutos} value={minutos}>
                      {duracaoBonita(minutos)}
                    </option>
                  ))}
                </Seletor>
              </Campo>

              <Campo rotulo="Preço (R$)" erro={erros.preco}>
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="45,00"
                  value={dados.preco}
                  onChange={(e) => mudar("preco", e.target.value.replace(/[^\d,.]/g, ""))}
                  className={classeInputComErro(Boolean(erros.preco))}
                />
              </Campo>
            </div>

            <Campo rotulo="Descrição" opcional erro={erros.descricao} className="md:col-span-2">
              <textarea
                rows={3}
                maxLength={300}
                placeholder="Tesoura e máquina, com acabamento na navalha."
                value={dados.descricao}
                onChange={(e) => mudar("descricao", e.target.value)}
                className={`${classeInputComErro(Boolean(erros.descricao))} resize-y text-[15px] leading-relaxed`}
              />
            </Campo>
          </div>

          <Secao titulo="Cardápio" />

          <GrupoDeOpcoes rotulo="Situação">
            <Opcao marcada={dados.ativo} onClick={() => mudar("ativo", true)}>
              No cardápio
            </Opcao>
            <Opcao marcada={!dados.ativo} onClick={() => mudar("ativo", false)}>
              Fora do cardápio
            </Opcao>
          </GrupoDeOpcoes>
        </div>

        {/* como o serviço aparece pro balcão na hora de marcar */}
        <aside className="flex w-full shrink-0 flex-col gap-5.5 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-7.5 py-8.5 lg:w-82.5 lg:border-t-0 lg:border-l">
          <Secao titulo="Na hora de marcar" />

          <div
            className={`flex flex-col gap-3 border border-mogno/22 bg-papel-claro px-5 py-5.5 ${dados.ativo ? "" : "opacity-60"}`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <div className="font-titulo text-[21px] leading-tight text-tinta">
                {dados.nome.trim() || "Novo serviço"}
              </div>
              <div className="font-titulo text-[19px] whitespace-nowrap text-terracota">
                {Number.isNaN(preco) ? "R$ —" : reais(preco)}
              </div>
            </div>
            <div className="font-rotulo text-[10px] tracking-[0.2em] text-[#9a5a2e] uppercase">
              {duracaoBonita(dados.duracao)} de cadeira
            </div>
            {dados.descricao.trim() && (
              <p className="m-0 text-[13px] leading-relaxed text-tinta-media">{dados.descricao.trim()}</p>
            )}
          </div>
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
