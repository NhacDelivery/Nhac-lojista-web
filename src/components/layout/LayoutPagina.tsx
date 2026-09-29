import React, { ReactNode, useState, useEffect } from 'react';
import BarraLateral from './BarraLateral';
import BarraSuperior from './BarraSuperior';
import NavegacaoMobile from './NavegacaoMobile';
import estilos from './LayoutPagina.module.css';
import { listarPedidosPagina } from '../../services/api';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useLoja } from '../../contexts/LojaContext';
import { useToast } from '../../contexts/ToastContext';

const pedidosConhecidosPorLoja = new Map<string, Set<string>>();

interface LayoutPaginaProps {
  titulo: string;
  children: ReactNode;
}

const LayoutPagina: React.FC<LayoutPaginaProps> = ({ titulo, children }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const { usuario } = useAutenticacao();
  const { loja } = useLoja();
  const { mostrarToast } = useToast();

  useEffect(() => {
    if (!usuario?.id || !loja?.id) return;
    const chave = `${usuario.id}:${loja.id}`;
    let ativo = true;
    const consultar = async () => {
      try {
        const pagina = await listarPedidosPagina({ page: 0, size: 30 });
        if (!ativo) return;
        const ids = new Set((pagina.content ?? []).map((pedido) => pedido.id));
        const anteriores = pedidosConhecidosPorLoja.get(chave);
        if (anteriores) {
          const novos = [...ids].filter((id) => !anteriores.has(id));
          if (novos.length) mostrarToast(novos.length === 1 ? 'Novo pedido recebido.' : `${novos.length} novos pedidos recebidos.`);
        }
        pedidosConhecidosPorLoja.set(chave, ids);
      } catch { /* A próxima consulta recupera a lista sem bloquear a página. */ }
    };
    void consultar();
    const intervalo = window.setInterval(() => void consultar(), 10000);
    return () => { ativo = false; window.clearInterval(intervalo); };
  }, [usuario?.id, loja?.id, mostrarToast]);

  return (
    <div className={estilos.layout}>
      <BarraLateral 
        abertaMobile={menuAberto} 
        onFechar={() => setMenuAberto(false)}
        recolhida={sidebarRecolhida}
        onToggleRecolher={() => setSidebarRecolhida(v => !v)}
      />
      
      {menuAberto && (
        <div 
          className={estilos.overlay} 
          onClick={() => setMenuAberto(false)}
        />
      )}
      
      <div className={`${estilos.conteudoPrincipal} ${sidebarRecolhida ? estilos.conteudoPrincipalRecolhido : ''}`}>
        <BarraSuperior 
          titulo={titulo} 
          onAbrirMenu={() => {
            setMenuAberto(true);
            setSidebarRecolhida(false);
          }} 
          recolhida={sidebarRecolhida}
        />
        
        <main className={estilos.main}>
          {children}
        </main>
      </div>

      <NavegacaoMobile />
    </div>
  );
};

export default LayoutPagina;
