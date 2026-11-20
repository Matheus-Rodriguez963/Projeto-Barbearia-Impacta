"use client";

// Aparência: o nome que aparece no menu, a logo e o tema de cores do sistema.
// Tudo o que se mexe aqui já aparece no sistema na hora (a "prévia" do AparenciaContexto),
// mas só fica gravado no "Salvar". Saindo da tela sem salvar, volta ao que estava.
// Ao abrir, a tela relê a aparência na API: a que veio do layout pode ser o padrão (se a API
// demorou) ou velha (outro computador salvou depois), e salvar em cima dela apagaria a de verdade.

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { useAparencia } from "@/components/AparenciaContexto";
import Botao from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import { useFotoDePerfil } from "@/components/EscolherFoto";
import EscolherTema from "@/components/EscolherTema";
import Secao from "@/components/Secao";
import Topo from "@/components/Topo";
import {
  ErroDaApi,
  enderecoDaLogo,
  enviarLogo,
  lerErroDoFormulario,
  pegarAparencia,
  removerLogo,
  salvarAparencia,
} from "@/lib/api";
import { prepararLogo } from "@/lib/foto";
import type { Aparencia, DadosDaAparencia, Tema } from "@/lib/tipos";
import { useFormulario } from "@/lib/useFormulario";

interface Formulario {
  linha_de_cima: string;
  nome: string;
  tema: Tema;
}

// o "(opcional)" deixa o rótulo da linha de cima 2,5px mais alto; com a mesma altura nos dois
// rótulos, os dois campos lado a lado ficam alinhados
const ROTULO_DA_MESMA_ALTURA = "[&>span:first-child]:h-4.5";

function preencherCom(aparencia: Aparencia): Formulario {
  return { linha_de_cima: aparencia.linha_de_cima, nome: aparencia.nome, tema: aparencia.tema };
}

/** A moldura da logo. Mesmo esquema da foto do barbeiro, mas larga e com o fundo de madeira
 *  do menu, pra já ver como a logo (e a transparência dela) fica lá. */
function EscolherLogo({ logo }: { logo: ReturnType<typeof useFotoDePerfil> }) {
  return (
    <div className="flex flex-wrap items-center gap-5.5">
      <label
        className={`moldura-latao relative flex h-26 w-78 shrink-0 cursor-pointer p-1 ${
          logo.erro ? "outline-2 outline-offset-2 outline-erro" : ""
        }`}
        title="Escolher logo"
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Escolher logo"
          className="absolute inset-0 z-10 cursor-pointer opacity-0"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = ""; // pra conseguir escolher o mesmo arquivo de novo depois
            if (arquivo) logo.escolher(arquivo);
          }}
        />
        <span className="madeira flex size-full items-center justify-center bg-mogno p-3 font-rotulo text-[9px] tracking-[0.2em] text-latao uppercase">
          {logo.preparando ? (
            "..."
          ) : logo.naTela ? (
            // eslint-disable-next-line @next/next/no-img-element -- pode ser um "blob:" do navegador
            <img src={logo.naTela} alt="" className="max-h-full max-w-full object-contain" />
          ) : (
            "Logo"
          )}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] text-tinta">Logo da barbearia</span>
        <span className="max-w-75 text-[12.5px] leading-normal text-tinta-fraca">
          Aparece no menu, do lado do nome. PNG com fundo transparente fica melhor. Clique na moldura para
          escolher.
        </span>
        {logo.naTela && (
          <button
            type="button"
            onClick={logo.descartar}
            className="w-fit cursor-pointer font-rotulo text-[10px] tracking-[0.18em] text-erro uppercase hover:underline"
          >
            {logo.trocada ? "Desfazer troca" : "Tirar logo"}
          </button>
        )}
        {logo.erro && <span className="text-[12px] text-erro">{logo.erro}</span>}
      </div>
    </div>
  );
}

