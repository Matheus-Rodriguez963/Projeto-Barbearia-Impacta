// A foto do barbeiro na moldura dourada. Sem foto, mostra as iniciais no fundo terracota.
// Aparece grande no cartão "como o cliente vê" e pequena na lista da equipe.

import { iniciais } from "@/lib/mascaras";

interface Props {
  foto: string | null;
  nome: string;
  className?: string; // tamanho da moldura e do texto
}

export default function Retrato({ foto, nome, className = "" }: Props) {
  return (
    <div className={`moldura-latao shrink-0 ${className}`}>
      {/* a foto entra como fundo pra preencher o quadrado sem distorcer */}
      <div
        className="flex size-full items-center justify-center bg-terracota bg-cover bg-center font-titulo text-creme"
        style={foto ? { backgroundImage: `url("${foto}")` } : undefined}
      >
        {!foto && nome.trim() && iniciais(nome)}
      </div>
    </div>
  );
}
