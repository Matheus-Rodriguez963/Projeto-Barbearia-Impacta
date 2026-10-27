// A raiz do site não tem tela própria: mando direto pra agenda,
// que é a tela que o balcão deixa aberta o dia todo (etapa 3).

import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/agendamentos");
}
