// Tela de marcar horário.

import FormularioAgendamento from "@/components/FormularioAgendamento";
import Topo from "@/components/Topo";

export const metadata = { title: "Marcar horário — Barbearia Dom Alfredo" };

export default function PaginaMarcarHorario() {
  return (
    <>
      <Topo migalhas={["Agenda", "Marcar horário"]} />
      <FormularioAgendamento />
    </>
  );
}
