// Um campo do formulário: rótulo em cima, input no meio e a mensagem de erro embaixo.
// Fiz assim pra não repetir as mesmas 10 classes em cada input.

/** As classes do input ficam exportadas porque o select e o textarea usam as mesmas. */
export const classeInput =
  "w-full border bg-papel-claro px-3.5 py-3 text-base text-tinta-forte outline-none " +
  "focus:border-terracota focus:shadow-[0_0_0_3px_rgba(201,162,39,.25)]";

export function classeInputComErro(temErro: boolean) {
  return `${classeInput} ${temErro ? "border-erro" : "border-mogno/30"}`;
}

interface Props {
  rotulo: string;
  opcional?: boolean;
  erro?: string;
  className?: string;
  children: React.ReactNode;
}

export default function Campo({ rotulo, opcional, erro, className = "", children }: Props) {
  return (
    <label className={`flex flex-col gap-1.5 ${className}`}>
      <span className="font-rotulo text-[10px] tracking-[0.22em] text-rotulo uppercase">
        {rotulo}
        {opcional && (
          <span className="ml-1.5 font-texto text-[11px] tracking-normal text-[#b49b80] normal-case">
            (opcional)
          </span>
        )}
      </span>

      {children}

      {/* só aparece quando a API (ou a validação daqui) reclama do campo */}
      {erro && <span className="font-texto text-[12px] text-erro">{erro}</span>}
    </label>
  );
}
