import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Emblema from '../../components/ui/Emblema';
import { StatusPedido } from '../../types';
import { formatarMoeda, formatarHora, STATUS_PEDIDO_INFO } from '../../utils/formatacao';
import { Bell, ChevronRight } from 'lucide-react';
import { listarPedidos, PedidoResumoLojistaDTO } from '../../services/api';
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
];

const PaginaListaPedidos = () => {
  const navigate = useNavigate();
  const [filtro, setFiltro] = useState<FiltroTag['valor']>('todos');
  const [pedidos, setPedidos] = useState<PedidoResumoLojistaDTO[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    try {
      setCarregando(true);
      setErro(null);
      const dados = await listarPedidos();
      setPedidos(dados);
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
    } finally {
      setCarregando(false);
    }
  }

  const contagemPorFiltro = (valor: FiltroTag['valor']) =>
    valor === 'todos' ? pedidos.length : pedidos.filter(p => p.status === valor).length;

  const pedidosFiltrados = pedidos
    .filter(p => filtro === 'todos' || p.status === filtro)
    .sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime());

  return (
    <LayoutPagina titulo="Pedidos">
      <div className={estilos.container} data-testid="e2e.orders.root">
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Pedidos</h2>
          <button className={estilos.botaoSino} aria-label="Notificações">
            <Bell size={20} />
          </button>
        </header>

        <div className={estilos.filtros}>
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`${estilos.filtroTag} ${filtro === f.valor ? estilos.filtroAtivo : ''}`}
              onClick={() => setFiltro(f.valor)}
            >
              {f.rotulo}
              <span className={estilos.filtroContagem}>{contagemPorFiltro(f.valor)}</span>
            </button>
          ))}
        </div>

        {carregando ? (
          <div className={estilos.vazio}>
            <p>Carregando pedidos...</p>
          </div>
        ) : erro ? (
          <div className={estilos.vazio}>
            <p>{erro}</p>
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
      </div>
    </LayoutPagina>
  );
};

export default PaginaListaPedidos;
