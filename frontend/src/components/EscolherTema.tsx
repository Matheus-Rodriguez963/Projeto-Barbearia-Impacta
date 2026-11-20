// Os 4 temas em cartões, cada um com uma miniatura do sistema (menu, papel e botão).
// A miniatura não tem cor nenhuma escrita aqui: o data-tema dela faz o temas.css trocar
// as variáveis só dentro da caixinha, então ela pinta com as cores do próprio tema
// mesmo quando a tela em volta está em outro.

import { TEMAS, type Tema } from "@/lib/tipos";

interface Props {
  valor: Tema;
  aoEscolher: (tema: Tema) => void;
}

function Miniatura({ tema }: { tema: Tema }) {
  return (
    <div data-tema={tema} aria-hidden className="flex h-24 border border-mogno/20">
      {/* o menu de madeira, com o nome e três itens */}
      <div className="madeira flex w-1/3 flex-col gap-1.5 bg-mogno px-2 py-2.5">
        <span className="h-0.75 w-2/3 bg-latao" />
        <span className="mb-1 h-1.5 w-full bg-creme" />
        <span className="h-0.75 w-3/4 bg-tinta-apagada" />
        <span className="h-0.75 w-1/2 bg-tinta-apagada" />
        <span className="h-0.75 w-2/3 bg-tinta-apagada" />
      </div>

      {/* o papel com um título, duas linhas de texto e o botão principal */}
      <div className="papel-pautado flex flex-1 flex-col gap-1.5 bg-papel px-2.5 py-2.5">
        <span className="h-2 w-1/2 bg-tinta" />
        <span className="h-0.75 w-5/6 bg-tinta-fraca" />
        <span className="h-0.75 w-2/3 bg-tinta-fraca" />
        <span className="mt-auto ml-auto h-3.5 w-1/3 border border-latao bg-terracota" />
      </div>
    </div>
  );
}

export default function EscolherTema({ valor, aoEscolher }: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {TEMAS.map((tema) => {
        const escolhido = tema.chave === valor;

        return (
          <button
            key={tema.chave}
            type="button"
            aria-pressed={escolhido}
            onClick={() => aoEscolher(tema.chave)}
            className={`flex cursor-pointer flex-col gap-3 border bg-papel-claro p-3 text-left ${
              escolhido
                ? "border-terracota shadow-[0_0_0_3px_color-mix(in_srgb,var(--color-latao)_25%,transparent)]"
                : "border-mogno/30 hover:border-terracota"
            }`}
          >
            <Miniatura tema={tema.chave} />

            <span className="flex flex-col gap-0.75">
              <span className="flex items-center justify-between gap-2">
                <b className="text-[15px] font-medium text-tinta">{tema.nome}</b>
                {escolhido && (
                  <span className="font-rotulo text-[9px] tracking-[0.2em] text-terracota uppercase">Escolhido</span>
                )}
              </span>
              <span className="text-[12.5px] text-tinta-fraca">{tema.descricao}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
