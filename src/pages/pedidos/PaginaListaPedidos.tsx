import React, { useCallback, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Emblema from '../../components/ui/Emblema';
import { StatusPedido } from '../../types';
import { formatarMoeda, formatarHora, STATUS_PEDIDO_INFO } from '../../utils/formatacao';
import { RefreshCw, ChevronRight } from 'lucide-react';
import { listarPedidosPagina } from '../../services/api';
import { usePagina } from '../../hooks/usePagina';
import { useToast } from '../../contexts/ToastContext';
import Paginacao from '../../components/ui/Paginacao';
import estilos from './PaginaListaPedidos.module.css';

interface FiltroTag {
  valor: StatusPedido | 'todos' | string;
  rotulo: string;
}

const FILTROS: FiltroTag[] = [
  { valor: 'todos', rotulo: 'Todos' },
  { valor: 'PENDENTE', rotulo: 'Confirmar' },
  { valor: 'PAGO', rotulo: 'Pago' },
  { valor: 'PREPARANDO', rotulo: 'Em preparo' },
  { valor: 'SAIU_ENTREGA', rotulo: 'A caminho' },
  { valor: 'ENTREGUE', rotulo: 'Entregue' },
  { valor: 'CANCELADO', rotulo: 'Cancelado' },
];

const PaginaListaPedidos = () => {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  useEffect(() => {
    let ativo = true;
    let buscando = false;
    let conhecidos: Set<string> | null = null;
    const verificarNovos = async () => {
      if (buscando || document.visibilityState !== 'visible') return;
      buscando = true;
      try {
        const recente = await listarPedidosPagina(0);
        if (!ativo) return;
        const ids = new Set(recente.content.map(p => p.id));
        if (conhecidos) {
          const novos = recente.content.filter(p => !conhecidos!.has(p.id));
          if (novos.length) mostrarToast(novos.length === 1 ? 'Novo pedido recebido.' : `${novos.length} novos pedidos recebidos.`);
        }
        conhecidos = ids;
      } catch { /* A listagem mantém seu próprio erro e botão de retry. */ }
      finally { buscando = false; }
    };
    void verificarNovos();
    const timer = window.setInterval(() => void verificarNovos(), 10000);
    return () => { ativo = false; window.clearInterval(timer); };
  }, [mostrarToast]);
  const [params, setParams] = useSearchParams();
  const filtro = params.get('status') || 'todos';
  const pagina = Math.max(0, Number(params.get('page')) || 0);
  const buscar = useCallback(() => listarPedidosPagina(pagina, filtro === 'todos' ? '' : filtro), [pagina, filtro]);
  const { dados: pedidosFiltrados, carregando, erro, total, totalPaginas, recarregar } = usePagina(buscar, 15000);
  const setFiltro = (status: string) => setParams(status === 'todos' ? {} : { status });

  return (
    <LayoutPagina titulo="Pedidos">
      <div className={estilos.container} data-testid="e2e.orders.root">
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Pedidos</h2>
          <button className={estilos.botaoSino} aria-label="Atualizar pedidos" onClick={() => recarregar()} disabled={carregando}>
            <RefreshCw size={20} />
          </button>
        </header>

        <div className={estilos.filtros}>
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`${estilos.filtroTag} ${filtro === f.valor ? estilos.filtroAtivo : ''}`}
              aria-pressed={filtro === f.valor}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}

            </button>
          ))}
        </div>

        {carregando ? (
          <div className={estilos.vazio}>
            <p>Carregando pedidos...</p>
          </div>
        ) : erro ? (
          <div className={estilos.vazio}>
            <p role="alert">{erro}</p><button onClick={() => recarregar()}>Tentar novamente</button>
          </div>
        ) : pedidosFiltrados.length === 0 ? (
          <div className={estilos.vazio}>
            <p>Nenhum pedido nesse status.</p>
          </div>
        ) : (
          <div className={estilos.lista}>
            {pedidosFiltrados.map(pedido => {
              const statusInfo = STATUS_PEDIDO_INFO[pedido.status] ?? { rotulo: pedido.status, variante: 'neutro' as const };
              return (
                <Cartao
                  key={pedido.id}
                  className={estilos.cartaoPedido}
                  onClick={() => navigate(`/pedidos/${pedido.id}`)}
                  data-testid={`e2e.order.${pedido.id}`}
                >
                  <div className={estilos.infoPrincipal}>
                    <div className={estilos.linhaTopo}>
                      <span className={estilos.codigo}>#{pedido.id.slice(0, 8)}</span>
                      <Emblema variante={statusInfo.variante} data-testid={`e2e.order.${pedido.id}.status`}>
                        {statusInfo.rotulo}
                      </Emblema>
                    </div>
                    <span className={estilos.cliente}>{pedido.clienteNome}</span>
                    <span className={estilos.detalhe}>
                      {pedido.quantidadeItens} {pedido.quantidadeItens === 1 ? 'item' : 'itens'} · {formatarMoeda(pedido.valorTotal)} · {formatarHora(pedido.criadoEm)}
                    </span>
                  </div>
                  <ChevronRight size={20} className={estilos.seta} />
                </Cartao>
              );
            })}
          </div>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} total={total} carregando={carregando}
          aoMudar={page => setParams({ ...(filtro === 'todos' ? {} : { status: filtro }), page: String(page) })} />
      </div>
    </LayoutPagina>
  );
};

export default PaginaListaPedidos;
