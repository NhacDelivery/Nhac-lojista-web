import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Cartao from '../../components/ui/Cartao';
import Avatar from '../../components/ui/Avatar';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import { useLoja } from '../../contexts/LojaContext';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { Store, CreditCard, MapPin, Settings, LogOut, ChevronRight } from 'lucide-react';
import estilos from './PaginaInformacaoLoja.module.css';

interface ItemAtalho {
  icone: React.ElementType;
  rotulo: string;
  caminho?: string;
}

const ITENS_LOJA: ItemAtalho[] = [
  { icone: Store, rotulo: 'Nome, categoria e descrição', caminho: '/configuracoes/editar' },
  { icone: Store, rotulo: 'Horários e entrega', caminho: '/configuracoes/operacao' },
  { icone: CreditCard, rotulo: 'Formas de pagamento', caminho: '/configuracoes/pagamentos' },
  { icone: MapPin, rotulo: 'Endereço da loja', caminho: '/configuracoes/endereco' },
  { icone: Settings, rotulo: 'Configurações da conta', caminho: '/configuracoes/conta' },
];

const PaginaInformacaoLoja = () => {
  const navigate = useNavigate();
  const { sair } = useAutenticacao();
  // Dados reais: GET /lojas/minha-loja (via LojaContext). RotaExigeLoja já
  // garante que a loja está carregada antes de renderizar esta página.
  const { loja } = useLoja();
  const [modalSairAberto, setModalSairAberto] = useState(false);

  const nomeLoja = loja?.nome ?? '';
  const categoriaLoja = loja?.categoria ?? '';
  const imagemLoja = loja?.imagemUrl ?? '';

  return (
    <LayoutPagina titulo="Informações da loja">
      <div className={estilos.container}>
        <div className={estilos.perfil}>
          <Avatar nome={nomeLoja} fotoUrl={imagemLoja} tamanho="grande" />
          <h2 className={estilos.nomeLoja}>{nomeLoja}</h2>
          <p className={estilos.categoriaLoja}>
            {categoriaLoja ? `Cozinha · ${categoriaLoja}` : 'Categoria não informada'}
          </p>
        </div>

        <Cartao className={estilos.cartaoLista}>
          {ITENS_LOJA.map((item, idx) => {
            const Icone = item.icone;
            return (
              <React.Fragment key={item.rotulo}>
                <button
                  className={estilos.itemLista}
                  onClick={() => item.caminho && navigate(item.caminho)}
                >
                  <Icone size={20} className={estilos.iconeItem} />
                  <span className={estilos.rotuloItem}>{item.rotulo}</span>
                  <ChevronRight size={18} className={estilos.setaItem} />
                </button>
                {idx < ITENS_LOJA.length - 1 && <div className={estilos.divisor} />}
              </React.Fragment>
            );
          })}
        </Cartao>

        <Cartao className={estilos.cartaoLista}>
          <button className={`${estilos.itemLista} ${estilos.itemSair}`} onClick={() => setModalSairAberto(true)}>
            <LogOut size={20} className={estilos.iconeItemSair} />
            <span className={estilos.rotuloItem}>Sair da conta</span>
            <ChevronRight size={18} className={estilos.setaItem} />
          </button>
        </Cartao>
      </div>

      <ModalConfirmacao
        aberto={modalSairAberto}
        titulo="Sair da conta"
        mensagem="Tem certeza que deseja sair? Você precisará fazer login novamente para acessar o painel."
        textoBotaoConfirmar="Sair"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={sair}
        aoCancelar={() => setModalSairAberto(false)}
      />
    </LayoutPagina>
  );
};

export default PaginaInformacaoLoja;
