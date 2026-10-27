"use client";

// Menu da esquerda. É client component porque eu uso o usePathname
// pra saber qual item pintar como ativo.

import Link from "next/link";
import { usePathname } from "next/navigation";

// Só entra aqui o que já funciona de verdade. O Caixa aparece quando a próxima
// etapa ficar pronta — botão que não faz nada só engana quem está usando.
// Barbeiros entrou na etapa 2; Agenda e Serviços na etapa 3.
const ITENS = [
  { nome: "Agenda", caminho: "/agendamentos" },
  { nome: "Clientes", caminho: "/clientes" },
  { nome: "Barbeiros", caminho: "/barbeiros" },
  { nome: "Serviços", caminho: "/servicos" },
];

export default function MenuLateral() {
  const caminhoAtual = usePathname();

  return (
    // some no celular, que é o que o CSS original fazia
    <aside className="madeira hidden w-56 shrink-0 flex-col bg-mogno md:flex">
      <div className="border-b border-latao/20 px-6 pt-7 pb-6">
        <div className="mb-1.5 font-rotulo text-[9px] tracking-[0.4em] text-latao uppercase">Barbearia</div>
        <div className="font-titulo text-2xl leading-none font-bold text-[#f4e9d4]">Dom Alfredo</div>
      </div>

      <nav className="flex flex-col py-4">
        {ITENS.map((item) => {
          const ativo = caminhoAtual.startsWith(item.caminho);

          return (
            <Link
              key={item.nome}
              href={item.caminho}
              aria-current={ativo ? "page" : undefined}
              className={`px-6 py-3 text-left font-rotulo text-[11px] tracking-[0.2em] uppercase ${
                ativo
                  ? "border-l-3 border-latao bg-black/25 text-[#f4e9d4]"
                  : "text-[#b49b80] hover:bg-black/20 hover:text-[#f4e9d4]"
              }`}
            >
              {item.nome}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
