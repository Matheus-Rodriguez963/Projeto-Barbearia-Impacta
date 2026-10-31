// A chave de liga/desliga com o texto do lado. Nasceu no barbeiro ("disponível para
// agendamento") e na etapa 3 o serviço passou a usar a mesma ("no cardápio").

interface Props {
  id: string; // liga o texto à chave pro leitor de tela
  rotulo: string;
  dica: string;
  ligada: boolean;
  onMudar: (ligada: boolean) => void;
}

export default function Chave({ id, rotulo, dica, ligada, onMudar }: Props) {
  return (
    <div className="flex items-center justify-between gap-4 border border-mogno/20 bg-papel-claro px-3.5 py-3.5">
      <div className="flex flex-col gap-1">
        <span id={id} className="text-[13px] text-tinta">
          {rotulo}
        </span>
        <span className="text-[11px] leading-snug text-tinta-fraca">{dica}</span>
      </div>

      {/* role="switch" faz o leitor de tela anunciar como liga/desliga, não como botão comum */}
      <button
        type="button"
        role="switch"
        aria-checked={ligada}
        aria-labelledby={id}
        onClick={() => onMudar(!ligada)}
        className={`relative h-5 w-8 shrink-0 cursor-pointer border transition-colors ${
          ligada ? "border-oliva bg-oliva" : "border-mogno/30 bg-papel"
        }`}
      >
        <span
          className={`absolute top-0.5 size-3.5 transition-all ${ligada ? "left-3.75 bg-creme" : "left-0.5 bg-tinta-fraca"}`}
        />
      </button>
    </div>
  );
}
