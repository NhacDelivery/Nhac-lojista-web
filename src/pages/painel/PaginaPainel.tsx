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
import { ChevronRight, Clock, ChefHat, Bike, CheckCircle } from 'lucide-react';
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
  const [agora, setAgora] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setAgora(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const horaAgora = agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

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
        <header className={estilos.faixaPlaca}>
          <div className={estilos.placaTextos}>
            <h2 className={estilos.boasVindas}>Olá, {usuarioNome}!</h2>
            <p className={estilos.subtitulo}>Aqui está o resumo da sua loja hoje.</p>
            <div className={estilos.statusLoja}>
              <div className={`${estilos.statusBolinha} ${lojaAberta ? estilos.aberta : estilos.fechada}`} />
              <span className={estilos.placaEstado}>{lojaAberta ? 'ABERTO' : 'FECHADO'}</span>
              <span className={estilos.statusTexto}>{lojaAberta ? 'Sua loja está aberta' : 'Sua loja está fechada'}</span>
              <Toggle rotulo="" ativo={lojaAberta} aoMudar={handleAlternarLojaAberta} desabilitado={alterandoStatusLoja} />
            </div>
          </div>
          <div className={estilos.faixaAgora}>
            <Clock size={18} aria-hidden="true" />
            <span className={estilos.relogio}>{horaAgora}</span>
            <span className={estilos.rotuloAgora}>AGORA</span>
          </div>
        </header>

        <div className={estilos.duasColunas}>
          <div className={estilos.colunaEsquerda}>
            <section className={estilos.pedidosRecentes}>
              <div className={estilos.secaoCabecalho}>
                <h3 className={estilos.secaoTitulo}>Pedidos Recentes</h3>
                <Botao variante="fantasma" onClick={() => navigate('/pedidos')}>Ver todos</Botao>
              </div>
              <div className={estilos.quadroFila}>
                <div className={estilos.cabecalhoCampos}>
                  <span className="campoMicro">Hora</span>
                  <span className="campoMicro">Pedido</span>
                  <span className="campoMicro">Cliente</span>
                  <span className="campoMicro">Estado</span>
                  <span className="campoMicro">Total</span>
                  <span aria-hidden="true" />
                </div>
                {painel.pedidosRecentes.length === 0 && (
                  <p style={{ color: 'var(--nhac-texto-claro)', fontSize: '0.875rem', padding: '16px 20px' }}>Nenhum pedido ainda.</p>
                )}
                {painel.pedidosRecentes.map(pedido => (
                  <button
                    type="button"
                    key={pedido.id}
                    className={estilos.tarja}
                    onClick={() => navigate(`/pedidos/${pedido.id}`)}
                  >
                    <span className={estilos.tarjaHora}>{formatarHora(pedido.criadoEm)}</span>
                    <span className={`slugPedido ${estilos.tarjaSlug}`}>#{pedido.id.slice(0, 8)}</span>
                    <span className={estilos.tarjaCliente}>{pedido.clienteNome}</span>
                    <span className={estilos.tarjaEstado}>
                      <Emblema variante={pedido.status === 'ENTREGUE' ? 'sucesso' : pedido.status === 'CANCELADO' ? 'erro' : 'info'}>
                        {STATUS_PEDIDO_INFO[pedido.status]?.rotulo ?? pedido.status}
                      </Emblema>
                    </span>
                    <span className={estilos.tarjaTotal}>{formatarMoeda(pedido.valorTotal)}</span>
                    <ChevronRight size={18} className={estilos.tarjaSeta} aria-hidden="true" />
                  </button>
                ))}
              </div>
            </section>

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
          </div>

          <div className={estilos.colunaDireita}>
            <section className={estilos.etiquetasFolha} aria-label="Resumo do dia">
              <div className={estilos.etiquetaLinha}>
                <span className="campoMicro">Faturamento do Dia</span>
                <span className={estilos.etiquetaValor}>{formatarMoeda(painel.faturamentoHoje)}</span>
              </div>
              <div className={estilos.etiquetaLinha}>
                <span className="campoMicro">Concluídos Hoje</span>
                <span className={estilos.etiquetaValor}>{painel.pedidosConcluidosHoje}</span>
              </div>
              <div className={estilos.etiquetaLinha}>
                <span className="campoMicro">Avaliação da Loja</span>
                <span className={estilos.etiquetaBloco}>
                  <span className={estilos.etiquetaValor}>—</span>
                  <span className={estilos.etiquetaNota}>(avaliações em breve)</span>
                </span>
              </div>
              <div className={estilos.contagensPlacar}>
                <div className={estilos.placarItem}>
                  <ChefHat size={20} className={estilos.statusAmarelo} />
                  <span className={estilos.placarValor}>{painel.pedidosEmPreparo}</span>
                  <span className="campoMicro">Em preparo</span>
                </div>
                <div className={estilos.placarItem}>
                  <Bike size={20} className={estilos.statusAzul} />
                  <span className={estilos.placarValor}>{painel.pedidosACaminho}</span>
                  <span className="campoMicro">A caminho</span>
                </div>
                <div className={estilos.placarItem}>
                  <CheckCircle size={20} className={estilos.statusVerde} />
                  <span className={estilos.placarValor}>{painel.pedidosConcluidosHoje}</span>
                  <span className="campoMicro">Concluídos hoje</span>
                </div>
              </div>
            </section>

            <section className={estilos.linksRapidos}>
              <h3 className="campoMicro">Ações Rápidas</h3>
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
      </div>
    </LayoutPagina>
  );
};

export default PaginaPainel;
