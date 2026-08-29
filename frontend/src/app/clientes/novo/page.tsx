// Tela de cadastro de cliente novo.

import FormularioCliente from "@/components/FormularioCliente";
import Topo from "@/components/Topo";

export const metadata = { title: "Novo cadastro — Barbearia Dom Alfredo" };

export default function PaginaNovoCliente() {
  return (
    <>
      <Topo migalhas={["Clientes", "Novo cadastro"]} />
      <FormularioCliente />
    </>
  );
}
