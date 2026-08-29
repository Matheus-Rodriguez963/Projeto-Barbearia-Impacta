// Layout que vale pra todas as telas: a moldura escura, o menu lateral de madeira
// e a área de papel onde cada página é desenhada.

import type { Metadata } from "next";
import { Bodoni_Moda, Karla, Oswald } from "next/font/google";

import MenuLateral from "@/components/MenuLateral";
import "./globals.css";

// next/font baixa as fontes no build e serve junto com o site (não depende do Google depois)
const bodoni = Bodoni_Moda({ subsets: ["latin"], weight: ["400", "700"], variable: "--fonte-bodoni" });
const oswald = Oswald({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--fonte-oswald" });
const karla = Karla({ subsets: ["latin"], weight: ["300", "400", "500"], variable: "--fonte-karla" });

export const metadata: Metadata = {
  title: "Barbearia Dom Alfredo",
  description: "Sistema de cadastro de clientes da Barbearia Dom Alfredo.",
};

export default function LayoutRaiz({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${bodoni.variable} ${oswald.variable} ${karla.variable}`}>
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
