// Layout que vale pra todas as telas: a moldura escura, o menu lateral de madeira
// e a área de papel onde cada página é desenhada.

import type { Metadata } from "next";
import localFont from "next/font/local";
import { cache } from "react";

import { ProvedorDeAparencia } from "@/components/AparenciaContexto";
import ApiForaDoAr from "@/components/ApiForaDoAr";
import GuardaDeMenu from "@/components/GuardaDeMenu";
import MenuLateral from "@/components/MenuLateral";
import SemUsuario from "@/components/SemUsuario";
import { ProvedorDeUsuario } from "@/components/UsuarioContexto";
import { URL_DA_API } from "@/lib/api";
import { lerUsuario } from "@/lib/servidor";
import { APARENCIA_PADRAO, marcaDaAparencia, type Aparencia } from "@/lib/tipos";
import "./globals.css";

// As fontes ficam dentro do projeto (pasta fontes/, com a licença de cada uma) em vez de vir
// do next/font/google: o Google às vezes devolve a Oswald num endereço que o Turbopack não
// consegue ler, e aí o site nem compila. Assim também roda sem internet.
// Cada arquivo é a versão variável da fonte (todos os pesos num arquivo só), só com o
// alfabeto latino; o weight é a faixa de pesos que o arquivo cobre.
const bodoni = localFont({ src: "./fontes/bodoni-moda.woff2", weight: "400 900", variable: "--fonte-bodoni" });
const oswald = localFont({ src: "./fontes/oswald.woff2", weight: "200 700", variable: "--fonte-oswald" });
const karla = localFont({ src: "./fontes/karla.woff2", weight: "200 800", variable: "--fonte-karla" });

// Lê a aparência salva direto da API, no servidor, pra o tema já vir certo no primeiro
// desenho (sem piscar). Se a API não responder logo, o site abre no Clássico mesmo.
// O cache() faz o generateMetadata e o layout usarem a mesma leitura: o Next não junta
// sozinho dois fetch iguais quando eles têm signal.
const lerAparencia = cache(async (): Promise<Aparencia> => {
  try {
    const resposta = await fetch(`${URL_DA_API}/api/aparencia`, {
      cache: "no-store",
      signal: AbortSignal.timeout(1500),
    });
    if (!resposta.ok) return APARENCIA_PADRAO;
    return { ...APARENCIA_PADRAO, ...(await resposta.json()) };
  } catch {
    return APARENCIA_PADRAO;
  }
});

export async function generateMetadata(): Promise<Metadata> {
  const marca = marcaDaAparencia(await lerAparencia());

  return {
    // cada página passa só o próprio título ("Agenda") e o template completa com a marca
    title: { default: marca, template: `%s — ${marca}` },
    description: `Sistema de cadastro de clientes da ${marca}.`,
  };
}

export default async function LayoutRaiz({ children }: { children: React.ReactNode }) {
  const [aparencia, usuario] = await Promise.all([lerAparencia(), lerUsuario()]);

  return (
    // as variáveis das fontes ficam no <html> e não no <body>: o tema do Tailwind
    // (--font-titulo etc.) é montado no <html>, e se a fonte só existisse no <body>
    // a conta dava inválida e o navegador caía na fonte do sistema.
    // O data-tema também fica aqui: o Clássico é o padrão e dispensa o atributo.
    <html
      lang="pt-BR"
      data-tema={aparencia.tema === "classico" ? undefined : aparencia.tema}
      className={`${bodoni.variable} ${oswald.variable} ${karla.variable}`}
    >
      <body>
        <ProvedorDeAparencia inicial={aparencia}>
          {usuario === "api_fora" ? (
            <ApiForaDoAr />
          ) : usuario ? (
            <ProvedorDeUsuario usuario={usuario}>
              {/* o sistema ocupa a tela inteira: h-dvh é a altura real da janela,
                  e o que passa disso rola dentro de cada área, não na página */}
              <div className="flex h-dvh w-full overflow-hidden">
                <MenuLateral />

                <main className="papel-pautado flex min-w-0 flex-1 flex-col bg-papel">
                  <GuardaDeMenu>{children}</GuardaDeMenu>
                </main>
              </div>
            </ProvedorDeUsuario>
          ) : (
            // sem usuário (tela de login, ou cookie velho): tela cheia, sem menu.
            // Fora do /login o SemUsuario não desenha nada e leva pra lá; o proxy cuida de quem nem tem cookie.
            <SemUsuario>{children}</SemUsuario>
          )}
        </ProvedorDeAparencia>
      </body>
    </html>
  );
}
