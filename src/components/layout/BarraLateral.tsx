import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  MessageCircle, 
  Users, 
  BarChart3, 
  ClipboardList,
  Settings,
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { Cargo } from '../../types';
import estilos from './BarraLateral.module.css';

interface NavItem {
  rotulo: string;
  caminho: string;
  icone: React.ElementType;
  cargos: Cargo[];
}

const itensNavegacao: NavItem[] = [
  { rotulo: 'Painel', caminho: '/', icone: LayoutDashboard, cargos: ['administrador', 'gerente'] },
  { rotulo: 'Pedidos', caminho: '/pedidos', icone: ClipboardList, cargos: ['administrador', 'gerente', 'atendente'] },
  { rotulo: 'Produtos', caminho: '/produtos', icone: Package, cargos: ['administrador', 'gerente'] },
  { rotulo: 'Chat', caminho: '/chat', icone: MessageCircle, cargos: ['administrador', 'gerente', 'atendente'] },
  { rotulo: 'Funcionários', caminho: '/funcionarios', icone: Users, cargos: ['administrador'] },
  { rotulo: 'Financeiro', caminho: '/financeiro', icone: BarChart3, cargos: ['administrador'] },
  { rotulo: 'Configurações', caminho: '/configuracoes', icone: Settings, cargos: ['administrador'] },
];

interface BarraLateralProps {
  abertaMobile?: boolean;
  onFechar?: () => void;
  recolhida?: boolean;
  onToggleRecolher?: () => void;
}

const BarraLateral: React.FC<BarraLateralProps> = ({ 
  abertaMobile = false, 
  onFechar,
  recolhida = false,
  onToggleRecolher
}) => {
  const { usuario, trocarCargo } = useAutenticacao();

  if (!usuario) return null;

  const itensFiltrados = itensNavegacao.filter(item => item.cargos.includes(usuario.cargo));

  return (
    <aside className={`${estilos.barraLateral} ${abertaMobile ? estilos.aberta : ''} ${recolhida ? estilos.recolhida : ''}`}>
      <div className={estilos.cabecalho}>
        <h1 className={estilos.logo}>
          <img
            src={`${process.env.PUBLIC_URL}/nhac-logo.png`}
            alt="Nhac Lojas"
            width={132}
            height={49}
          />
        </h1>
        <div className={estilos.acoesCabecalho}>
          {/* Botão de recolher — visível apenas no desktop */}
          {onToggleRecolher && (
            <button 
              className={estilos.botaoRecolher} 
              onClick={onToggleRecolher}
              title={recolhida ? 'Expandir menu' : 'Recolher menu'}
            >
              {recolhida ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
            </button>
          )}
          {/* Botão de fechar — visível apenas no mobile quando aberto */}
          {abertaMobile && onFechar && (
            <button className={estilos.botaoFechar} onClick={onFechar}>
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className={estilos.navegacao}>
        {itensFiltrados.map((item) => {
          const Icone = item.icone;
          return (
            <NavLink 
              key={item.caminho} 
              to={item.caminho}
              className={({ isActive }) => `${estilos.link} ${isActive ? estilos.ativo : ''}`}
              onClick={() => onFechar && onFechar()}
              title={recolhida ? item.rotulo : undefined}
            >
              <Icone size={20} />
              <span className={estilos.rotuloLink}>{item.rotulo}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className={estilos.rodape}>
        <div className={estilos.perfil}>
          <div className={estilos.avatar}>
            {usuario.nomeCompleto.charAt(0).toUpperCase()}
          </div>
          <div className={estilos.infoUsuario}>
            <span className={estilos.nome}>{usuario.nomeCompleto}</span>
            <select 
              className={estilos.seletorCargo}
              value={usuario.cargo}
              onChange={(e) => trocarCargo(e.target.value as Cargo)}
            >
              <option value="administrador">Administrador</option>
              <option value="gerente">Gerente</option>
              <option value="atendente">Atendente</option>
            </select>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default BarraLateral;
