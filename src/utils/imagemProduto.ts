import { validarArquivoImagem } from '../validators';

/** Padroniza novas fotos, preservando a proporção e todos os pixels visíveis. */
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
    if (!imagem.naturalWidth || !imagem.naturalHeight) throw new Error('A imagem está vazia. Escolha outro arquivo.');
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 800;
    const contexto = canvas.getContext('2d');
    if (!contexto) throw new Error('Não conseguimos preparar a imagem. Tente outro navegador.');
    contexto.fillStyle = '#FFFFFF';
    contexto.fillRect(0, 0, 800, 800);
    const escala = Math.min(800 / imagem.naturalWidth, 800 / imagem.naturalHeight);
    const largura = imagem.naturalWidth * escala;
    const altura = imagem.naturalHeight * escala;
    contexto.drawImage(imagem, (800 - largura) / 2, (800 - altura) / 2, largura, altura);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
      resultado => resultado ? resolve(resultado) : reject(new Error('Não conseguimos preparar a imagem. Selecione novamente.')),
      'image/jpeg', 0.9,
    ));
    return new File([blob], `${arquivo.name.replace(/\.[^.]+$/, '') || 'produto'}.jpg`, { type: 'image/jpeg' });
  } finally {
    URL.revokeObjectURL(url);
  }
}
