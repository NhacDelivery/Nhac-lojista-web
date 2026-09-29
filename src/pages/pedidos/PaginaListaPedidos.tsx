import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Emblema from '../../components/ui/Emblema';
import { StatusPedido } from '../../types';
import { formatarMoeda, formatarHora, STATUS_PEDIDO_INFO } from '../../utils/formatacao';
import { Bell, ChevronRight } from 'lucide-react';
import Botao from '../../components/ui/Botao';
import { listarPedidosPagina, PedidoResumoLojistaDTO } from '../../services/api';
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
  const [pagina, setPagina] = useState(0);
  const [totalPaginas, setTotalPaginas] = useState(0);
  const [contagens, setContagens] = useState<Record<string, number>>({});
  const [avisos, setAvisos] = useState<string[]>([]);
  const [mostrarAvisos, setMostrarAvisos] = useState(false);
  const requisicaoAtual = useRef(0);
  const idsConhecidos = useRef<Set<string> | null>(null);

  const carregarPedidos = useCallback(async (silencioso = false) => {
    const requisicao = ++requisicaoAtual.current;
    try {
      if (!silencioso) {
        setCarregando(true);
        setErro(null);
      }
      const resposta = await listarPedidosPagina({
        status: filtro === 'todos' ? undefined : filtro,
        page: pagina,
        size: 30,
      });
      if (requisicao !== requisicaoAtual.current) return;
      const dados = resposta.content ?? [];
      setTotalPaginas(resposta.totalPages);
      if (pagina > 0 && pagina >= resposta.totalPages) {
        setPagina(Math.max(0, resposta.totalPages - 1));
        return;
      }
      if (filtro === 'todos' && pagina === 0 && idsConhecidos.current) {
        const novos = dados.filter((pedido) => !idsConhecidos.current?.has(pedido.id));
        if (novos.length > 0) {
          setAvisos((atuais) => [`${novos.length} novo(s) pedido(s) recebido(s).`, ...atuais].slice(0, 10));
        }
      }
      if (filtro === 'todos' && pagina === 0) idsConhecidos.current = new Set(dados.map((pedido) => pedido.id));
      setPedidos(dados);
      const totais = await Promise.allSettled(FILTROS.map(async ({ valor }) => {
        if (valor === filtro) return [valor, resposta.totalElements] as const;
        const resultado = await listarPedidosPagina({ status: valor === 'todos' ? undefined : valor, size: 1 });
        return [valor, resultado.totalElements] as const;
      }));
      if (requisicao === requisicaoAtual.current) setContagens((anteriores) => ({
        ...anteriores,
        ...Object.fromEntries(totais.filter((r): r is PromiseFulfilledResult<readonly [string, number]> => r.status === 'fulfilled')
          .map((r) => r.value)),
      }));
    } catch (err) {
      if (!silencioso && requisicao === requisicaoAtual.current) {
        setErro(err instanceof Error ? err.message : 'Erro ao carregar pedidos');
      }
    } finally {
      if (!silencioso && requisicao === requisicaoAtual.current) setCarregando(false);
    }
  }, [filtro, pagina]);

  useEffect(() => {
    void carregarPedidos();
    const intervalo = window.setInterval(() => void carregarPedidos(true), 10000);
    const contador = requisicaoAtual;
    return () => { window.clearInterval(intervalo); contador.current++; };
  }, [carregarPedidos]);

  const contagemPorFiltro = (valor: FiltroTag['valor']) =>
    contagens[valor] ?? 0;

  const pedidosFiltrados = pedidos;

  return (
    <LayoutPagina titulo="Pedidos">
      <div className={estilos.container} data-testid="e2e.orders.root">
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Pedidos</h2>
          <button className={estilos.botaoSino} aria-label="Avisos de novos pedidos"
            aria-expanded={mostrarAvisos} onClick={() => setMostrarAvisos((valor) => !valor)}>
            <Bell size={20} />
          </button>
        </header>
        {mostrarAvisos && <div role="status" style={{ padding: 16 }}>
          {avisos.length ? avisos.map((aviso, indice) => <p key={indice}>{aviso}</p>) : <p>Sem novos pedidos nesta sessão.</p>}
        </div>}

        <div className={estilos.filtros}>
          {FILTROS.map(f => (
            <button
              key={f.valor}
              className={`${estilos.filtroTag} ${filtro === f.valor ? estilos.filtroAtivo : ''}`}
              onClick={() => { setPagina(0); setFiltro(f.valor); }}
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
        {totalPaginas > 1 && <nav aria-label="Páginas de pedidos" style={{ display: 'flex', gap: 12, justifyContent: 'center', padding: 16 }}>
          <Botao variante="secundario" disabled={pagina === 0 || carregando} onClick={() => setPagina((p) => p - 1)}>Anterior</Botao>
          <span>Página {pagina + 1} de {totalPaginas}</span>
          <Botao variante="secundario" disabled={pagina + 1 >= totalPaginas || carregando} onClick={() => setPagina((p) => p + 1)}>Próxima</Botao>
        </nav>}
      </div>
    </LayoutPagina>
  );
};

export default PaginaListaPedidos;
