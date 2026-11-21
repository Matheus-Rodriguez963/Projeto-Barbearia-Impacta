"use client";

// Uma recepcionista na tela de Acessos: situação, menus liberados (cada caixinha salva na hora),
// aprovar/recusar, troca de senha e a lixeira (exclui de vez quem saiu da empresa).

import { useState } from "react";

import Botao from "@/components/Botao";
import { classeInputComErro } from "@/components/Campo";
import Opcao from "@/components/Opcao";
import {
  atualizarRecepcionista,
  excluirRecepcionista,
  lerErroDoFormulario,
  trocarSenhaDaRecepcionista,
} from "@/lib/api";
import { MENUS, type Menu, type Recepcionista } from "@/lib/tipos";

interface Props {
  recepcionista: Recepcionista;
  aoMudar: (nova: Recepcionista) => void;
  aoExcluir: (id: number) => void;
}

function IconeLixeira() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="M4 7h16M9 7V4.5h6V7M6.5 7l1 13h9l1-13M10 11v5.5M14 11v5.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function LinhaDeRecepcionista({ recepcionista, aoMudar, aoExcluir }: Props) {
  const [ocupada, setOcupada] = useState(false);
  const [erro, setErro] = useState("");
  const [recusando, setRecusando] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  async function excluir() {
    setOcupada(true);
    setErro("");
    try {
      await excluirRecepcionista(recepcionista.id);
      aoExcluir(recepcionista.id);
    } catch (problema) {
      setErro(lerErroDoFormulario(problema).aviso);
      setOcupada(false);
    }
  }
  const [trocandoSenha, setTrocandoSenha] = useState(false);
  const [senhaNova, setSenhaNova] = useState("");
  const [erroDaSenha, setErroDaSenha] = useState("");
  const [senhaTrocada, setSenhaTrocada] = useState(false);

  /** Grava a mudança; se a API recusar, nada muda na tela (a caixinha "volta") e o erro aparece. */
  async function gravar(mudanca: { menus?: Menu[]; ativo?: boolean }) {
    setOcupada(true);
    setErro("");
    try {
      aoMudar(await atualizarRecepcionista(recepcionista.id, mudanca));
    } catch (problema) {
      setErro(lerErroDoFormulario(problema).aviso);
    } finally {
      setOcupada(false);
    }
  }

  function alternarMenu(menu: Menu) {
    const menus = recepcionista.menus.includes(menu)
      ? recepcionista.menus.filter((m) => m !== menu)
      : [...recepcionista.menus, menu];
    void gravar({ menus });
  }

  async function salvarSenha(evento: React.FormEvent) {
    evento.preventDefault();
    setErroDaSenha("");
    setSenhaTrocada(false);
    setOcupada(true);
    try {
      await trocarSenhaDaRecepcionista(recepcionista.id, senhaNova);
      setSenhaNova("");
      setTrocandoSenha(false);
      setSenhaTrocada(true);
    } catch (problema) {
      const lido = lerErroDoFormulario(problema);
      setErroDaSenha(lido.erros.senha_nova ?? lido.aviso);
    } finally {
      setOcupada(false);
    }
  }

  return (
    <li className="flex flex-col gap-4 border border-mogno/20 bg-papel-claro px-5 py-4.5">
      <div className="flex flex-wrap items-center gap-3.5">
        <span className="font-titulo text-[22px] leading-none text-tinta">{recepcionista.login}</span>
        <span
          className={`border px-2.5 py-1 font-rotulo text-[10px] tracking-[0.18em] uppercase ${
            recepcionista.ativo ? "border-sucesso/55 text-sucesso" : "border-erro/55 text-erro"
          }`}
        >
          {recepcionista.ativo ? "Aprovada" : "Recusada"}
        </span>

        <div className="ml-auto flex flex-wrap gap-3">
          <Botao
            type="button"
            disabled={ocupada}
            onClick={() => {
              setTrocandoSenha((aberto) => !aberto);
              setSenhaTrocada(false);
              setErroDaSenha("");
            }}
          >
            Trocar senha
          </Botao>
          {recepcionista.ativo ? (
            <Botao
              type="button"
              disabled={ocupada}
              onClick={() => {
                setRecusando(true);
                setExcluindo(false);
              }}
            >
              Recusar
            </Botao>
          ) : (
            <Botao type="button" estilo="sucesso" disabled={ocupada} onClick={() => void gravar({ ativo: true })}>
              Aprovar
            </Botao>
          )}
          <Botao
            type="button"
            disabled={ocupada}
            title="Excluir acesso"
            aria-label={`Excluir o acesso de ${recepcionista.login}`}
            className="px-4 hover:border-erro! hover:text-erro!"
            onClick={() => {
              setExcluindo(true);
              setRecusando(false);
            }}
          >
            <IconeLixeira />
          </Botao>
        </div>
      </div>

      <div className="flex flex-wrap gap-2.5" role="group" aria-label={`Menus liberados para ${recepcionista.login}`}>
        {MENUS.map((m) => (
          <Opcao
            key={m.menu}
            marcada={recepcionista.menus.includes(m.menu)}
            onClick={() => !ocupada && alternarMenu(m.menu)}
          >
            {m.nome}
          </Opcao>
        ))}
      </div>

      {recusando && (
        <div className="flex flex-wrap items-center gap-3.5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-tinta">
          <span>
            Recusar o acesso de <strong>{recepcionista.login}</strong>? Ela é desconectada e não consegue entrar até
            você aprovar de novo.
          </span>
          <div className="ml-auto flex gap-3">
            <Botao type="button" onClick={() => setRecusando(false)}>
              Voltar
            </Botao>
            <Botao
              type="button"
              disabled={ocupada}
              onClick={async () => {
                setRecusando(false);
                await gravar({ ativo: false });
              }}
            >
              Sim, recusar
            </Botao>
          </div>
        </div>
      )}

      {excluindo && (
        <div className="flex flex-wrap items-center gap-3.5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-tinta">
          <span>
            Excluir o acesso de <strong>{recepcionista.login}</strong> de vez? Ela é desconectada e o login some da
            lista. Isso não dá pra desfazer.
          </span>
          <div className="ml-auto flex gap-3">
            <Botao type="button" onClick={() => setExcluindo(false)}>
              Voltar
            </Botao>
            <Botao
              type="button"
              disabled={ocupada}
              className="border-erro/55! text-erro! hover:bg-erro/10"
              onClick={() => void excluir()}
            >
              Sim, excluir
            </Botao>
          </div>
        </div>
      )}

      {trocandoSenha && (
        <form onSubmit={salvarSenha} noValidate className="flex flex-wrap items-start gap-3.5">
          <label className="flex min-w-60 flex-col gap-1.5">
            <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">Senha nova</span>
            <input
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={senhaNova}
              onChange={(e) => setSenhaNova(e.target.value)}
              className={classeInputComErro(Boolean(erroDaSenha))}
            />
            {erroDaSenha && <span className="font-texto text-[12px] text-erro">{erroDaSenha}</span>}
          </label>
          <Botao type="submit" estilo="principal" disabled={ocupada || !senhaNova} className="mt-5.5">
            Salvar
          </Botao>
        </form>
      )}

      {senhaTrocada && <div className="text-[12px] text-sucesso">Senha trocada.</div>}
      {erro && <div className="text-[12px] text-erro">{erro}</div>}
    </li>
  );
}
