import React, { useState, useEffect, useCallback, useRef } from 'react';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Botao from '../../components/ui/Botao';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { buscarFinanceiro, FinanceiroDTO, PeriodoFinanceiro } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { formatarMoeda } from '../../utils/formatacao';
import { DollarSign, ShoppingCart, TrendingDown, Percent, Activity } from 'lucide-react';
import estilos from './PaginaFinanceiro.module.css';

const OPCOES_PERIODO: { valor: PeriodoFinanceiro; rotulo: string }[] = [
  { valor: 'HOJE', rotulo: 'Hoje' },
  { valor: 'SETE_DIAS', rotulo: '7 dias' },
  { valor: 'TRINTA_DIAS', rotulo: '30 dias' },
];

function formatarDataCurta(data: string): string {
  const d = new Date(`${data}T00:00:00`);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

const PaginaFinanceiro = () => {
  const [periodo, setPeriodo] = useState<PeriodoFinanceiro>('SETE_DIAS');
  const [dados, setDados] = useState<FinanceiroDTO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const sequencia = useRef(0);
  const CORES_PIE = ['#FF6961', '#FF8A84', '#E85D56', '#5D201C', '#8B4944', '#D4A8A5'];

  const carregar = useCallback(async () => {
    const atual = ++sequencia.current;
    try {
      setCarregando(true);
      setErro(null);
      const resposta = await buscarFinanceiro(periodo);
      if (atual !== sequencia.current) return;
      setDados(resposta);
    } catch (err) {
      if (atual !== sequencia.current) return;
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? 'Não foi possível carregar os dados financeiros.');
    } finally {
      if (atual === sequencia.current) setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    carregar();
    const contador = sequencia;
    return () => { contador.current++; };
  }, [carregar]);

  return (
    <LayoutPagina titulo="Financeiro">
      <div className={estilos.container}>
        <div className={estilos.filtros}>
          {OPCOES_PERIODO.map(p => (
            <Botao
              key={p.valor}
              variante={periodo === p.valor ? 'primario' : 'secundario'}
              onClick={() => setPeriodo(p.valor)}
            >
              {p.rotulo}
            </Botao>
          ))}
        </div>

        {carregando ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>Carregando...</p>
        ) : erro || !dados ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
            <p>{erro ?? 'Não foi possível carregar os dados financeiros.'}</p>
            <Botao variante="secundario" onClick={carregar}>Tentar novamente</Botao>
          </div>
        ) : (
          <>
            <div className={estilos.kpis}>
              <Cartao className={estilos.cartaoKpi}>
                <div className={estilos.iconeKpi} style={{ backgroundColor: 'var(--nhac-primaria-fundo)', color: 'var(--nhac-primaria)' }}><DollarSign size={24} /></div>
                <div className={estilos.infoKpi}>
                  <span>Faturamento do período</span>
                  <strong>{formatarMoeda(dados.resumo.faturamentoPeriodo)}</strong>
                </div>
              </Cartao>
              <Cartao className={estilos.cartaoKpi}>
                <div className={estilos.iconeKpi} style={{ backgroundColor: 'var(--nhac-info-fundo)', color: 'var(--nhac-info)' }}><ShoppingCart size={24} /></div>
                <div className={estilos.infoKpi}>
                  <span>Pedidos no período</span>
                  <strong>{dados.resumo.numeroPedidos}</strong>
                </div>
              </Cartao>
              <Cartao className={estilos.cartaoKpi}>
                <div className={estilos.iconeKpi} style={{ backgroundColor: 'var(--nhac-aviso-fundo)', color: 'var(--nhac-aviso)' }}><Percent size={24} /></div>
                <div className={estilos.infoKpi}>
                  <span>Ticket Médio</span>
                  <strong>{formatarMoeda(dados.resumo.ticketMedio)}</strong>
                </div>
              </Cartao>
              <Cartao className={estilos.cartaoKpi}>
                <div className={estilos.iconeKpi} style={{ backgroundColor: 'var(--nhac-sucesso-fundo)', color: 'var(--nhac-sucesso)' }}><Activity size={24} /></div>
                <div className={estilos.infoKpi}>
                  <span>Produtos mais vendidos</span>
                  <strong>{dados.produtosMaisVendidos.length}</strong>
                </div>
              </Cartao>
              <Cartao className={estilos.cartaoKpi}>
                <div className={estilos.iconeKpi} style={{ backgroundColor: 'var(--nhac-erro-fundo)', color: 'var(--nhac-erro)' }}><TrendingDown size={24} /></div>
                <div className={estilos.infoKpi}>
                  <span>Taxa Cancel.</span>
                  <strong>{dados.resumo.taxaCancelamentoPercentual}%</strong>
                </div>
              </Cartao>
            </div>

            <div className={estilos.gridGraficos}>
              <Cartao className={estilos.cartaoGrafico}>
                <h3 className={estilos.tituloGrafico}>Faturamento no período</h3>
                <div className={estilos.graficoWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={dados.faturamentoDiario}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nhac-borda)" />
                      <XAxis dataKey="data" tickFormatter={formatarDataCurta} stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `R$${v}`} />
                      <Tooltip
                        formatter={(value: unknown) => [formatarMoeda(Number(value) || 0), 'Faturamento']}
                        labelFormatter={(label: unknown) => formatarDataCurta(String(label || ''))}
                      />
                      <Line type="monotone" dataKey="valor" stroke="#FF6961" strokeWidth={3} dot={{ r: 4, fill: '#FF6961' }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>

              <Cartao className={estilos.cartaoGrafico}>
                <h3 className={estilos.tituloGrafico}>Pedidos por Dia da Semana</h3>
                <div className={estilos.graficoWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.pedidosPorDiaSemana}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nhac-borda)" />
                      <XAxis dataKey="diaSemana" stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: unknown) => [Number(value) || 0, 'Pedidos']} cursor={{ fill: 'var(--nhac-fundo)' }} />
                      <Bar dataKey="quantidade" fill="#FF6961" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>

              <Cartao className={estilos.cartaoGrafico}>
                <h3 className={estilos.tituloGrafico}>Vendas por Categoria</h3>
                <div className={estilos.graficoWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dados.vendasPorCategoria}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="valor"
                        nameKey="categoria"
                      >
                        {dados.vendasPorCategoria.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [formatarMoeda(Number(value) || 0), 'Vendas']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>

              <Cartao className={estilos.cartaoGrafico}>
                <h3 className={estilos.tituloGrafico}>Vendas por Forma de Pagamento</h3>
                <div className={estilos.graficoWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dados.vendasPorFormaPagamento}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="valor"
                        nameKey="formaPagamento"
                      >
                        {dados.vendasPorFormaPagamento.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CORES_PIE[index % CORES_PIE.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: unknown) => [formatarMoeda(Number(value) || 0), 'Vendas']} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>

              <Cartao className={estilos.cartaoGrafico}>
                <h3 className={estilos.tituloGrafico}>Pedidos por Horário</h3>
                <div className={estilos.graficoWrapper}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dados.pedidosPorHora}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--nhac-borda)" />
                      <XAxis dataKey="hora" tickFormatter={(h) => `${h}h`} stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis stroke="var(--nhac-texto-claro)" fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip formatter={(value: unknown) => [Number(value) || 0, 'Pedidos']} cursor={{ fill: 'var(--nhac-fundo)' }} labelFormatter={(h) => `${h}h`} />
                      <Bar dataKey="quantidade" fill="#FF8A84" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </Cartao>
            </div>

            <Cartao className={estilos.tabelaCartao}>
              <h3 className={estilos.tituloGrafico} style={{ padding: '24px 24px 0 24px' }}>Produtos Mais Vendidos</h3>
              <div className={estilos.responsivoTabela}>
                <table className={estilos.tabela}>
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Produto</th>
                      <th>Qtd Vendida</th>
                      <th>Faturamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dados.produtosMaisVendidos.length === 0 ? (
                      <tr><td colSpan={4}>Nenhuma venda no período.</td></tr>
                    ) : (
                      dados.produtosMaisVendidos.map((prod, idx) => (
                        <tr key={prod.produtoId}>
                          <td>#{idx + 1}</td>
                          <td className={estilos.nomeProduto}>{prod.nome}</td>
                          <td>{prod.quantidadeVendida} un</td>
                          <td className={estilos.valorProduto}>{formatarMoeda(prod.faturamento)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </Cartao>
          </>
        )}
      </div>
    </LayoutPagina>
  );
};

export default PaginaFinanceiro;
