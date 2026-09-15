import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import Avatar from '../../components/ui/Avatar';
import { CATEGORIAS_LOJA } from '../../dados/categorias';
import { useLoja } from '../../contexts/LojaContext';
import { atualizarLoja, enviarImagem } from '../../services/api';
import { validarArquivoImagem } from '../../validators';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import estilos from './PaginaEditarInfoLoja.module.css';

const PaginaEditarInfoLoja = () => {
  const navigate = useNavigate();
  const { loja, recarregar } = useLoja();
  const { mostrarToast } = useToast();
  const [nome, setNome] = useState(loja?.nome ?? '');
  const [descricao, setDescricao] = useState(loja?.descricao ?? '');
  const [categoria, setCategoria] = useState(loja?.categoria ?? '');
  const [imagemUrl, setImagemUrl] = useState(loja?.imagemUrl ?? '');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erroFoto, setErroFoto] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');
  const arquivoRef = useRef<HTMLInputElement>(null);

  /**
   * Sobe a nova logo para o Firebase Storage via POST /uploads/imagem
   * (pasta "lojas") e guarda a URL persistente. Antes o botão "Alterar foto"
   * não fazia nada — não havia como trocar a imagem da loja depois do cadastro.
   */
  const handleTrocarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    // Mesmas regras do backend: JPG/PNG/WEBP até 5 MB.
    const erroArquivo = validarArquivoImagem(arquivo);
    if (erroArquivo) {
      setErroFoto(erroArquivo);
      return;
    }

    setErroFoto('');
    setEnviandoFoto(true);
    try {
      const url = await enviarImagem(arquivo, 'lojas');
      setImagemUrl(url);
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErroFoto(tratado.mensagemGeral ?? 'Não foi possível enviar a imagem.');
    } finally {
      setEnviandoFoto(false);
    }
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loja?.id) return;

    setSalvando(true);
    setErro('');
    try {
      // PUT /lojas/{id} exige o payload completo — espalha a loja já
      // carregada e sobrescreve só os campos editados nesta tela.
      const { id, ...lojaSemId } = loja;
      await atualizarLoja(id, { ...lojaSemId, nome, descricao, categoria, imagemUrl });
      await recarregar();
      navigate('/configuracoes');
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        setErro(tratado.mensagemGeral ?? 'Erro ao salvar informações.');
      }
    } finally {
      setSalvando(false);
    }
  };

  if (!loja) {
    return (
      <LayoutPagina titulo="Editar informações">
        <p>Carregando dados da loja...</p>
      </LayoutPagina>
    );
  }

  return (
    <LayoutPagina titulo="Editar informações">
      <form onSubmit={handleSalvar} className={estilos.form}>
        {erro && (
          <div style={{ color: 'var(--nhac-erro, #e53935)', marginBottom: '1rem', fontSize: '0.875rem' }}>
            {erro}
          </div>
        )}

        <Cartao className={estilos.secao}>
          <div className={estilos.linhaFoto}>
            <Avatar nome={nome || loja.nome} fotoUrl={imagemUrl || undefined} tamanho="medio" />
            <div className={estilos.infoFoto}>
              <span className={estilos.tituloFoto}>Foto ou logo da loja</span>
              <button
                type="button"
                className={estilos.linkAlterarFoto}
                onClick={() => arquivoRef.current?.click()}
                disabled={enviandoFoto}
              >
                {enviandoFoto ? 'Enviando imagem...' : 'Alterar foto'}
              </button>
              <input
                type="file"
                accept="image/*"
                ref={arquivoRef}
                onChange={handleTrocarFoto}
                style={{ display: 'none' }}
              />
              {erroFoto && (
                <span style={{ color: 'var(--nhac-erro, #e53935)', fontSize: '0.8125rem' }}>
                  {erroFoto}
                </span>
              )}
            </div>
          </div>

          <InputTexto rotulo="Nome da loja" valor={nome} aoMudar={setNome} obrigatorio />

          <div className={estilos.categorias}>
            <span className={estilos.rotuloCategorias}>Categoria</span>
            <div className={estilos.tagsWrapper}>
              {CATEGORIAS_LOJA.map((cat) => (
                <button
                  type="button"
                  key={cat}
                  className={`${estilos.tag} ${categoria === cat ? estilos.tagSelecionada : ''}`}
                  onClick={() => setCategoria(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <InputTexto rotulo="Descrição" valor={descricao} aoMudar={setDescricao} />
        </Cartao>

        <div className={estilos.acoes}>
          <Botao type="button" variante="fantasma" onClick={() => navigate('/configuracoes')}>Cancelar</Botao>
          <Botao type="submit" variante="primario" carregando={salvando}>Salvar</Botao>
        </div>
      </form>
    </LayoutPagina>
  );
};

export default PaginaEditarInfoLoja;
