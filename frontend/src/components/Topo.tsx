"use client";

// Barra de cima com o "caminho" da tela (Clientes / Novo cadastro) e a data de hoje.

import { useSyncExternalStore } from "react";

/** "Sábado, 29 de agosto" */
function dataDeHoje() {
  return new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}

// no servidor eu não mostro data nenhuma
function semData() {
  return "";
}

// não preciso ficar escutando mudança, então devolvo uma função que não faz nada
function naoEscutaNada() {
  return () => {};
}

export default function Topo({ migalhas, acao }: { migalhas: string[]; acao?: React.ReactNode }) {
  // a data só pode ser calculada no navegador: se eu calculasse durante o build,
  // o Next gravaria o dia do build e a tela ficaria mostrando a data errada depois.
  const hoje = useSyncExternalStore(naoEscutaNada, dataDeHoje, semData);

  return (
    <header className="flex items-center justify-between gap-6 border-b border-mogno/15 px-6 py-5 md:px-10">
      <div className="font-rotulo text-[10px] tracking-[0.24em] text-rotulo uppercase">
        {migalhas.map((pedaco, indice) => {
          const ultimo = indice === migalhas.length - 1;
          return (
            <span key={pedaco}>
              {indice > 0 && <span className="px-2">/</span>}
              <span className={ultimo ? "text-tinta" : undefined}>{pedaco}</span>
            </span>
          );
        })}
      </div>

      <div className="flex items-center gap-5">
        <div className="hidden font-rotulo text-[10px] tracking-[0.24em] text-rotulo uppercase sm:block">
          {hoje}
        </div>
        {/* só aparece nas telas que passam alguma ação, tipo o botão de novo cadastro */}
        {acao}
      </div>
    </header>
  );
}
