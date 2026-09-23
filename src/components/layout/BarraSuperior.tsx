import React from 'react';
import { Menu } from 'lucide-react';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import estilos from './BarraSuperior.module.css';

interface BarraSuperiorProps {
  titulo: string;
  onAbrirMenu: () => void;
  recolhida?: boolean;
}

const BarraSuperior: React.FC<BarraSuperiorProps> = ({ titulo, onAbrirMenu, recolhida }) => {
  const { usuario } = useAutenticacao();

  return (
    <header className={estilos.barraSuperior}>
      <div className={estilos.esquerda}>
        <button aria-label="Abrir menu"
          className={`${estilos.botaoMenu} ${recolhida ? estilos.botaoMenuVisivelDesktop : ''}`}
          onClick={onAbrirMenu}
        >
          <Menu size={24} />
        </button>
        <h2 className={estilos.titulo}>{titulo}</h2>
      </div>

      {usuario && (
        <div className={estilos.direita}>
          <div className={estilos.avatar}>
            {usuario.nomeCompleto.charAt(0).toUpperCase()}
          </div>
        </div>
      )}
    </header>
  );
};

export default BarraSuperior;
