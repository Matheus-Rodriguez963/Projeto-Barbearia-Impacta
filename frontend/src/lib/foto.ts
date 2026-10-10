// Prepara a foto de perfil no navegador antes de mandar pra API.
// Foto de celular tem 4 MB fácil; recortando no quadrado e diminuindo pra 480px
// ela fica com uns 60 KB, que é o que precisa pra moldura da tela.

const LADO = 480;

/** Recorta o meio da imagem num quadrado, reduz pra 480x480 e devolve um JPEG. */
export async function prepararFoto(arquivo: File): Promise<Blob> {
  if (!arquivo.type.startsWith("image/")) {
    throw new Error("Escolha um arquivo de imagem (JPG ou PNG).");
  }

  // createImageBitmap já respeita a rotação que o celular grava na foto
  const imagem = await createImageBitmap(arquivo, { imageOrientation: "from-image" }).catch(() => {
    throw new Error("Não consegui abrir essa imagem. Tenta outra.");
  });

  // o maior quadrado que cabe na foto, centralizado
  const lado = Math.min(imagem.width, imagem.height);
  const x = (imagem.width - lado) / 2;
  const y = (imagem.height - lado) / 2;

  const tela = document.createElement("canvas");
  tela.width = LADO;
  tela.height = LADO;
  const pincel = tela.getContext("2d");
  if (!pincel) throw new Error("Seu navegador não conseguiu preparar a foto.");

  pincel.drawImage(imagem, x, y, lado, lado, 0, 0, LADO, LADO);
  imagem.close();

  return new Promise((resolver, rejeitar) =>
    tela.toBlob(
      (blob) => (blob ? resolver(blob) : rejeitar(new Error("Não consegui preparar a foto."))),
      "image/jpeg",
      0.85,
    ),
  );
}
