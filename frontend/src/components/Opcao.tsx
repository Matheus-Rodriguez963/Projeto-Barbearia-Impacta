// Os botões de marcar: a origem do cliente e as especialidades do barbeiro
// usam o mesmo desenho.

interface PropsOpcao {
  marcada: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

export default function Opcao({ marcada, onClick, children }: PropsOpcao) {
  return (
    <button
      type="button"
      aria-pressed={marcada}
      onClick={onClick}
      className={`cursor-pointer border px-4 py-2.25 font-rotulo text-[10px] tracking-[0.18em] uppercase ${
        marcada
          ? "border-terracota bg-terracota text-creme"
          : "border-mogno/30 text-[#6b563f] hover:border-terracota hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

/** Rótulo em cima, os botões lado a lado e o erro embaixo. */
export function GrupoDeOpcoes({
  rotulo,
  erro,
  children,
}: {
  rotulo: string;
  erro?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2.25">
      <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">{rotulo}</span>
      <div className="flex flex-wrap gap-2.5">{children}</div>
      {erro && <span className="text-[12px] text-erro">{erro}</span>}
    </div>
  );
}
