// Prepara a foto de perfil (e a logo da barbearia) no navegador antes de mandar pra API.
// Foto de celular tem 4 MB fácil; recortando no quadrado e diminuindo pra 480px
// ela fica com uns 60 KB, que é o que precisa pra moldura da tela.

const LADO = 480;

// a logo aparece pequena no menu; 600x200 sobra até em tela de alta resolução
const LOGO_LARGURA = 600;
const LOGO_ALTURA = 200;

async function abrirImagem(arquivo: File): Promise<ImageBitmap> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG ou PNG).");
  }

  // createImageBitmap já respeita a rotação que o celular grava na foto
  return createImageBitmap(arquivo, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Não consegui abrir essa imagem. Tenta outra.");
  });
}

// oQue: "foto" na foto do barbeiro, "imagem" na logo
function novaTela(largura: number, altura: number, oQue: string) {
  const tela = document.createElement("canvas");
  tela.width = largura;
  tela.height = altura;
  const pincel = tela.getContext("2d");
  if (!pincel) throw new Error(`Seu navegador não conseguiu preparar a ${oQue}.`);
  return { tela, pincel };
}

function virarArquivo(tela: HTMLCanvasElement, oQue: string, tipo: string, qualidade?: number): Promise<Blob> {
  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error(`Não consegui preparar a ${oQue}.`))),
      tipo,
      qualidade,
    ),
  );
}

/** Recorta o meio da imagem num quadrado, reduz pra 480x480 e devolve um JPEG. */
export async function prepararFoto(arquivo: File): Promise<Blob> {
  const imagem = await abrirImagem(arquivo);

  // o maior quadrado que cabe na foto, centralizado
  const lado = Math.min(imagem.width, imagem.height);
  const x = (imagem.width - lado) / 2;
  const y = (imagem.height - lado) / 2;

  const { tela, pincel } = novaTela(LADO, LADO, "foto");
  pincel.drawImage(imagem, x, y, lado, lado, 0, 0, LADO, LADO);
  imagem.close();

  return virarArquivo(tela, "foto", "image/jpeg", 0.85);
}

/** Reduz a logo pra caber em 600x200 sem cortar nada e devolve um PNG.
 *  Logo costuma ser larga e ter fundo transparente, por isso nada de quadrado nem JPEG. */
export async function prepararLogo(arquivo: File): Promise<Blob> {
  const imagem = await abrirImagem(arquivo);

  // só diminui: logo pequena fica do tamanho que veio
  const escala = Math.min(1, LOGO_LARGURA / imagem.width, LOGO_ALTURA / imagem.height);
  const largura = Math.max(1, Math.round(imagem.width * escala));
  const altura = Math.max(1, Math.round(imagem.height * escala));

  const { tela, pincel } = novaTela(largura, altura, "imagem");
  pincel.drawImage(imagem, 0, 0, largura, altura);
  imagem.close();

  return virarArquivo(tela, "imagem", "image/png");
}