export default function PaginaAparencia() {
  const { aparencia, atualizar } = useAparencia();
  const [lida, setLida] = useState<Aparencia | null>(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    let valendo = true;
    pegarAparencia()
      .then((nova) => {
        if (!valendo) return;
        atualizar(nova); // o menu e o tema também passam a mostrar a de verdade
        setLida(nova);
      })
      .catch((problema) => {
        if (valendo) setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui ler a aparência.");
      });
    return () => {
      valendo = false;
    };
  }, [atualizar]);

  // enquanto não lê, o formulário fica travado mostrando o que o layout trouxe. Quando lê,
  // o key novo monta o formulário de novo, já começando da aparência que está gravada.
  return (
    <FormularioDaAparencia
      key={lida ? "lida" : "lendo"}
      salvaAoAbrir={lida ?? aparencia}
      carregando={!lida}
      erroAoCarregar={erro}
    />
  );
}

interface PropsDoFormulario {
  salvaAoAbrir: Aparencia;
  carregando: boolean;
  erroAoCarregar: string;
}

function FormularioDaAparencia({ salvaAoAbrir, carregando, erroAoCarregar }: PropsDoFormulario) {
  const navegador = useRouter();
  const { mostrarPrevia, atualizar } = useAparencia();

  // a que está gravada; muda quando salva
  const [salva, setSalva] = useState(salvaAoAbrir);
  const { dados, setDados, erros, setErros, aviso, setAviso, mudar } = useFormulario(() => preencherCom(salva));
  const logo = useFotoDePerfil(
    salva.logo_url ? enderecoDaLogo(salva.logo_url) : null,
    prepararLogo,
    "Imagem inválida.",
  );
  const [salvando, setSalvando] = useState(false);
  const [salvou, setSalvou] = useState(false);

  // a logo que o menu deve mostrar: a nova ("blob:"), nenhuma (marcada pra tirar) ou a gravada
  const logoNaPrevia = logo.trocada ? logo.naTela : logo.naTela ? salva.logo_url : null;
  const linha = dados.linha_de_cima.trim();
  const nome = dados.nome.trim();
  const mudou =
    linha !== salva.linha_de_cima || nome !== salva.nome || dados.tema !== salva.tema || logoNaPrevia !== salva.logo_url;

  // cada mudança já aparece no sistema; sem mudança nenhuma, a prévia sai
  useEffect(() => {
    mostrarPrevia(mudou ? { linha_de_cima: linha, nome, tema: dados.tema, logo_url: logoNaPrevia } : null);
  }, [mostrarPrevia, mudou, linha, nome, dados.tema, logoNaPrevia]);

  // saiu da tela sem salvar: o sistema volta ao que está gravado
  useEffect(() => () => mostrarPrevia(null), [mostrarPrevia]);

  function desfazer() {
    setDados(preencherCom(salva));
    setErros({});
    setAviso("");
    setSalvou(false);
    logo.recomecar();
  }

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setSalvou(false);

    // a API também recusa, mas com a mensagem em inglês do Pydantic
    if (!nome) {
      setErros({ nome: "A barbearia precisa de um nome." });
      setAviso("Confira: nome da barbearia");
      return;
    }

    // só vai o que mudou: o que a pessoa não mexeu fica como está gravado
    const mudancas: DadosDaAparencia = {};
    if (linha !== salva.linha_de_cima) mudancas.linha_de_cima = linha;
    if (nome !== salva.nome) mudancas.nome = nome;
    if (dados.tema !== salva.tema) mudancas.tema = dados.tema;
    const mudouOTexto = Object.keys(mudancas).length > 0;

    setSalvando(true);
    let nova = salva;
    try {
      if (mudouOTexto) nova = await salvarAparencia(mudancas);
    } catch (erro) {
      const lido = lerErroDoFormulario(erro);
      setErros(lido.erros);
      setAviso(lido.aviso);
      setSalvando(false);
      return;
    }

    // nome e tema já estão gravados aqui. Se só a logo falhar, aviso e deixo a logo escolhida
    // na moldura pra tentar de novo.
    let avisoDaLogo = "";
    try {
      if (logo.nova) nova = await enviarLogo(logo.nova);
      else if (!logo.naTela && salva.logo_url) nova = await removerLogo();
    } catch (erro) {
      const motivo = lerErroDoFormulario(erro).aviso;
      avisoDaLogo = mudouOTexto
        ? `O nome e o tema foram salvos, mas a logo não (${motivo})`
        : `A logo não foi salva (${motivo})`;
    }

    atualizar(nova);
    setSalva(nova);
    setDados(preencherCom(nova));
    if (!avisoDaLogo) logo.recomecar();
    // o atualizar() tira a prévia; se a logo não foi, ela continua na prévia, igual à moldura
    if (avisoDaLogo) mostrarPrevia({ logo_url: logoNaPrevia });
    setAviso(avisoDaLogo);
    setSalvou(!avisoDaLogo);
    setSalvando(false);
    navegador.refresh(); // o layout relê do servidor (título da aba, primeiro desenho)
  }

  return (
    <>
      <Topo migalhas={["Aparência"]} />

      <form onSubmit={salvar} className="flex min-h-0 flex-1 flex-col" noValidate>
        <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
          <div className="mb-7.5">
            <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Aparência</h1>
            <p className="m-0 max-w-140 text-sm text-tinta-media">
              O nome, a logo e as cores do sistema. O que mudar aqui já aparece na tela; só fica valendo depois de
              salvar.
            </p>
          </div>

          {erroAoCarregar && (
            <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
              {erroAoCarregar} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
            </div>
          )}

          {/* travado enquanto lê a aparência e enquanto salva, pra nada mudar no meio */}
          <fieldset disabled={carregando || salvando} className="m-0 min-w-0 border-0 p-0">
            <Secao titulo="Nome" />

            <div className="mb-8.5 grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
              <Campo
                rotulo="Linha de cima"
                opcional
                erro={erros.linha_de_cima}
                className={ROTULO_DA_MESMA_ALTURA}
              >
                <input
                  type="text"
                  autoComplete="off"
                  maxLength={30}
                  placeholder="Ex: Barbearia"
                  value={dados.linha_de_cima}
                  onChange={(e) => mudar("linha_de_cima", e.target.value)}
                  className={classeInputComErro(Boolean(erros.linha_de_cima))}
                />
              </Campo>

              <Campo rotulo="Nome da barbearia" erro={erros.nome} className={ROTULO_DA_MESMA_ALTURA}>
                <input
                  type="text"
                  autoComplete="off"
                  maxLength={40}
                  placeholder="Ex: Dom Alfredo"
                  value={dados.nome}
                  onChange={(e) => mudar("nome", e.target.value)}
                  className={classeInputComErro(Boolean(erros.nome))}
                />
              </Campo>
            </div>

            <Secao titulo="Logo" />

            <div className="mb-8.5">
              <EscolherLogo logo={logo} />
            </div>

            <Secao titulo="Tema" />

            <EscolherTema valor={dados.tema} aoEscolher={(tema) => mudar("tema", tema)} />
          </fieldset>
        </div>

        {/* o mesmo rodapé dos formulários, mas com "Desfazer" no lugar do "Cancelar":
            aqui não tem lista pra onde voltar */}
        <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-mogno/15 bg-papel-claro/70 px-6 py-5 md:px-10">
          <div
            className={`font-rotulo text-[11px] tracking-[0.14em] uppercase ${salvou && !mudou ? "text-sucesso" : "text-erro"}`}
          >
            {salvou && !mudou ? "Aparência salva." : aviso}
          </div>

          <div className="ml-auto flex flex-wrap items-center gap-3.5">
            <Botao type="button" onClick={desfazer} disabled={salvando || !mudou}>
              Desfazer
            </Botao>
            <Botao type="submit" estilo="principal" disabled={carregando || salvando || logo.preparando || !mudou}>
              {salvando ? "Salvando..." : "Salvar"}
            </Botao>
          </div>
        </footer>
      </form>
    </>
  );
}
