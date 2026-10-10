// Cartão da direita que vai se preenchendo enquanto eu digito o formulário.
// É só visual, não guarda estado nenhum — recebe tudo pronto por props.

import Secao from "@/components/Secao";
import { iniciais } from "@/lib/mascaras";

interface Props {
  nome: string;
  telefone: string;
  email: string;
  barbeiro: string;
  origem: string;
  status?: string;
}

export default function FichaResumo({ nome, telefone, email, barbeiro, origem, status }: Props) {
  const linhas = [
    { rotulo: "Telefone", valor: telefone || "Telefone não informado" },
    { rotulo: "E-mail", valor: email || "E-mail não informado" },
    { rotulo: "Barbeiro", valor: barbeiro },
    { rotulo: "Origem", valor: origem },
  ];

  return (
    <aside className="flex w-full shrink-0 flex-col gap-5.5 overflow-auto border-t border-mogno/15 bg-papel-claro/50 px-7.5 py-8.5 lg:w-82.5 lg:border-t-0 lg:border-l">
      <Secao titulo="Ficha do cliente" />

      <div className="flex flex-col gap-4 border border-mogno/22 bg-papel-claro px-5 py-5.5">
        <div className="flex items-center gap-3.5">
          <div className="flex size-12 shrink-0 items-center justify-center bg-terracota font-titulo text-[19px] text-creme">
            {iniciais(nome)}
          </div>
          <div className="flex min-w-0 flex-col gap-0.75">
            <div className="truncate font-titulo text-[19px] leading-tight text-tinta">
              {nome.trim() || "Novo cliente"}
            </div>
            <div className="font-rotulo text-[9px] tracking-[0.2em] text-[#9a5a2e] uppercase">
              {status ?? "Novo · sem histórico"}
            </div>
          </div>
        </div>

        <div className="h-px bg-mogno/14" />

        <dl className="flex flex-col gap-2.75">
          {linhas.map((linha) => (
            <div key={linha.rotulo} className="flex justify-between gap-3 text-[13px] leading-[normal]">
              <dt className="text-tinta-fraca">{linha.rotulo}</dt>
              <dd className="m-0 truncate text-right text-tinta">{linha.valor}</dd>
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
