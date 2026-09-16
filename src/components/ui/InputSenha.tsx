import React, { useRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import estilos from './InputSenha.module.css';

export interface PropsInputSenha {
  rotulo: string;
  valor: string;
  aoMudar: (valor: string) => void;
  erro?: string;
  obrigatorio?: boolean;
  placeholder?: string;
  /** Quando true, a senha é exibida em texto puro. */
  mostrarAgora?: boolean;
  onAlternarVisualizacao?: () => void;
  icone?: React.ReactNode;
  disabled?: boolean;
  onBlur?: React.FocusEventHandler<HTMLInputElement>;
}

const InputSenha: React.FC<PropsInputSenha> = ({
  rotulo,
  valor,
  aoMudar,
  erro,
  obrigatorio = false,
  placeholder,
  mostrarAgora = false,
  onAlternarVisualizacao,
  icone,
  disabled = false,
  onBlur,
}) => {
  const [focado, setFocado] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const temValor = valor !== undefined && valor !== null && valor !== '';
  const comAlternancia = Boolean(onAlternarVisualizacao);

  return (
    <div className={`${estilos.container} ${disabled ? estilos.desabilitado : ''}`}>
      <div
        className={`${estilos.inputWrapper} ${focado ? estilos.focado : ''} ${erro ? estilos.comErro : ''}`}
        onClick={() => inputRef.current?.focus()}
      >
        {icone && <div className={estilos.icone}>{icone}</div>}

        <div className={estilos.campo}>
          {rotulo && (
            <label
              className={`${estilos.rotulo} ${(focado || temValor || placeholder) ? estilos.rotuloFlutuante : ''}`}
            >
              {rotulo} {obrigatorio && <span className={estilos.asterisco}>*</span>}
            </label>
          )}
          <input
            ref={inputRef}
            type={mostrarAgora ? 'text' : 'password'}
            value={valor}
            onChange={(e) => aoMudar(e.target.value)}
            onFocus={() => setFocado(true)}
            onBlur={(e) => {
              setFocado(false);
              onBlur?.(e);
            }}
            placeholder={rotulo ? (focado ? placeholder : undefined) : placeholder}
            disabled={disabled}
            className={`${estilos.input} ${comAlternancia ? estilos.comAcao : ''} ${!rotulo ? estilos.semRotulo : ''}`}
            autoComplete={rotulo.toLowerCase().includes('senha') ? 'new-password' : 'current-password'}
          />
        </div>

        {comAlternancia && (
          <button
            type="button"
            className={estilos.botaoOlho}
            onClick={onAlternarVisualizacao}
            aria-label={mostrarAgora ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={mostrarAgora}
            disabled={disabled}
          >
            {mostrarAgora ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        )}
      </div>
      {erro && <span className={estilos.mensagemErro}>{erro}</span>}
    </div>
  );
};

export default InputSenha;
