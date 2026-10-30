// Layout que vale pra todas as telas: a moldura escura, o menu lateral de madeira
// e a área de papel onde cada página é desenhada.

import type { Metadata } from "next";
import localFont from "next/font/local";

import MenuLateral from "@/components/MenuLateral";
import "./globals.css";

// As fontes ficam dentro do projeto (pasta fontes/, com a licença de cada uma) em vez de vir
// do next/font/google: o Google às vezes devolve a Oswald num endereço que o Turbopack não
// consegue ler, e aí o site nem compila. Assim também roda sem internet.
// Cada arquivo é a versão variável da fonte (todos os pesos num arquivo só), só com o
// alfabeto latino; o weight é a faixa de pesos que o arquivo cobre.
const bodoni = localFont({ src: "./fontes/bodoni-moda.woff2", weight: "400 900", variable: "--fonte-bodoni" });
const oswald = localFont({ src: "./fontes/oswald.woff2", weight: "200 700", variable: "--fonte-oswald" });
const karla = localFont({ src: "./fontes/karla.woff2", weight: "200 800", variable: "--fonte-karla" });

export const metadata: Metadata = {
  title: "Barbearia Dom Alfredo",
  description: "Sistema de cadastro de clientes da Barbearia Dom Alfredo.",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    // as variáveis das fontes ficam no <html> e não no <body>: o tema do Tailwind
    // (--font-titulo etc.) é montado no <html>, e se a fonte só existisse no <body>
    // a conta dava inválida e o navegador caía na fonte do sistema
    <html lang="pt-BR" className={`${bodoni.variable} ${oswald.variable} ${karla.variable}`}>
      <body>
        {/* o sistema ocupa a tela inteira: h-dvh é a altura real da janela,
            e o que passa disso rola dentro de cada área, não na página */}
        <div className="flex h-dvh w-full overflow-hidden">
          <MenuLateral />

          <main className="papel-pautado flex min-w-0 flex-1 flex-col bg-papel">{children}</main>
        </div>
      </body>
    </html>
  );
}
