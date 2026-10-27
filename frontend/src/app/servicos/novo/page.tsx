// Tela de cadastro de serviço novo.

import FormularioServico from "@/components/FormularioServico";
import Topo from "@/components/Topo";

export const metadata = { title: "Novo serviço — Barbearia Dom Alfredo" };

export default function PaginaNovoServico() {
  return (
    <>
      <Topo migalhas={["Serviços", "Novo serviço"]} />
      <FormularioServico />
    </>
  );
}
