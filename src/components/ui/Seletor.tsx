import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import estilos from './Seletor.module.css';

export interface OpcaoSeletor {
  valor: string;
  rotulo: string;
}

export interface PropsSeletor {
  rotulo: string;
  opcoes: OpcaoSeletor[];
  valor: string;
  aoMudar: (valor: string) => void;
  placeholder?: string;
  erro?: string;
  obrigatorio?: boolean;
  desabilitado?: boolean;
}

const Seletor = ({
  rotulo,
  opcoes,
  valor,
  aoMudar,
  placeholder = 'Selecione...',
  erro,
  obrigatorio = false,
  desabilitado = false
}: PropsSeletor) => {
  const id = React.useId();
  const [focado, setFocado] = useState(false);
  const temValor = valor !== undefined && valor !== null && valor !== '';

  return (
    <div className={`${estilos.container} ${desabilitado ? estilos.desabilitado : ''}`}>
      <div className={`${estilos.seletorWrapper} ${focado ? estilos.focado : ''} ${erro ? estilos.comErro : ''}`}>
        <div className={estilos.campo}>
          {rotulo && (
            <label htmlFor={id} className={`${estilos.rotulo} ${(focado || temValor) ? estilos.rotuloFlutuante : ''}`}>
              {rotulo} {obrigatorio && <span className={estilos.asterisco}>*</span>}
            </label>
          )}

          <select id={id} aria-invalid={!!erro} aria-describedby={erro ? `${id}-erro` : undefined}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            disabled={desabilitado}
            className={`${estilos.select} ${!temValor ? estilos.vazio : ''} ${!rotulo ? estilos.semRotulo : ''}`}
          >
            <option value="" disabled hidden>{placeholder}</option>
            {opcoes.map((opcao) => (
              <option key={opcao.valor} value={opcao.valor}>
                {opcao.rotulo}
              </option>
            ))}
          </select>
        </div>
        <ChevronDown className={estilos.iconeSeta} size={20} />
      </div>

      {erro && <span id={`${id}-erro`} className={estilos.mensagemErro}>{erro}</span>}
    </div>
  );
};

export default Seletor;
