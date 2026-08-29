// O tracinho que separa as seções do formulário ("Identificação", "Preferências"...).

export default function Secao({ titulo }: { titulo: string }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <span className="font-rotulo text-[10px] tracking-[0.26em] text-[#9a5a2e] uppercase">{titulo}</span>
      <span className="h-px flex-1 bg-mogno/20" />
    </div>
  );
}
