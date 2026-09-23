import React from 'react';
import estilos from './Toggle.module.css';

export interface PropsToggle {
  ativo: boolean;
  aoMudar: (ativo: boolean) => void;
  rotulo?: string;
  desabilitado?: boolean;
}

const Toggle = ({ ativo, aoMudar, rotulo, desabilitado = false }: PropsToggle) => {
  return (
    <span className={`${estilos.container} ${desabilitado ? estilos.desabilitado : ''}`}>
      <button type="button" disabled={desabilitado} aria-label={rotulo || "Ativar"}
        className={`${estilos.trilho} ${ativo ? estilos.ativo : ''}`}
        onClick={() => !desabilitado && aoMudar(!ativo)}
        role="switch"
        aria-checked={ativo}

      >
        <div className={`${estilos.botao} ${ativo ? estilos.botaoAtivo : ''}`} />
      </button>
      {rotulo && <span className={estilos.rotulo}>{rotulo}</span>}
    </span>
  );
};

export default Toggle;
