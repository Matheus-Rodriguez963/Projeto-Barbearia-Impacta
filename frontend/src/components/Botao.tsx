// Botão do sistema em três versões: normal, sucesso (verde, fixo em qualquer tema) e o principal (terracota).

import Link from "next/link";

type Estilo = "normal" | "sucesso" | "principal";

const ESTILOS: Record<Estilo, string> = {
  normal: "border-mogno/30 text-tinta-media hover:border-terracota hover:text-tinta",
  sucesso: "border-sucesso/55 text-sucesso hover:bg-sucesso/10",
  principal: "border-latao bg-terracota text-creme px-7 hover:bg-terracota-claro",
};

const BASE =
  "inline-flex items-center justify-center border px-6 py-3.5 font-rotulo text-[11px] " +
  "tracking-[0.22em] uppercase transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50";

type PropsBotao = React.ButtonHTMLAttributes<HTMLButtonElement> & { estilo?: Estilo };

export default function Botao({ estilo = "normal", className = "", ...resto }: PropsBotao) {
  return <button className={`${BASE} ${ESTILOS[estilo]} ${className}`} {...resto} />;
}

/** Mesma aparência, mas navegando pra outra página. */
export function BotaoLink({
  estilo = "normal",
  className = "",
  ...resto
}: React.ComponentProps<typeof Link> & { estilo?: Estilo }) {
  return <Link className={`${BASE} ${ESTILOS[estilo]} ${className}`} {...resto} />;
}
