"use client";

// O cardápio da casa: cada serviço com o tempo de cadeira e o preço.

import { useEffect, useState } from "react";

import { BotaoLink } from "@/components/Botao";
import Topo from "@/components/Topo";
import { ErroDaApi, listarServicos } from "@/lib/api";
import { duracaoBonita, reais } from "@/lib/mascaras";
import type { Servico } from "@/lib/tipos";

export default function PaginaServicos() {
  const [servicos, setServicos] = useState<Servico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    // o cardápio é curto: vem tudo de uma vez, sem paginação
    listarServicos()
      .then((resposta) => setServicos(resposta.itens))
      .catch((problema) =>
        setErro(problema instanceof ErroDaApi ? problema.message : "Não consegui carregar o cardápio."),
      )
      .finally(() => setCarregando(false));
  }, []);

  const noCardapio = servicos.filter((servico) => servico.ativo).length;

  return (
    <>
      <Topo
        migalhas={["Serviços", "Cardápio"]}
        acao={
          <BotaoLink href="/servicos/novo" estilo="principal" className="py-2.5">
            Novo serviço
          </BotaoLink>
        }
      />

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 py-8 md:px-10">
        <div className="mb-6">
          <h1 className="mb-1 font-titulo text-[32px] leading-tight text-tinta">Serviços</h1>
          <p className="m-0 text-sm text-tinta-media">
            {carregando ? "Buscando..." : `${noCardapio} ${noCardapio === 1 ? "serviço" : "serviços"} no cardápio`}
          </p>
        </div>

        {erro && (
          <div className="mb-5 border border-erro/40 bg-erro/5 px-4 py-3 text-[13px] text-erro">
            {erro} — confira se o backend está rodando com <code>uvicorn app.main:app --reload</code>.
          </div>
        )}

        {!carregando && !erro && servicos.length === 0 && (
          <div className="border border-mogno/15 bg-papel-claro px-4 py-12 text-center text-[15px] text-tinta-media">
            Nenhum serviço cadastrado ainda. Clique em &ldquo;Novo serviço&rdquo;.
          </div>
        )}

        {/* um cartão por serviço, como a tabela de preços pendurada na parede */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {servicos.map((servico) => (
            <article
              key={servico.id}
              className={`flex flex-col gap-3 border border-mogno/22 bg-papel-claro px-5 py-5 ${
                servico.ativo ? "" : "opacity-60"
              }`}
            >
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="m-0 font-titulo text-[21px] leading-tight text-tinta">{servico.nome}</h2>
                <span className="font-titulo text-[19px] whitespace-nowrap text-terracota">{reais(servico.preco)}</span>
              </div>

              <div className="flex items-center gap-2 font-rotulo text-[10px] tracking-[0.2em] text-[#9a5a2e] uppercase">
                {duracaoBonita(servico.duracao)} de cadeira
                {!servico.ativo && (
                  <span className="border border-mogno/30 px-1.5 py-0.5 text-[8px] text-tinta-fraca">
                    Fora do cardápio
                  </span>
                )}
              </div>

              <p className="m-0 flex-1 text-[13px] leading-relaxed text-tinta-media">
                {servico.descricao ?? "Sem descrição."}
              </p>

              <div className="flex justify-end">
                <BotaoLink href={`/servicos/${servico.id}/editar`} className="px-4 py-2 text-[10px]">
                  Editar
                </BotaoLink>
              </div>
            </article>
          ))}
        </div>
      </div>
    </>
  );
}
