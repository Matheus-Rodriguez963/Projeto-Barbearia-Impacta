// A raiz do site não tem tela própria: leva pra primeira tela que a pessoa pode abrir
// (pro admin, a agenda, que é a primeira coisa que a recepção quer ver quando chega).

import { redirect } from "next/navigation";

import BotaoSair from "@/components/BotaoSair";
import { lerUsuario } from "@/lib/servidor";
import { primeiroCaminho } from "@/lib/tipos";

export default async function Inicio() {
  const usuario = await lerUsuario();
  if (usuario === "api_fora") return null; // o layout já mostra o aviso; redirecionar aqui criaria um vai e volta
  if (!usuario) redirect("/login");

  const caminho = primeiroCaminho(usuario);
  if (caminho) redirect(caminho);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-texto text-base text-tinta-media">Nenhum menu liberado ainda. Fale com o administrador.</p>
      <BotaoSair />
    </div>
  );
}
