// Tela de marcar horário. Quando a recepção clica num espaço vazio da agenda, chega
// aqui com ?barbeiro=2&data=2026-11-03&hora=14:30 e o formulário já vem preenchido.

import FormularioAgendamento from "@/components/FormularioAgendamento";
import Topo from "@/components/Topo";

export const metadata = { title: "Novo agendamento — Barbearia Dom Alfredo" };

type Parametros = { barbeiro?: string; data?: string; hora?: string };

export default async function PaginaNovoAgendamento({ searchParams }: { searchParams: Promise<Parametros> }) {
  const { barbeiro, data, hora } = await searchParams;

  // confiro o formato aqui: endereço digitado na mão não pode quebrar a tela
  const inicial = {
    barbeiro: barbeiro && /^\d+$/.test(barbeiro) ? Number(barbeiro) : undefined,
    data: data && /^\d{4}-\d{2}-\d{2}$/.test(data) ? data : undefined,
    hora: hora && /^\d{2}:\d{2}$/.test(hora) ? hora : undefined,
  };

  return (
    <>
      <Topo migalhas={["Agenda", "Novo agendamento"]} />
      <FormularioAgendamento inicial={inicial} />
    </>
  );
}
