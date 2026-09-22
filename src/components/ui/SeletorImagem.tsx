import React, { useRef, useState } from 'react';
import { enviarImagem, PastaUpload } from '../../services/api';
import { Camera, Loader2 } from 'lucide-react';
import estilos from './SeletorImagem.module.css';

interface PropsSeletorImagem {
  valor?: string | null;
  aoEnviar: (url: string) => void;
  pasta: PastaUpload;
  aoFalhar?: (mensagem: string) => void;
  formato?: 'quadrado' | 'circulo';
  rotulo?: string;
}

/**
 * Clica -> abre o seletor de arquivo do SO -> envia pro backend
 * (POST /uploads/imagem, Firebase Storage) -> devolve a URL pronta pro
 * campo imagemUrl de loja/produto. Antes disso não existia nenhum <input
 * type="file"> real em lugar nenhum do painel — só áreas decorativas.
 */
const SeletorImagem: React.FC<PropsSeletorImagem> = ({
  valor,
  aoEnviar,
  pasta,
  aoFalhar,
  formato = 'quadrado',
  rotulo = 'Alterar foto',
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [enviando, setEnviando] = useState(false);
  const [previaLocal, setPreviaLocal] = useState<string | null>(null);

  const abrirSeletor = () => {
    if (!enviando) inputRef.current?.click();
  };

  const handleArquivoSelecionado = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = ''; // permite selecionar o mesmo arquivo de novo depois
    if (!arquivo) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(arquivo.type)) {
      aoFalhar?.('Formato não suportado. Envie um arquivo JPEG, PNG ou WEBP.');
      return;
    }
    if (arquivo.size > 5 * 1024 * 1024) {
      aoFalhar?.('Arquivo muito grande. O tamanho máximo é 5MB.');
      return;
    }

    const preview = URL.createObjectURL(arquivo);
    setPreviaLocal(preview);
    setEnviando(true);
    try {
      const url = await enviarImagem(arquivo, pasta);
      aoEnviar(url);
    } catch (err) {
      setPreviaLocal(null);
      const mensagem = err instanceof Error ? err.message : 'Não foi possível enviar a imagem.';
      aoFalhar?.(mensagem);
    } finally {
      setEnviando(false);
      URL.revokeObjectURL(preview);
    }
  };

  const imagemExibida = previaLocal ?? valor;

  return (
    <div className={`${estilos.container} ${formato === 'circulo' ? estilos.circulo : ''}`}>
      <div className={estilos.preview} onClick={abrirSeletor}>
        {imagemExibida ? (
          <img src={imagemExibida} alt="Foto" className={estilos.imagem} />
        ) : (
          <Camera size={28} className={estilos.iconeVazio} />
        )}
        {enviando && (
          <div className={estilos.overlay}>
            <Loader2 size={24} className={estilos.spinner} />
          </div>
        )}
      </div>
      <button type="button" className={estilos.botaoTrocar} onClick={abrirSeletor} disabled={enviando}>
        {enviando ? 'Enviando...' : rotulo}
      </button>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className={estilos.inputOculto}
        onChange={handleArquivoSelecionado}
      />
    </div>
  );
};

export default SeletorImagem;
