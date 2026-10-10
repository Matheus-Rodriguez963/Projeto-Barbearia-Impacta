// Um campo do formulário: rótulo em cima, input no meio e a mensagem de erro embaixo.
// Fiz assim pra não repetir as mesmas 10 classes em cada input.

/** As classes do input ficam exportadas porque o select e o textarea usam as mesmas. */
// a entrelinha "normal" no input e no select deixa o campo com 45px de altura
// (o Tailwind põe 1.5 e ele fica 5px mais alto); o textarea tem a entrelinha própria dele
export const classeInput =
  "w-full border bg-papel-claro px-3.5 py-3 text-base text-tinta-forte outline-none [&:is(input,select)]:leading-[normal] " +
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

/** Select com a setinha da barbearia no lugar da do navegador. */
export function Seletor({ temErro = false, ...resto }: React.ComponentProps<"select"> & { temErro?: boolean }) {
  return (
    <span className="relative block">
      <select className={`${classeInputComErro(temErro)} cursor-pointer appearance-none pr-9`} {...resto} />
      <span className="pointer-events-none absolute top-4 right-3.5 text-[11px] text-[#9a5a2e]">▼</span>
    </span>
  );
}
