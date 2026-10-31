// A raiz do site não tem tela própria. Desde a etapa 3 ela abre a agenda do dia,
// que é a primeira coisa que a recepção quer ver quando chega.

import { redirect } from "next/navigation";

export default function Inicio() {
  redirect("/agenda");
}
