import React, { InputHTMLAttributes, ReactNode, useState } from 'react';
import estilos from './InputTexto.module.css';

export interface PropsInputTexto extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  rotulo: string;
  tipo?: string;
  valor: string;
  aoMudar: (valor: string) => void;
  icone?: ReactNode;
  sufixo?: ReactNode;
  erro?: string;
  obrigatorio?: boolean;
  mascara?: (valor: string) => string;
}

const InputTexto = ({
  rotulo,
  valor,
  aoMudar,
  icone,
  sufixo,
  erro,
  obrigatorio = false,
  disabled = false,
  mascara,
  tipo,
  type = 'text',
  placeholder,
  ...props
}: PropsInputTexto) => {
  const [visivel, setVisivel] = useState(false);
  const tipoBase = tipo || type;
  const tipoFinal = tipoBase === 'password' && visivel ? 'text' : tipoBase;
  const gerado = React.useId();
  const id = props.id || gerado;
  const [focado, setFocado] = useState(false);
  const temValor = valor !== undefined && valor !== null && valor !== '';

  const lidarComMudanca = (e: React.ChangeEvent<HTMLInputElement>) => {
    let novoValor = e.target.value;
    if (mascara) {
      novoValor = mascara(novoValor);
    }
    aoMudar(novoValor);
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={`${estilos.container} ${disabled ? estilos.desabilitado : ''}`}>
      <div
        className={`${estilos.inputWrapper} ${focado ? estilos.focado : ''} ${erro ? estilos.comErro : ''}`}

      >
        {icone && <div className={estilos.icone}>{icone}</div>}

        <div className={estilos.campo}>
          {rotulo && (
            <label htmlFor={id} className={`${estilos.rotulo} ${(focado || temValor || placeholder) ? estilos.rotuloFlutuante : ''}`}>
              {rotulo} {obrigatorio && <span className={estilos.asterisco}>*</span>}
            </label>
          )}

          <input
            ref={inputRef}
            id={id}
            aria-label={!rotulo ? (props['aria-label'] || placeholder) : undefined}
            aria-invalid={!!erro}
            aria-describedby={erro ? `${id}-erro` : props['aria-describedby']}
            required={obrigatorio}
            type={tipoFinal}
            value={valor}
            onChange={lidarComMudanca}
            onFocus={e => { setFocado(true); props.onFocus?.(e); }}
            onBlur={e => { setFocado(false); props.onBlur?.(e); }}
            disabled={disabled}
            placeholder={rotulo ? (focado ? placeholder : undefined) : placeholder}
            className={`${estilos.input} ${!rotulo ? estilos.semRotulo : ''}`}
            {...props}
          />
        </div>

        {tipoBase === 'password' && !sufixo && <button type="button" aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'} aria-pressed={visivel} onClick={() => setVisivel(v => !v)}>{visivel ? 'Ocultar' : 'Mostrar'}</button>}
        {tipoBase === 'search' && valor && <button type="button" aria-label="Limpar busca" onClick={() => { aoMudar(''); inputRef.current?.focus(); }}>×</button>}
        {/* Adorno à direita: fica dentro da pílula, alinhado ao centro do campo */}
        {sufixo && (
          <div className={estilos.sufixo} onMouseDown={(e) => e.preventDefault()}>
            {sufixo}
          </div>
        )}
      </div>

      {erro && <span id={`${id}-erro`} role="alert" className={estilos.mensagemErro}>{erro}</span>}
    </div>
  );
};

export default InputTexto;
