// O estado que todo formulário do sistema tem: os dados, os erros por campo e o aviso do rodapé.

import { useState } from "react";

export function useFormulario<T extends object>(inicial: () => T) {
  const [dados, setDados] = useState<T>(inicial);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [aviso, setAviso] = useState("");

  function limparErro(campo: string) {
    setErros((atual) => {
      const semEsse = { ...atual };
      delete semEsse[campo];
      return semEsse;
    });
    setAviso("");
  }

  /** Atualiza um campo e já limpa o erro dele (senão o vermelho fica na tela pra sempre).
   *  campoDoErro é pra quando o nome na tela é diferente do nome que a API usa no erro. */
  function mudar<C extends keyof T>(campo: C, valor: T[C], campoDoErro = String(campo)) {
    setDados((atual) => ({ ...atual, [campo]: valor }));
    limparErro(campoDoErro);
  }

  return { dados, setDados, erros, setErros, aviso, setAviso, mudar, limparErro };
}
