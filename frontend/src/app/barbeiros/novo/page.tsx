// Tela de cadastro de barbeiro novo.

import FormularioBarbeiro from "@/components/FormularioBarbeiro";
import Topo from "@/components/Topo";

export const metadata = { title: "Novo barbeiro — Barbearia Dom Alfredo" };

export default function PaginaNovoBarbeiro() {
  return (
    <>
      <Topo migalhas={["Barbeiros", "Novo barbeiro"]} />
      <FormularioBarbeiro />
    </>
  );
}
