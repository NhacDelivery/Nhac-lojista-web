import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLoja } from '../../contexts/LojaContext';
import Avatar from '../ui/Avatar';
import { Menu } from 'lucide-react';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import estilos from './BarraSuperior.module.css';

interface BarraSuperiorProps {
  titulo: string;
  onAbrirMenu: () => void;
  recolhida?: boolean;
}

const BarraSuperior: React.FC<BarraSuperiorProps> = ({ titulo, onAbrirMenu, recolhida }) => {
  const { usuario, sair } = useAutenticacao();
  const { loja } = useLoja();
  const [aberto, setAberto] = useState(false);
  const navigate = useNavigate();

  return (
    <header className={estilos.barraSuperior}>
      <div className={estilos.esquerda}>
        <button 
          className={`${estilos.botaoMenu} ${recolhida ? estilos.botaoMenuVisivelDesktop : ''}`} 
          onClick={onAbrirMenu}
        >
          <Menu size={24} />
        </button>
        <h2 className={estilos.titulo}>{titulo}</h2>
      </div>
      
      {usuario && (
        <div className={estilos.direita}>
          <div className={estilos.conta}>
            <button type="button" aria-label="Opções da conta" aria-expanded={aberto} onClick={() => setAberto(!aberto)} className={estilos.botaoConta}>
              <Avatar nome={loja?.nome || usuario.nomeCompleto} fotoUrl={loja?.imagemUrl} tamanho="pequeno" />
            </button>
            {aberto && <div className={estilos.menuConta} onKeyDown={(event) => { if (event.key === 'Escape') setAberto(false); }}>
              {usuario.papel !== "FUNCIONARIO" && <button onClick={() => { setAberto(false); navigate('/configuracoes'); }}>Configurações da loja</button>}
              <button onClick={() => { sair(); navigate('/login', { replace: true }); }}>Sair da conta</button>
            </div>}
          </div>
        </div>
      )}
    </header>
  );
};

export default BarraSuperior;
