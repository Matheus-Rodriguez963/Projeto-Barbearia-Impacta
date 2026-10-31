// A agenda do dia. A data vem no endereço (?data=2026-11-03) pra tela voltar no mesmo
// dia depois de marcar ou remarcar; sem data, abre em hoje.

import AgendaDoDia from "@/components/AgendaDoDia";
import Topo from "@/components/Topo";

export const metadata = { title: "Agenda — Barbearia Dom Alfredo" };

export default async function PaginaAgenda({ searchParams }: { searchParams: Promise<{ data?: string }> }) {
  const { data } = await searchParams;
  const valida = data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined;

  return (
    <>
      <Topo migalhas={["Balcão", "Agenda"]} />
      <AgendaDoDia dataInicial={valida} />
    </>
  );
}
