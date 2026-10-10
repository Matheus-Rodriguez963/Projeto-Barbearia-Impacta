"use client";

// A foto de perfil do barbeiro: a moldura onde se clica pra escolher e o estado da foto.
// A foto escolhida fica só no navegador até a ficha ser salva; aí o formulário chama
// o sincronizar(), que manda (ou tira) a foto na API.

import { useEffect, useState } from "react";

import { enviarFotoBarbeiro, removerFotoBarbeiro } from "@/lib/api";
import { prepararFoto } from "@/lib/foto";
import type { Barbeiro } from "@/lib/tipos";

export function useFotoDePerfil(fotoSalva: string | null) {
  const [nova, setNova] = useState<Blob | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [tirar, setTirar] = useState(false);
  const [preparando, setPreparando] = useState(false);
  const [erro, setErro] = useState("");

  // a prévia é um endereço "blob:" que ocupa memória até ser liberado
  useEffect(() => {
    return () => {
      if (previa) URL.revokeObjectURL(previa);
    };
  }, [previa]);

  async function escolher(arquivo: File) {
    setPreparando(true);
    setErro("");
    try {
      const pronta = await prepararFoto(arquivo);
      setNova(pronta);
      setPrevia(URL.createObjectURL(pronta));
      setTirar(false);
    } catch (problema) {
      setErro(problema instanceof Error ? problema.message : "Foto inválida.");
    } finally {
      setPreparando(false);
    }
  }

  /** Se era uma foto recém-escolhida, volta pra anterior; se era a salva, marca pra tirar. */
  function descartar() {
    if (previa) {
      setNova(null);
      setPrevia(null);
    } else {
      setTirar(true);
    }
  }

  function recomecar() {
    setNova(null);
    setPrevia(null);
    setTirar(false);
    setErro("");
  }

  async function sincronizar(barbeiro: Barbeiro): Promise<Barbeiro> {
    if (nova) return enviarFotoBarbeiro(barbeiro.id, nova);
    if (tirar && barbeiro.foto_url) return removerFotoBarbeiro(barbeiro.id);
    return barbeiro;
  }

  return {
    naTela: tirar ? null : (previa ?? fotoSalva),
    trocada: Boolean(previa),
    preparando,
    erro,
    escolher,
    descartar,
    recomecar,
    sincronizar,
  };
}

export default function EscolherFoto({ foto }: { foto: ReturnType<typeof useFotoDePerfil> }) {
  return (
    <div className="mb-7.5 flex items-center gap-5.5">
      <label
        className={`moldura-latao relative flex size-26 shrink-0 cursor-pointer p-1 ${
          foto.erro ? "outline-2 outline-offset-2 outline-erro" : ""
        }`}
        title="Escolher foto"
      >
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Escolher foto de perfil"
          className="absolute inset-0 cursor-pointer opacity-0"
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = ""; // pra conseguir escolher o mesmo arquivo de novo depois
            if (arquivo) foto.escolher(arquivo);
          }}
        />
        <span
          className="flex size-full items-center justify-center bg-[#ede3d0] bg-cover bg-center font-rotulo text-[9px] tracking-[0.2em] text-rotulo uppercase"
          style={foto.naTela ? { backgroundImage: `url("${foto.naTela}")` } : undefined}
        >
          {foto.preparando ? "..." : !foto.naTela && "Foto"}
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-[14px] text-tinta">Foto de perfil</span>
        <span className="max-w-75 text-[12.5px] leading-normal text-tinta-fraca">
          Quadrada, de frente, com boa luz. Clique na moldura para escolher.
        </span>
        {foto.naTela && (
          <button
            type="button"
            onClick={foto.descartar}
            className="w-fit cursor-pointer font-rotulo text-[10px] tracking-[0.18em] text-erro uppercase hover:underline"
          >
            {foto.trocada ? "Desfazer troca" : "Tirar foto"}
          </button>
        )}
        {foto.erro && <span className="text-[12px] text-erro">{foto.erro}</span>}
      </div>
    </div>
  );
}
