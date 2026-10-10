// Paginação simples das listas, só com anterior/próxima.

const classeBotao =
  "cursor-pointer border border-mogno/30 px-4 py-2 font-rotulo text-[10px] tracking-[0.2em] text-tinta-media " +
  "uppercase disabled:cursor-not-allowed disabled:opacity-40";

interface Props {
  pagina: number;
  ultima: number;
  onMudar: (pagina: number) => void;
}

export default function Paginacao({ pagina, ultima, onMudar }: Props) {
  if (ultima <= 1) return null;

  return (
    <div className="mt-5 flex items-center justify-end gap-4">
      <button type="button" onClick={() => onMudar(pagina - 1)} disabled={pagina === 1} className={classeBotao}>
        Anterior
      </button>
      <span className="font-rotulo text-[10px] tracking-[0.2em] text-rotulo uppercase">
        Página {pagina} de {ultima}
      </span>
      <button type="button" onClick={() => onMudar(pagina + 1)} disabled={pagina === ultima} className={classeBotao}>
        Próxima
      </button>
    </div>
  );
}
