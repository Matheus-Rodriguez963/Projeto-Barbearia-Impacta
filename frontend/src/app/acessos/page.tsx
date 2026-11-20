"use client";

// Acessos (só o administrador): cria recepcionistas, libera os menus de cada uma,
// aprova/recusa o acesso e troca a senha delas.

import Link from "next/link";
import { useEffect, useState } from "react";

import Botao from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import LinhaDeRecepcionista from "@/components/LinhaDeRecepcionista";
import Opcao, { GrupoDeOpcoes } from "@/components/Opcao";
import Secao from "@/components/Secao";
import Topo from "@/components/Topo";
import { useUsuario } from "@/components/UsuarioContexto";
import { ErroDaApi, criarRecepcionista, lerErroDoFormulario, listarRecepcionistas } from "@/lib/api";
import { MENUS, type Menu, type Recepcionista } from "@/lib/tipos";

export default function PaginaAcessos() {
  const usuario = useUsuario();
  const [lista, setLista] = useState<Recepcionista[] | null>(null);
  const [erroAoCarregar, setErroAoCarregar] = useState("");

  const [login, setLogin] = useState("");
  const [senha, setSenha] = useState("");
  const [menus, setMenus] = useState<Menu[]>([]);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [criou, setCriou] = useState("");
  const [criando, setCriando] = useState(false);

  useEffect(() => {
    let valendo = true;
    listarRecepcionistas()
      .then((itens) => {
        if (valendo) setLista(itens);
      })
      .catch((problema) => {
        if (valendo) setErroAoCarregar(problema instanceof ErroDaApi ? problema.message : "Não consegui ler os acessos.");
      });
    return () => {
      valendo = false;
    };
  }, []);

  function alternarMenu(menu: Menu) {
    setMenus((atuais) => (atuais.includes(menu) ? atuais.filter((m) => m !== menu) : [...atuais, menu]));
  }

  async function criar(evento: React.FormEvent) {
    evento.preventDefault();
    setCriou("");
    setErros({});
    setAviso("");
    setCriando(true);
    try {
      const nova = await criarRecepcionista({ login, senha, menus });
      setLista((atual) => [...(atual ?? []), nova]);
      setCriou(`Acesso de ${nova.login} criado.`);
      setLogin("");
      setSenha("");
      setMenus([]);
    } catch (problema) {
      const lido = lerErroDoFormulario(problema);
      setErros(lido.erros);
      setAviso(lido.aviso);
    } finally {
      setCriando(false);
    }
  }

  function substituir(nova: Recepcionista) {
    setLista((atual) => (atual ?? []).map((r) => (r.id === nova.id ? nova : r)));
  }

  return (
    <>
      <Topo migalhas={["Acessos"]} />

      <div className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
        <div className="mb-7.5">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Acessos</h1>
          <p className="m-0 max-w-140 text-sm text-tinta-media">
            Quem pode entrar no sistema e quais telas cada recepcionista enxerga.
          </p>
        </div>

        {usuario.senha_padrao && (
          <div className="mb-6 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
            Você ainda está com a senha padrão (123).{" "}
            <Link href="/senha" className="font-bold underline">
              Troque a senha.
            </Link>
          </div>
        )}

        <Secao titulo="Nova recepcionista" />

        <form onSubmit={criar} noValidate className="mb-9 flex flex-col gap-5.5">
          <div className="grid grid-cols-1 gap-x-6.5 gap-y-5.5 md:grid-cols-2">
            <Campo rotulo="Login" erro={erros.login}>
              <input
                type="text"
                autoComplete="off"
                autoCapitalize="none"
                maxLength={30}
                placeholder="Ex: maria"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                className={classeInputComErro(Boolean(erros.login))}
              />
            </Campo>
            <Campo rotulo="Senha" erro={erros.senha}>
              <input
                type="password"
                autoComplete="new-password"
                maxLength={72}
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                className={classeInputComErro(Boolean(erros.senha))}
              />
            </Campo>
          </div>

          <GrupoDeOpcoes rotulo="Menus liberados" erro={erros.menus}>
            {MENUS.map((m) => (
              <Opcao key={m.menu} marcada={menus.includes(m.menu)} onClick={() => alternarMenu(m.menu)}>
                {m.nome}
              </Opcao>
            ))}
          </GrupoDeOpcoes>

          <div className="flex flex-wrap items-center gap-4">
            <Botao type="submit" estilo="principal" disabled={criando}>
              {criando ? "Criando..." : "Criar acesso"}
            </Botao>
            {aviso && <span className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">{aviso}</span>}
            {criou && <span className="font-rotulo text-[11px] tracking-[0.14em] text-sucesso uppercase">{criou}</span>}
          </div>
        </form>

        <Secao titulo="Recepcionistas" />

        {erroAoCarregar && (
          <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">{erroAoCarregar}</div>
        )}

        {lista && lista.length === 0 && (
          <p className="m-0 text-sm text-tinta-media">Nenhuma recepcionista cadastrada ainda.</p>
        )}

        {lista && lista.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-3.5 p-0">
            {lista.map((r) => (
              <LinhaDeRecepcionista key={r.id} recepcionista={r} aoMudar={substituir} />
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
