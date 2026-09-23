import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import Emblema from '../../components/ui/Emblema';
import Toggle from '../../components/ui/Toggle';
import { CATEGORIAS_PRODUTO } from '../../dados/categorias';
import { formatarMoeda } from '../../utils/formatacao';
import { Plus, Search, Edit2 } from 'lucide-react';
import { listarProdutosPagina, desativarProduto, ativarProduto } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import { usePagina } from '../../hooks/usePagina';
import Paginacao from '../../components/ui/Paginacao';
import estilos from './PaginaListaProdutos.module.css';

const PaginaListaProdutos = () => {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [params, setParams] = useSearchParams();
  const [busca, setBusca] = useState(params.get('q') || '');
  const [compondo, setCompondo] = useState(false);
  const [alterando, setAlterando] = useState<string | null>(null);
  const categoriaFiltro = params.get('categoria') || '';
  const pagina = Math.max(0, Number(params.get('page')) || 0);
  const query = params.get('q') || '';
  const atualizarFiltro = useCallback((chave: string, valor: string) => {
    setParams(atual => { const p = new URLSearchParams(atual); p.delete('page'); if (valor) p.set(chave, valor); else p.delete(chave); return p; }, { replace: true });
  }, [setParams]);
  useEffect(() => { setBusca(query); }, [query]);
  useEffect(() => {
    if (compondo || busca === query) return;
    const timer = window.setTimeout(() => atualizarFiltro('q', busca), busca ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [busca, query, compondo, atualizarFiltro]);
  const setCategoriaFiltro = (categoria: string) => atualizarFiltro('categoria', categoria);
  const buscar = useCallback(() => listarProdutosPagina(pagina, query, categoriaFiltro), [pagina, query, categoriaFiltro]);
  const { dados: produtos, setDados: setProdutos, carregando, erro, total, totalPaginas, recarregar } = usePagina(buscar);

  const handleToggleAtivo = async (id: string, novoEstado: boolean) => {
    if (!id || alterando) return;
    setAlterando(id);
    try {
      if (novoEstado) {
        await ativarProduto(id);
      } else {
        await desativarProduto(id);
      }
      setProdutos(atual => atual.map(p => p.id === id ? { ...p, ativo: novoEstado } : p));
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        mostrarToast(tratado.mensagemGeral ?? 'Erro ao alterar status do produto.');
      }
    } finally { setAlterando(null); }
  };

  const produtosFiltrados = produtos;

  return (
    <LayoutPagina titulo="Produtos">
      <div className={estilos.container}>
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Seus Produtos</h2>
          <Botao
            onClick={() => navigate('/produtos/novo')}
            icone={<Plus size={20} />}
          >
            Novo produto
          </Botao>
        </header>

        <div className={estilos.filtros}>
          <div className={estilos.buscaWrapper}>
            <InputTexto
              rotulo="Buscar produtos"
              type="search"
              onCompositionStart={() => setCompondo(true)}
              onCompositionEnd={() => setCompondo(false)}
              valor={busca}
              aoMudar={setBusca}
              placeholder="Buscar produtos..."
              icone={<Search size={20} />}
            />
          </div>
          <div className={estilos.categoriaWrapper}>
            <button
              type="button"
              className={`${estilos.chipCategoria} ${categoriaFiltro === '' ? estilos.chipSelecionado : ''}`}
              onClick={() => setCategoriaFiltro('')}
            >
              Todas
            </button>
            {CATEGORIAS_PRODUTO.map((cat) => (
              <button
                type="button"
                key={cat}
                className={`${estilos.chipCategoria} ${categoriaFiltro === cat ? estilos.chipSelecionado : ''}`}
                onClick={() => setCategoriaFiltro(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {carregando ? (
          <div className={estilos.vazio}>
            <p>Carregando produtos...</p>
          </div>
        ) : erro ? (
          <div className={estilos.vazio}>
            <p role="alert">{erro}</p><button onClick={() => recarregar()}>Tentar novamente</button>
          </div>
        ) : produtosFiltrados.length === 0 ? (
          <div className={estilos.vazio}>
            <p>Nenhum produto encontrado.</p>
          </div>
        ) : (
          <div className={estilos.grid}>
            {produtosFiltrados.map(produto => {
              return (
                <Cartao key={produto.id} className={estilos.cartaoProduto}>
                  <div className={estilos.imagemWrapper}>
                    <img src={produto.imagemUrl || '/nhac-logo.png'} alt={produto.nome} className={estilos.imagem} />
                  </div>
                  <div className={estilos.info}>
                    <div className={estilos.linha1}>
                      <h3 className={estilos.nome}>{produto.nome}</h3>
                      <Emblema variante="info">{produto.categoriaMenu || 'Outros'}</Emblema>
                    </div>
                    <p className={estilos.preco}>{formatarMoeda(produto.preco)}</p>
                    <div className={estilos.acoes}>
                      <Toggle
                        ativo={produto.ativo}
                        desabilitado={alterando !== null}
                        aoMudar={(v) => produto.id && handleToggleAtivo(produto.id, v)}
                        rotulo={produto.ativo ? 'Ativo' : 'Inativo'}
                      />
                      <Botao
                        variante="fantasma"
                        icone={<Edit2 size={20} />}
                        aria-label={`Editar ${produto.nome}`}
                        onClick={() => navigate(`/produtos/${produto.id}`)}
                      />
                    </div>
                  </div>
                </Cartao>
              );
            })}
          </div>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} total={total} carregando={carregando}
          aoMudar={page => setParams(atual => { const p = new URLSearchParams(atual); p.set('page', String(page)); return p; })} />
      </div>
    </LayoutPagina>
  );
};

export default PaginaListaProdutos;
