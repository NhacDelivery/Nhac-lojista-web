import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Botao from '../../components/ui/Botao';
import { Banknote, CreditCard, Smartphone, Utensils, ShoppingBag } from 'lucide-react';
import { useLoja } from '../../contexts/LojaContext';
import { atualizarLoja } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import estilos from './PaginaFormasPagamento.module.css';

/**
 * Mapeia as 6 flags do backend (FormasPagamentoDTO) para os ids usados na UI.
 * O PUT /lojas/{id} exige o payload completo, então a tela carrega os valores
 * REAIS de GET /lojas/minha-loja e devolve só `formasPagamento` alterado.
 */
type ChavePagamento = 'dinheiro' | 'credito' | 'debito' | 'pix' | 'refeicao' | 'alimentacao';

const PaginaFormasPagamento = () => {
  const navigate = useNavigate();
  const { loja, recarregar } = useLoja();
  const { mostrarToast } = useToast();

  const formas = loja?.formasPagamento;
  const [pagamentos, setPagamentos] = useState<Record<ChavePagamento, boolean>>({
    dinheiro: formas?.aceitaDinheiro ?? false,
    credito: formas?.aceitaCredito ?? false,
    debito: formas?.aceitaDebito ?? false,
    pix: formas?.aceitaPix ?? false,
    refeicao: formas?.aceitaValeRefeicao ?? false,
    alimentacao: formas?.aceitaValeAlimentacao ?? false,
  });

  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const toggle = (chave: ChavePagamento) => {
    setPagamentos(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  const handleSalvar = async () => {
    const selecionado = Object.values(pagamentos).some(v => v);
    if (!selecionado) {
      setErro('Selecione pelo menos uma forma de pagamento');
      return;
    }
    setErro('');

    if (!loja?.id) {
      setErro('Loja não carregada. Recarregue a página e tente novamente.');
      return;
    }

    setSalvando(true);
    try {
      const { id, ...lojaSemId } = loja;
      await atualizarLoja(id, {
        ...lojaSemId,
        formasPagamento: {
          aceitaDinheiro: pagamentos.dinheiro,
          aceitaCredito: pagamentos.credito,
          aceitaDebito: pagamentos.debito,
          aceitaPix: pagamentos.pix,
          aceitaValeRefeicao: pagamentos.refeicao,
          aceitaValeAlimentacao: pagamentos.alimentacao,
        },
      });
      await recarregar();
      mostrarToast('Formas de pagamento salvas!');
      navigate('/configuracoes');
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? 'Não foi possível salvar as formas de pagamento.');
    } finally {
      setSalvando(false);
    }
  };

  const opcoes = [
    { chave: 'dinheiro' as const, icone: Banknote, rotulo: 'Dinheiro' },
    { chave: 'credito' as const, icone: CreditCard, rotulo: 'Cartão de Crédito' },
    { chave: 'debito' as const, icone: CreditCard, rotulo: 'Cartão de Débito' },
    { chave: 'pix' as const, icone: Smartphone, rotulo: 'Pix' },
    { chave: 'refeicao' as const, icone: Utensils, rotulo: 'Vale-refeição' },
    { chave: 'alimentacao' as const, icone: ShoppingBag, rotulo: 'Vale-alimentação' },
  ];

  return (
    <LayoutPagina titulo="Formas de pagamento">
      <div className={estilos.container}>
        <p className={estilos.descricao}>
          Selecione as formas de pagamento que sua loja aceita.
        </p>

        {erro && <span className={estilos.erro}>{erro}</span>}

        <div className={estilos.gridPagamentos}>
          {opcoes.map(({ chave, icone: Icone, rotulo }) => (
            <button type="button" aria-pressed={pagamentos[chave]} disabled={salvando}
              key={chave}
              className={`${estilos.cartaoPagamento} ${pagamentos[chave] ? estilos.selecionado : ''}`}
              onClick={() => toggle(chave)}
            >
              <Icone size={24} className={estilos.iconePagamento} />
              <span className={estilos.rotuloPagamento}>{rotulo}</span>
              <div style={{ marginLeft: 'auto' }}>
                <span aria-hidden="true">{pagamentos[chave] ? "✓" : "+"}</span>
              </div>
            </button>
          ))}
        </div>

        <div className={estilos.acoes}>
          <Botao variante="fantasma" onClick={() => navigate('/configuracoes')}>
            Cancelar
          </Botao>
          <Botao variante="primario" carregando={salvando} onClick={handleSalvar}>
            Salvar
          </Botao>
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaFormasPagamento;
