"use client";

// Menu da esquerda. É client component porque eu uso o usePathname
// pra saber qual item pintar como ativo.

import Link from "next/link";
import { usePathname } from "next/navigation";

import { useAparencia } from "@/components/AparenciaContexto";
import { enderecoDaLogo } from "@/lib/api";

// Só entra aqui o que já funciona de verdade. O Caixa aparece quando a etapa dele
// ficar pronta — botão que não faz nada só engana quem está usando.
// Barbeiros entrou na etapa 2; Agenda e Serviços na etapa 3, Histórico na etapa 4 (a agenda vai em cima
// porque é a tela que a recepção deixa aberta o dia todo).
const ITENS = [
  { nome: "Agenda", caminho: "/agenda" },
  { nome: "Clientes", caminho: "/clientes" },
  { nome: "Barbeiros", caminho: "/barbeiros" },
  { nome: "Serviços", caminho: "/servicos" },
  { nome: "Histórico", caminho: "/historico" },
  { nome: "Aparência", caminho: "/aparencia" },
];

export default function MenuLateral() {
  const caminhoAtual = usePathname();
  const { aparencia } = useAparencia();

  return (
    // some no celular, que é o que o CSS original fazia
    <aside className="madeira hidden w-56 shrink-0 flex-col bg-mogno md:flex">
      <div className="flex items-center gap-3 border-b border-latao/20 px-6 pt-7 pb-6">
        {aparencia.logo_url && (
          // eslint-disable-next-line @next/next/no-img-element -- a logo vem da API, com tamanho que não conheço
          <img src={enderecoDaLogo(aparencia.logo_url)} alt="" className="max-h-10 w-auto shrink-0" />
        )}

        <div className="min-w-0">
          {aparencia.linha_de_cima && (
            <div className="mb-1.5 font-rotulo text-[9px] tracking-[0.4em] text-latao uppercase">
              {aparencia.linha_de_cima}
            </div>
          )}
          <div className="font-titulo text-2xl leading-none font-bold break-words text-creme">{aparencia.nome}</div>
        </div>
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
                  ? "border-l-3 border-latao bg-black/25 text-creme"
                  : "text-tinta-apagada hover:bg-black/20 hover:text-creme"
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
