// A tela de "deu certo" que aparece no lugar do formulário depois de salvar.

interface Props {
  titulo: string;
  children: React.ReactNode; // o texto embaixo do título
  acoes: React.ReactNode; // os botões
}

export default function Confirmacao({ titulo, children, acoes }: Props) {
  return (
    <section className="flex flex-1 flex-col items-center justify-center gap-5 p-10 text-center">
      <div className="flex size-15 items-center justify-center border border-latao text-[26px] text-terracota">✓</div>
      <h2 className="m-0 font-titulo text-[34px] leading-tight text-tinta">{titulo}</h2>
      <div className="flex max-w-110 flex-col gap-2 text-[15px] leading-relaxed text-tinta-media">{children}</div>
      <div className="mt-2 flex flex-wrap justify-center gap-3.5">{acoes}</div>
    </section>
  );
}
