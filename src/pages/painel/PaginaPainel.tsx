import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Botao from '../../components/ui/Botao';
import Emblema from '../../components/ui/Emblema';
import Toggle from '../../components/ui/Toggle';
import { buscarPainel, atualizarAberturaLoja, PainelResumoDTO } from '../../services/api';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useLoja } from '../../contexts/LojaContext';
import { useToast } from '../../contexts/ToastContext';
import { tratarErroApi } from '../../utils/errosApi';
import { formatarMoeda, formatarHora, STATUS_PEDIDO_INFO } from '../../utils/formatacao';
import { DollarSign, ShoppingBag, ChevronRight, Clock, Star, ChefHat, Bike, CheckCircle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import estilos from './PaginaPainel.module.css';

const PaginaPainel = () => {
  const navigate = useNavigate();
  const { usuario } = useAutenticacao();
  const { loja, carregando: carregandoLoja, recarregar: recarregarLoja } = useLoja();
  const { mostrarToast } = useToast();
  const usuarioNome = usuario?.nomeCompleto?.split(' ')[0] ?? 'Lojista';

  const [painel, setPainel] = useState<PainelResumoDTO | null>(null);
  const [carregandoPainel, setCarregandoPainel] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [alterandoStatusLoja, setAlterandoStatusLoja] = useState(false);

  const carregarPainel = useCallback(async () => {
    try {
      setCarregandoPainel(true);
      setErro(null);
      const dados = await buscarPainel();
      setPainel(dados);
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? 'Não foi possível carregar o painel.');
    } finally {
      setCarregandoPainel(false);
    }
  }, []);

  useEffect(() => {
    carregarPainel();
  }, [carregarPainel]);

  const formatoDataGrafico = (dataString: string) => {
    const data = new Date(`${dataString}T00:00:00`);
    return `${data.getDate()}/${data.getMonth() + 1}`;
  };

  /**
   * Antes, esse toggle era só estado local (nunca persistia). Agora chama a
   * rota dedicada PATCH /lojas/{id}/abertura — não precisa reenviar a loja
   * inteira (diferente do PUT, que exige o payload completo e poderia
   * sobrescrever dados se o contexto estivesse desatualizado).
   */
  const handleAlternarLojaAberta = async (novoValor: boolean) => {
    if (!loja) return;
    setAlterandoStatusLoja(true);
    try {
      await atualizarAberturaLoja(loja.id, novoValor);
      await recarregarLoja();
      await carregarPainel();
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Não foi possível atualizar o status da loja.');
    } finally {
      setAlterandoStatusLoja(false);
    }
  };

  if (carregandoLoja || !loja || carregandoPainel) {
    return (
      <LayoutPagina titulo="Painel">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
          Carregando painel...
        </div>
      </LayoutPagina>
    );
  }

  if (erro || !painel) {
    return (
      <LayoutPagina titulo="Painel">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
          <p>{erro ?? 'Não foi possível carregar o painel.'}</p>
          <Botao variante="secundario" onClick={carregarPainel}>Tentar novamente</Botao>
        </div>
      </LayoutPagina>
    );
  }

  const lojaAberta = painel.lojaAberta;

  return (
    <LayoutPagina titulo="Painel">
      <div className={estilos.container}>
        <header className={estilos.cabecalho}>
          <div className={estilos.cabecalhoTexto}>
            <h2 className={estilos.boasVindas}>Olá, {usuarioNome}! 👋</h2>
            <p className={estilos.subtitulo}>Aqui está o resumo da sua loja hoje.</p>
          </div>
          <div className={estilos.statusLoja}>
            <span className={estilos.statusTexto}>{lojaAberta ? 'Sua loja está aberta' : 'Sua loja está fechada'}</span>
            <Toggle rotulo="" ativo={lojaAberta} aoMudar={handleAlternarLojaAberta} desabilitado={alterandoStatusLoja} />
            <div className={`${estilos.statusBolinha} ${lojaAberta ? estilos.aberta : estilos.fechada}`} />
          </div>
        </header>

        <section className={estilos.kpis}>
          <Cartao className={estilos.cartaoKpi}>
            <div className={estilos.kpiIcone} style={{ backgroundColor: 'var(--nhac-primaria-fundo)', color: 'var(--nhac-primaria)' }}>
              <DollarSign size={24} />
            </div>
            <div className={estilos.kpiInfo}>
              <span className={estilos.kpiRotulo}>Faturamento do Dia</span>
              <span className={estilos.kpiValor}>{formatarMoeda(painel.faturamentoHoje)}</span>
            </div>
          </Cartao>
          <Cartao className={estilos.cartaoKpi}>
            <div className={estilos.kpiIcone} style={{ backgroundColor: '#E3F2FD', color: '#1976D2' }}>
              <ShoppingBag size={24} />
            </div>
            <div className={estilos.kpiInfo}>
              <span className={estilos.kpiRotulo}>Concluídos Hoje</span>
              <span className={estilos.kpiValor}>{painel.pedidosConcluidosHoje}</span>
            </div>
          </Cartao>
          <Cartao className={estilos.cartaoKpi}>
            <div className={estilos.kpiIcone} style={{ backgroundColor: '#FFF8E1', color: '#FBC02D' }}>
              <Star size={24} />
            </div>
            <div className={estilos.kpiInfo}>
              <span className={estilos.kpiRotulo}>Avaliação da Loja</span>
              <div className={estilos.avaliacaoValor}>
                <span className={estilos.kpiValor}>—</span>
                <span className={estilos.avaliacaoEstrelas}>⭐</span>
              </div>
              <span className={estilos.avaliacaoTotal}>(avaliações em breve)</span>
            </div>
          </Cartao>
        </section>

        <section className={estilos.statusPedidosGrid}>
          <Cartao className={`${estilos.cartaoStatus} ${estilos.statusAmarelo}`}>
            <ChefHat size={28} className={estilos.iconeStatus} />
            <div className={estilos.infoStatus}>
              <span className={estilos.valorStatus}>{painel.pedidosEmPreparo}</span>
              <span className={estilos.rotuloStatus}>Em preparo</span>
            </div>
          </Cartao>
          <Cartao className={`${estilos.cartaoStatus} ${estilos.statusAzul}`}>
            <Bike size={28} className={estilos.iconeStatus} />
            <div className={estilos.infoStatus}>
              <span className={estilos.valorStatus}>{painel.pedidosACaminho}</span>
              <span className={estilos.rotuloStatus}>A caminho</span>
            </div>
          </Cartao>
          <Cartao className={`${estilos.cartaoStatus} ${estilos.statusVerde}`}>
            <CheckCircle size={28} className={estilos.iconeStatus} />
            <div className={estilos.infoStatus}>
              <span className={estilos.valorStatus}>{painel.pedidosConcluidosHoje}</span>
              <span className={estilos.rotuloStatus}>Concluídos hoje</span>
            </div>
          </Cartao>
        </section>

        <div className={estilos.duasColunas}>
          <div className={estilos.colunaEsquerda}>
            <section className={estilos.graficoSecao}>
              <Cartao className={estilos.cartaoGrafico}>
                <div className={estilos.graficoHeader}>
                  <div className={estilos.graficoTitulos}>
                    <h3 className={estilos.secaoTitulo}>Faturamento (Últimos 7 dias)</h3>
                  </div>
                </div>
                <div className={estilos.areaGrafico}>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={painel.faturamentoUltimos7Dias} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nhac-borda)" />
                      <XAxis dataKey="data" tickFormatter={formatoDataGrafico} stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `R$ ${val}`} />
                      <Tooltip
                        formatter={(value: unknown) => [formatarMoeda(Number(value) || 0), 'Faturamento']}
                        labelFormatter={(label: unknown) => formatoDataGrafico(String(label || ''))}
                        contentStyle={{ borderRadius: '8px', border: '1px solid var(--nhac-borda)' }}
                      />
                      <Line type="monotone" dataKey="valor" stroke="var(--nhac-primaria)" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>
            </section>

            <section className={estilos.pedidosRecentes}>
              <div className={estilos.secaoCabecalho}>
                <h3 className={estilos.secaoTitulo}>Pedidos Recentes</h3>
                <Botao variante="fantasma" onClick={() => navigate('/pedidos')}>Ver todos</Botao>
              </div>
              <div className={estilos.listaPedidos}>
                {painel.pedidosRecentes.length === 0 && (
                  <p style={{ color: 'var(--nhac-texto-claro)', fontSize: '0.875rem' }}>Nenhum pedido ainda.</p>
                )}
                {painel.pedidosRecentes.map(pedido => (
                  <Cartao key={pedido.id} className={estilos.cartaoPedido}>
                    <div className={estilos.pedidoPrincipal}>
                      <span className={estilos.pedidoId}>#{pedido.id.slice(0, 8)}</span>
                      <span className={estilos.pedidoCliente}>{pedido.clienteNome}</span>
                    </div>
                    <div className={estilos.pedidoStatus}>
                      <Emblema variante={pedido.status === 'ENTREGUE' ? 'sucesso' : pedido.status === 'CANCELADO' ? 'erro' : 'info'}>
                        {STATUS_PEDIDO_INFO[pedido.status]?.rotulo ?? pedido.status}
                      </Emblema>
                    </div>
                    <div className={estilos.pedidoTotal}>
                      {formatarMoeda(pedido.valorTotal)}
                    </div>
                    <div className={estilos.pedidoTempo}>
                      <Clock size={14} />
                      <span>{formatarHora(pedido.criadoEm)}</span>
                    </div>
                    <Botao variante="fantasma" onClick={() => navigate(`/pedidos/${pedido.id}`)} icone={<ChevronRight size={20} />} />
                  </Cartao>
                ))}
              </div>
            </section>
          </div>

          <section className={estilos.linksRapidos}>
            <h3 className={estilos.secaoTitulo}>Ações Rápidas</h3>
            <div className={estilos.gridLinks}>
              <Botao onClick={() => navigate('/produtos/novo')} variante="secundario" larguraTotal>
                Adicionar Produto
              </Botao>
              <Botao onClick={() => navigate('/funcionarios/novo')} variante="secundario" larguraTotal>
                Adicionar Funcionário
              </Botao>
              <Botao onClick={() => navigate('/financeiro')} variante="secundario" larguraTotal>
                Ver Relatórios
              </Botao>
            </div>
          </section>
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaPainel;
