import { chaveConta } from '../../services/endpoints';
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

  const execucao = useRef<Promise<void>>(Promise.resolve());
  const ocupado = useRef(false);
  const [erroAtualizacao, setErroAtualizacao] = useState<string | null>(null);
  const carregarPedidos = useCallback((silencioso = false) => {
    if (silencioso && ocupado.current) return Promise.resolve();
    const requisicao = requisicaoAtual.current;
    const executar = async () => {
      if (requisicao !== requisicaoAtual.current) return;
      ocupado.current = true;
      if (!silencioso) { setCarregando(true); setErro(null); }
      try {
        const resposta = await listarPedidosPagina({ status: filtro === 'todos' ? undefined : filtro, page: pagina, size: 30 });
        if (requisicao !== requisicaoAtual.current) return;
        setPedidos(resposta.content ?? []); setTotalPaginas(resposta.totalPages); setErro(null); setErroAtualizacao(null); setCarregando(false);
        if (pagina > 0 && pagina >= resposta.totalPages) { setPagina(Math.max(0, resposta.totalPages - 1)); return; }
        setContagens(v => ({ ...v, [filtro]: resposta.totalElements }));
        for (const { valor } of FILTROS) {
          if (valor === filtro || requisicao !== requisicaoAtual.current) continue;
          try {
            const total = await listarPedidosPagina({ status: valor === 'todos' ? undefined : valor, size: 1 });
            if (requisicao === requisicaoAtual.current) setContagens(v => ({ ...v, [valor]: total.totalElements }));
          } catch { /* A lista permanece disponível quando uma contagem falha. */ }
        }
      } catch (err) {
        if (requisicao !== requisicaoAtual.current) return;
        const mensagem = err instanceof Error ? err.message : 'Erro ao carregar pedidos';
        if (silencioso) setErroAtualizacao(mensagem); else setErro(mensagem);
      } finally {
        ocupado.current = false;
        if (requisicao === requisicaoAtual.current) setCarregando(false);
      }
    };
    execucao.current = execucao.current.catch(() => {}).then(executar);
    return execucao.current;
  }, [filtro, pagina]);

  useEffect(() => {
    requisicaoAtual.current++;
    setPedidos([]); setCarregando(true);
    void carregarPedidos();
    const intervalo = window.setInterval(() => void carregarPedidos(true), 10000);
    const controle = requisicaoAtual;
    return () => { window.clearInterval(intervalo); controle.current++; };
  }, [carregarPedidos]);

  useEffect(() => {
    const atualizar = () => {
      try { setAvisos(JSON.parse(localStorage.getItem('@nhac:avisos:' + chaveConta()) || '[]')); } catch { setAvisos([]); }
    };
    atualizar(); window.addEventListener('nhac-avisos', atualizar);
    return () => window.removeEventListener('nhac-avisos', atualizar);
  }, []);

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

        {erroAtualizacao && <div role="alert">A atualização falhou. Os pedidos anteriores foram preservados. <Botao onClick={() => void carregarPedidos(true)}>Tentar novamente</Botao></div>}
        {carregando ? (
          <div className={estilos.vazio}>
            <p>Carregando pedidos...</p>
          </div>
        ) : erro ? (
          <div className={estilos.vazio}>
            <p>{erro}</p><Botao onClick={() => void carregarPedidos()}>Tentar novamente</Botao>
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
