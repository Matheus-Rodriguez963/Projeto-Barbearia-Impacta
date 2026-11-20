"use client";

// Trocar senha: vale pra qualquer pessoa logada (admin ou recepcionista).

import { useRouter } from "next/navigation";
import { useState } from "react";

import Botao from "@/components/Botao";
import Campo, { classeInputComErro } from "@/components/Campo";
import Secao from "@/components/Secao";
import Topo from "@/components/Topo";
import { lerErroDoFormulario, trocarMinhaSenha } from "@/lib/api";

export default function PaginaSenha() {
  const navegador = useRouter();
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [repetida, setRepetida] = useState("");
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");
  const [trocou, setTrocou] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function salvar(evento: React.FormEvent) {
    evento.preventDefault();
    setTrocou(false);
    setAviso("");

    // confere aqui antes de chamar a API
    if (nova !== repetida) {
      setErros({ repetida: "As senhas não são iguais." });
      return;
    }
    setErros({});

    setSalvando(true);
    try {
      await trocarMinhaSenha(atual, nova);
      setAtual("");
      setNova("");
      setRepetida("");
      setTrocou(true);
      navegador.refresh(); // se era a senha padrão do admin, o aviso some
    } catch (problema) {
      const lido = lerErroDoFormulario(problema);
      setErros(lido.erros);
      setAviso(lido.aviso);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <>
      <Topo migalhas={["Trocar senha"]} />

      <form onSubmit={salvar} noValidate className="min-w-0 flex-1 overflow-auto px-6 py-8.5 md:px-10">
        <div className="mb-7.5">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Trocar senha</h1>
          <p className="m-0 max-w-140 text-sm text-tinta-media">A senha nova precisa ter de 4 a 72 caracteres.</p>
        </div>

        <Secao titulo="Senha" />

        <div className="mb-7 flex max-w-110 flex-col gap-5.5">
          <Campo rotulo="Senha atual" erro={erros.senha_atual}>
            <input
              type="password"
              autoComplete="current-password"
              maxLength={200}
              value={atual}
              onChange={(e) => setAtual(e.target.value)}
              className={classeInputComErro(Boolean(erros.senha_atual))}
            />
          </Campo>
          <Campo rotulo="Nova senha" erro={erros.senha_nova}>
            <input
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={nova}
              onChange={(e) => setNova(e.target.value)}
              className={classeInputComErro(Boolean(erros.senha_nova))}
            />
          </Campo>
          <Campo rotulo="Repetir a nova" erro={erros.repetida}>
            <input
              type="password"
              autoComplete="new-password"
              maxLength={72}
              value={repetida}
              onChange={(e) => setRepetida(e.target.value)}
              className={classeInputComErro(Boolean(erros.repetida))}
            />
          </Campo>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <Botao type="submit" estilo="principal" disabled={salvando || !atual || !nova}>
            {salvando ? "Salvando..." : "Trocar senha"}
          </Botao>
          {aviso && <span className="font-rotulo text-[11px] tracking-[0.14em] text-erro uppercase">{aviso}</span>}
          {trocou && <span className="font-rotulo text-[11px] tracking-[0.14em] text-sucesso uppercase">Senha trocada.</span>}
        </div>
      </form>
    </>
  );
}
