// Os serviços mais pedidos do mês. A barrinha é proporcional ao mais pedido,
// no mesmo estilo das barrinhas do calendário da agenda.

import { reais } from "@/lib/agenda";
import type { ServicoDoRanking } from "@/lib/tipos";

export default function RankingDeServicos({ servicos }: { servicos: ServicoDoRanking[] }) {
  if (servicos.length === 0) {
    return <p className="m-0 mb-8 text-[14px] text-tinta-fraca">Nenhum serviço concluído nesse mês.</p>;
  }

  const maior = Math.max(...servicos.map((s) => s.quantidade));

  return (
    <ul className="m-0 mb-8 flex list-none flex-col gap-3.5 p-0">
      {servicos.map((servico) => (
        <li key={servico.servico_id}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[14px]">
            <span className="text-tinta">{servico.nome}</span>
            <span className="text-tinta-media tabular-nums">
              {servico.quantidade}× · {reais(servico.faturamento)}
            </span>
          </div>
          <i className="block h-0.75 w-full bg-mogno/10">
            <b
              className="block h-full bg-oliva transition-[width] duration-500"
              style={{ width: `${(servico.quantidade / maior) * 100}%` }}
            />
          </i>
        </li>
      ))}
    </ul>
  );
}
