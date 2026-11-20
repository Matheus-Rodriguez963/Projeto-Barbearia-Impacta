"use client";

// Menu da esquerda. É client component porque eu uso o usePathname
// pra saber qual item pintar como ativo.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAparencia } from "@/components/AparenciaContexto";
import { sairDoSistema } from "@/components/BotaoSair";
import { useUsuario } from "@/components/UsuarioContexto";
import { enderecoDaLogo } from "@/lib/api";
import { MENUS } from "@/lib/tipos";

export default function MenuLateral() {
  const caminhoAtual = usePathname();
  const { aparencia } = useAparencia();
  const usuario = useUsuario();

  // Só entra aqui o que já funciona de verdade (o Caixa aparece quando a etapa dele ficar pronta)
  // e só o que foi liberado pra pessoa; "Acessos" é só do admin, no fim.
  // A ordem e os nomes vêm de MENUS (a agenda vai em cima: é a tela que a recepção deixa aberta o dia todo).
  const itens = [
    ...MENUS.filter((m) => usuario.menus.includes(m.menu)),
    ...(usuario.tipo === "admin" ? [{ menu: "acessos", nome: "Acessos", caminho: "/acessos" }] : []),
  ];

  return (
    // some no celular, que é o que o CSS original fazia
    <aside className="madeira hidden w-56 shrink-0 flex-col bg-mogno md:flex">
      {/* logo larga não cabe do lado do nome: aí o nome desce pra linha de baixo (flex-wrap) */}
      <div className="flex flex-wrap items-center gap-3 border-b border-latao/20 px-6 pt-7 pb-6">
        {aparencia.logo_url && (
          // na prévia da tela de Aparência a logo nova ainda é um "blob:" do navegador, que já vem pronto
          // eslint-disable-next-line @next/next/no-img-element -- a logo vem da API, com tamanho que não conheço
          <img
            src={aparencia.logo_url.startsWith("blob:") ? aparencia.logo_url : enderecoDaLogo(aparencia.logo_url)}
            alt=""
            className="max-h-10 w-auto max-w-full shrink-0"
          />
        )}

        <div className="min-w-28 flex-1">
          {aparencia.linha_de_cima && (
            <div className="mb-1.5 font-rotulo text-[9px] tracking-[0.4em] text-latao uppercase">
              {aparencia.linha_de_cima}
            </div>
          )}
          <div className="font-titulo text-2xl leading-none font-bold break-words text-creme">{aparencia.nome}</div>
        </div>
      </div>

      <nav className="flex flex-col py-4">
        {itens.map((item) => {
          const ativo = caminhoAtual.startsWith(item.caminho);

          return (
            <Link
              key={item.menu}
              href={item.caminho}
              aria-current={ativo ? "page" : undefined}
              className={`px-6 py-3 text-left font-rotulo text-[11px] tracking-[0.2em] uppercase ${
                ativo
                  ? "border-l-3 border-latao bg-black/25 text-creme"
                  : "text-tinta-apagada hover:bg-black/20 hover:text-creme"
              }`}
            >
              {item.nome}
            </Link>
          );
        })}
      </nav>

      {/* rodapé preso embaixo: quem está logado, trocar a senha e sair */}
      <div className="mt-auto flex flex-col gap-3 border-t border-latao/20 px-6 py-5">
        <div className="truncate font-texto text-[13px] text-creme" title={usuario.login}>
          {usuario.login}
        </div>
        <Link
          href="/senha"
          className="font-rotulo text-[10px] tracking-[0.2em] text-tinta-apagada uppercase hover:text-creme"
        >
          Trocar senha
        </Link>
        <button
          type="button"
          onClick={sairDoSistema}
          className="cursor-pointer text-left font-rotulo text-[10px] tracking-[0.2em] text-latao uppercase hover:text-creme"
        >
          Sair
        </button>
      </div>
    </aside>
  );
}
