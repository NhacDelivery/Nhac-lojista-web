import { validarArquivoImagem } from '../validators';

/**
 * Padroniza novas fotos para um quadrado preenchendo o espaço com zoom,
 * sem deixar barras brancas ao redor da imagem.
 */
export async function prepararImagemProduto(arquivo: File): Promise<File> {
  const erro = validarArquivoImagem(arquivo);
  if (erro) throw new Error(erro);

  const url = URL.createObjectURL(arquivo);
  try {
    const imagem = new Image();
    await new Promise<void>((resolve, reject) => {
      imagem.onload = () => resolve();
      imagem.onerror = () => reject(new Error('Não conseguimos abrir esta imagem. Escolha outro arquivo JPG, PNG ou WEBP.'));
      imagem.src = url;
    });

    if (!imagem.naturalWidth || !imagem.naturalHeight) {
      throw new Error('A imagem está vazia. Escolha outro arquivo.');
    }

    const tamanho = 800;
    const canvas = document.createElement('canvas');
    canvas.width = tamanho;
    canvas.height = tamanho;
    const contexto = canvas.getContext('2d');
    if (!contexto) {
      throw new Error('Não conseguimos preparar a imagem. Tente outro navegador.');
    }

    // Usa "cover" para preencher o quadrado sem deixar bordas brancas.
    // Em vez de encaixar a imagem inteira dentro do espaço, aumenta a escala
    // até cobrir o quadro e cortar as extremidades quando necessário.
    const escala = Math.max(tamanho / imagem.naturalWidth, tamanho / imagem.naturalHeight);
    const largura = imagem.naturalWidth * escala;
    const altura = imagem.naturalHeight * escala;

    contexto.fillStyle = '#FFFFFF';
    contexto.fillRect(0, 0, tamanho, tamanho);
    contexto.drawImage(
      imagem,
      (tamanho - largura) / 2,
      (tamanho - altura) / 2,
      largura,
      altura,
    );

    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      resultado => resultado ? resolve(resultado) : reject(new Error('Não conseguimos preparar a imagem. Selecione novamente.')),
      'image/jpeg',
      0.9,
    ));

    return new File(
      [blob],
      `${arquivo.name.replace(/\.[^.]+$/, '') || 'produto'}.jpg`,
      { type: 'image/jpeg' },
    );
  } finally {
    URL.revokeObjectURL(url);
  }
}
