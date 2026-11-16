import React, { useEffect, useId, useRef, useState } from 'react';
import { Image } from 'lucide-react';
import Botao from './Botao';
import { validarArquivoImagem } from '../../validators';
import estilos from './SeletorBannerLoja.module.css';

interface Props {
  arquivo: File | null;
  urlAtual?: string | null;
  opcional?: boolean;
  desabilitado?: boolean;
  erro?: string;
  aoSelecionar: (arquivo: File | null) => void;
}

export default function SeletorBannerLoja({
  arquivo, urlAtual, opcional, desabilitado, erro, aoSelecionar,
}: Props) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [previa, setPrevia] = useState<string>();
  const [erroArquivo, setErroArquivo] = useState('');
  const rotulo = opcional ? 'Banner da loja (opcional)' : 'Banner da loja';
  const imagem = previa || urlAtual;
  const mensagemErro = erroArquivo || erro;

  useEffect(() => {
    const url = arquivo ? URL.createObjectURL(arquivo) : undefined;
    setPrevia(url);
    return () => { if (url) URL.revokeObjectURL(url); };
  }, [arquivo]);

  const selecionar = (evento: React.ChangeEvent<HTMLInputElement>) => {
    const selecionado = evento.target.files?.[0];
    evento.target.value = '';
    if (!selecionado) return;

    const falha = selecionado.size === 0 ? 'Escolha uma imagem com conteúdo.' : validarArquivoImagem(selecionado);
    setErroArquivo(falha ?? '');
    if (!falha) aoSelecionar(selecionado);
  };

  return (
    <div className={estilos.seletor}>
      <label htmlFor={id} className={estilos.rotulo}>{rotulo}</label>
      <small id={`${id}-ajuda`}>Capa exibida para clientes. Use uma imagem horizontal em JPG, PNG ou WebP de até 5 MB.</small>
      <div className={estilos.previa}>
        {imagem
          ? <img src={imagem} alt="Prévia do banner da loja" />
          : <Image size={32} aria-hidden="true" />}
      </div>
      <input
        ref={input}
        id={id}
        name="bannerUrl"
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={selecionar}
        disabled={desabilitado}
        aria-describedby={mensagemErro ? `${id}-ajuda ${id}-erro` : `${id}-ajuda`}
        aria-invalid={Boolean(mensagemErro)}
      />
      <div className={estilos.acoes}>
        <Botao type="button" variante="secundario" tamanho="pequeno" disabled={desabilitado} onClick={() => input.current?.click()}>
          {imagem ? 'Trocar banner' : 'Adicionar banner'}
        </Botao>
        {arquivo && (
          <Botao type="button" variante="fantasma" tamanho="pequeno" disabled={desabilitado} onClick={() => {
            setErroArquivo('');
            aoSelecionar(null);
          }}>
            Descartar seleção
          </Botao>
        )}
      </div>
      {mensagemErro && <small id={`${id}-erro`} role="alert" className={estilos.erro}>{mensagemErro}</small>}
    </div>
  );
}
