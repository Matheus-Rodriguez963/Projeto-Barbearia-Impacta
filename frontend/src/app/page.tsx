// A raiz do site não tem tela própria: mando direto pra lista de clientes,
// que é o que essa primeira etapa do projeto entrega.

import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/clientes");
}
