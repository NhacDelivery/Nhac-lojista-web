import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import Emblema from '../../components/ui/Emblema';
import Toggle from '../../components/ui/Toggle';
import { CATEGORIAS_PRODUTO } from '../../dados/categorias';
import { formatarMoeda } from '../../utils/formatacao';
import { Plus, Search, Edit2 } from 'lucide-react';
import { listarProdutosPagina, desativarProduto, ativarProduto, ProdutoLojistaDTO } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import estilos from './PaginaListaProdutos.module.css';

const PaginaListaProdutos = () => {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [produtos, setProdutos] = useState<ProdutoLojistaDTO[]>([]);
  const [busca, setBusca] = useState('');
  const [categoriaFiltro, setCategoriaFiltro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [carregandoMais, setCarregandoMais] = useState(false);

  useEffect(() => {
    carregarProdutos();
  }, []);

  async function carregarProdutos() {
    try {
      setCarregando(true);
      setErro(null);
      const dados = await listarProdutosPagina({ page: 0, size: 50 });
      setProdutos(dados.content ?? []);
      setPagina(0);
      setTotalPaginas(dados.totalPages);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setCarregando(false);
    }
  }

  async function carregarMais() {
    if (carregandoMais || pagina + 1 >= totalPaginas) return;
    setCarregandoMais(true);
    try {
      const dados = await listarProdutosPagina({ page: pagina + 1, size: 50 });
      setProdutos((atual) => {
        const ids = new Set(atual.map((p) => p.id));
        return [...atual, ...(dados.content ?? []).filter((p) => !ids.has(p.id))];
      });
      setPagina(dados.number);
      setTotalPaginas(dados.totalPages);
    } catch (err) {
      mostrarToast(tratarErroApi(err).mensagemGeral ?? 'Não foi possível carregar mais produtos.');
    } finally { setCarregandoMais(false); }
  }

  const handleToggleAtivo = async (id: string, novoEstado: boolean) => {
    if (!id) return;
    try {
      if (novoEstado) {
        await ativarProduto(id);
      } else {
        await desativarProduto(id);
      }
      setProdutos(produtos.map(p => p.id === id ? { ...p, ativo: novoEstado } : p));
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        mostrarToast(tratado.mensagemGeral ?? 'Erro ao alterar status do produto.');
      }
    }
  };

  const produtosFiltrados = produtos.filter(p => {
    const matchBusca = p.nome.toLowerCase().includes(busca.toLowerCase());
    const matchCategoria = categoriaFiltro ? p.categoriaMenu === categoriaFiltro : true;
    return matchBusca && matchCategoria;
  });

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
              rotulo=""
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
            <p>{erro}</p>
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
                    <img src={produto.imagemUrl || 'https://placehold.co/400x300/FF6961/FFFFFF?text=Sem+Imagem'} alt={produto.nome} className={estilos.imagem} />
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
                        aoMudar={(v) => produto.id && handleToggleAtivo(produto.id, v)} 
                        rotulo={produto.ativo ? 'Ativo' : 'Inativo'}
                      />
                      <Botao 
                        variante="fantasma" 
                        icone={<Edit2 size={20} />} 
                        onClick={() => navigate(`/produtos/${produto.id}`)}
                      />
                    </div>
                  </div>
                </Cartao>
              );
            })}
          </div>
        )}
        {pagina + 1 < totalPaginas && (
          <div style={{ textAlign: 'center', padding: 16 }}>
            <Botao variante="secundario" onClick={carregarMais} carregando={carregandoMais}>Carregar mais produtos</Botao>
          </div>
        )}
      </div>
    </LayoutPagina>
  );
};

export default PaginaListaProdutos;
