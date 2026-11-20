"use client";

// Tela de entrada: logo, nome da barbearia e o par login/senha.

import { useEffect, useState } from "react";

import { useAparencia } from "@/components/AparenciaContexto";
import Botao from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import { enderecoDaLogo, entrar, ErroDaApi, pegarEu } from "@/lib/api";

export default function PaginaDeLogin() {
  const { aparencia } = useAparencia();
  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [enviando, setEnviando] = useState(false);

  // quem já está logado não precisa ver esta tela
  useEffect(() => {
    pegarEu()
      .then(() => window.location.replace("/"))
      .catch(() => {});
  }, []);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setErro("");
    setEnviando(true);

    try {
      await entrar(login, senha);
      // recarrega a página inteira pra o layout reler o usuário e desenhar o menu
      window.location.replace("/");
    } catch (e) {
      setErro(e instanceof ErroDaApi ? e.message : "Não deu pra entrar agora. Tenta de novo.");
      setEnviando(false);
    }
  }

  return (
    <div className="papel-pautado flex min-h-dvh items-center justify-center bg-papel px-4 py-10">
      <form
        onSubmit={enviar}
        className="flex w-full max-w-sm flex-col gap-5 border border-mogno/20 bg-papel-claro px-8 py-9"
      >
        <div className="flex flex-col items-center gap-3 text-center">
          {aparencia.logo_url && (
            // eslint-disable-next-line @next/next/no-img-element -- a logo vem da API, com tamanho que não conheço
            <img src={enderecoDaLogo(aparencia.logo_url)} alt="" className="max-h-16 w-auto max-w-full" />
          )}
          <div>
            {aparencia.linha_de_cima && (
              <div className="mb-1.5 font-rotulo text-[9px] tracking-[0.4em] text-rotulo uppercase">
                {aparencia.linha_de_cima}
              </div>
            )}
            <h1 className="font-titulo text-3xl leading-none font-bold break-words text-tinta-forte">
              {aparencia.nome}
            </h1>
          </div>
        </div>

        <Campo rotulo="Login">
          <input
            className={classeInputComErro(false)}
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            autoFocus
            required
          />
        </Campo>

        <Campo rotulo="Senha">
          <input
            className={classeInputComErro(false)}
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Campo>

        <Botao type="submit" estilo="principal" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Botao>

        {erro && (
          <p role="alert" className="text-center font-texto text-[13px] text-erro">
            {erro}
          </p>
        )}
      </form>
    </div>
  );
}
