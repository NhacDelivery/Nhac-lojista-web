import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import AvisoFormulario from '../../components/ui/AvisoFormulario';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import SeletorBannerLoja from '../../components/ui/SeletorBannerLoja';
import { useLoja } from '../../contexts/LojaContext';
import { useToast } from '../../contexts/ToastContext';
import { atualizarBannerLoja, enviarImagem } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import estilos from './PaginaEditarInfoLoja.module.css';

export default function PaginaEditarBannerLoja() {
  const navigate = useNavigate();
  const { loja, recarregar } = useLoja();
  const { mostrarToast } = useToast();
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);
  const envioEmCurso = useRef(false);
  const urlEnviada = useRef<string | undefined>(undefined);

  const salvar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!loja || !arquivo || envioEmCurso.current) return;

    envioEmCurso.current = true;
    setSalvando(true);
    setErro('');
    try {
      urlEnviada.current ??= await enviarImagem(arquivo, 'lojas');
      await atualizarBannerLoja(loja.id, urlEnviada.current);
      await recarregar();
      mostrarToast('Banner da loja atualizado.', { tipo: 'sucesso' });
      navigate('/configuracoes');
    } catch (falha) {
      setErro(tratarErroApi(falha).mensagemGeral || 'Não foi possível salvar o banner.');
    } finally {
      envioEmCurso.current = false;
      setSalvando(false);
    }
  };

  return (
    <LayoutPagina titulo="Personalização da loja">
      <form onSubmit={salvar} className={estilos.form}>
        {erro && <AvisoFormulario mensagem={erro} />}
        <Cartao className={estilos.secao}>
          <SeletorBannerLoja
            arquivo={arquivo}
            urlAtual={loja?.bannerUrl}
            desabilitado={salvando}
            aoSelecionar={(selecionado) => {
              setArquivo(selecionado);
              setErro('');
              urlEnviada.current = undefined;
            }}
          />
        </Cartao>
        <div className={estilos.acoes}>
          <Botao type="button" variante="fantasma" disabled={salvando} onClick={() => navigate('/configuracoes')}>Cancelar</Botao>
          <Botao type="submit" carregando={salvando} disabled={!arquivo}>Salvar banner</Botao>
        </div>
      </form>
    </LayoutPagina>
  );
}
