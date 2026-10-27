// Máscaras e validações que rodam no navegador enquanto eu digito.
// A API valida tudo de novo no servidor — aqui é só pra avisar o usuário na hora.

/** Tira tudo que não é número. */
export function soNumeros(valor: string): string {
  return (valor || "").replace(/\D/g, "");
}

/** 11990001234 -> (11) 99000-1234 (funciona enquanto a pessoa digita) */
export function mascaraTelefone(valor: string): string {
  const d = soNumeros(valor).slice(0, 11);

  if (d.length <= 2) return d ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** 52998224725 -> 529.982.247-25 */
export function mascaraCpf(valor: string): string {
  const d = soNumeros(valor).slice(0, 11);
  let saida = d.slice(0, 3);

  if (d.length > 3) saida += `.${d.slice(3, 6)}`;
  if (d.length > 6) saida += `.${d.slice(6, 9)}`;
  if (d.length > 9) saida += `-${d.slice(9, 11)}`;

  return saida;
}

/** Mesma conta dos dígitos verificadores que eu fiz no backend. */
export function cpfValido(cpf: string): boolean {
  const d = soNumeros(cpf);

  if (d.length !== 11) return false;
  if (d === d[0].repeat(11)) return false; // 111.111.111-11 e afins

  for (const quantidade of [9, 10]) {
    let soma = 0;
    for (let i = 0; i < quantidade; i++) {
      soma += Number(d[i]) * (quantidade + 1 - i);
    }
    const resto = (soma * 10) % 11;
    const digito = resto === 10 ? 0 : resto;
    if (digito !== Number(d[quantidade])) return false;
  }

  return true;
}

/** Confere DDD e o nono dígito do celular. */
export function telefoneValido(telefone: string): boolean {
  const d = soNumeros(telefone);

  if (d.length !== 10 && d.length !== 11) return false;
  if (Number(d.slice(0, 2)) < 11) return false; // não existe DDD abaixo de 11
  if (d.length === 11 && d[2] !== "9") return false; // celular sempre começa com 9

  return true;
}

/** "Pablo Miguel Dias" -> "PD" (as iniciais que aparecem na ficha). */
export function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);

  if (partes.length === 0) return "—";
  const primeira = partes[0][0];
  const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

  return (primeira + ultima).toUpperCase();
}

/** "2000-05-17" -> "17/05/2000" (sem usar new Date pra não errar o fuso). */
export function dataBonita(data: string | null): string {
  if (!data) return "";
  const [ano, mes, dia] = data.slice(0, 10).split("-");
  return `${dia}/${mes}/${ano}`;
}

/** "09:00:00" -> "09:00" (a API manda com segundos, o input de hora quer sem). */
export function horaCurta(hora: string | null): string {
  return (hora ?? "").slice(0, 5);
}

/** "2019-08" -> "ago/2019" */
export function mesEAno(valor: string): string {
  if (!valor) return "—";
  const [ano, mes] = valor.split("-");
  const meses = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${meses[Number(mes) - 1]}/${ano}`;
}

/** As checagens que o cliente e o barbeiro têm iguais. Devolve {campo: mensagem}. */
export function conferirIdentificacao(dados: { nome: string; telefone: string; cpf: string; email: string }) {
  const problemas: Record<string, string> = {};

  if (dados.nome.trim().split(/\s+/).filter(Boolean).length < 2) {
    problemas.nome = "Informe o nome completo (nome e sobrenome).";
  }
  if (!telefoneValido(dados.telefone)) {
    problemas.telefone = "Telefone inválido. Ex: (11) 99000-1234";
  }
  if (!cpfValido(dados.cpf)) {
    problemas.cpf = "CPF inválido. Confira os números.";
  }
  if (dados.email.trim() && !dados.email.includes("@")) {
    problemas.email = "E-mail inválido.";
  }

  return problemas;
}

/** 45.5 -> "R$ 45,50" */
export function reais(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** 75 -> "1h15"; 45 -> "45 min" */
export function duracaoBonita(minutos: number): string {
  if (minutos < 60) return `${minutos} min`;
  const resto = minutos % 60;
  return `${Math.floor(minutos / 60)}h${resto ? String(resto).padStart(2, "0") : ""}`;
}

/** A data de hoje (ou daqui a N dias) no formato da API, "2026-10-28", no fuso de quem está usando. */
export function diaISO(daquiA = 0, base = new Date()): string {
  const dia = new Date(base.getFullYear(), base.getMonth(), base.getDate() + daquiA);
  const mes = String(dia.getMonth() + 1).padStart(2, "0");
  return `${dia.getFullYear()}-${mes}-${String(dia.getDate()).padStart(2, "0")}`;
}

/** "2026-10-28" -> "quarta, 28 de outubro" */
export function diaPorExtenso(data: string): string {
  const [ano, mes, dia] = data.split("-").map(Number);
  return new Date(ano, mes - 1, dia).toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
}
