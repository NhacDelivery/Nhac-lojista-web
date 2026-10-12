import React, { InputHTMLAttributes, ReactNode, useState, useId } from "react";
import estilos from "./InputTexto.module.css";

export interface PropsInputTexto
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
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
  type = "text",
  placeholder,
  ...props
}: PropsInputTexto) => {
  const generatedId = useId();
  const inputId = props.id || generatedId;
  const errorId = `${inputId}-erro`;
  const tipoFinal = tipo || type;
  const [focado, setFocado] = useState(false);
  const temValor = valor !== undefined && valor !== null && valor !== "";

  const lidarComMudanca = (e: React.ChangeEvent<HTMLInputElement>) => {
    let novoValor = e.target.value;
    if (mascara) {
      novoValor = mascara(novoValor);
    }
    aoMudar(novoValor);
  };

  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div
      className={`${estilos.container} ${disabled ? estilos.desabilitado : ""}`}
    >
      <div
        className={`${estilos.inputWrapper} ${focado ? estilos.focado : ""} ${erro ? estilos.comErro : ""}`}
        onClick={() => inputRef.current?.focus()}
      >
        {icone && <div className={estilos.icone}>{icone}</div>}

        <div className={estilos.campo}>
          {rotulo && (
            <label
              htmlFor={inputId}
              className={`${estilos.rotulo} ${focado || temValor || placeholder ? estilos.rotuloFlutuante : ""}`}
            >
              {rotulo}{" "}
              {obrigatorio && <span className={estilos.asterisco}>*</span>}
            </label>
          )}

          <input
            id={inputId}
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? errorId : props["aria-describedby"]}
            ref={inputRef}
            type={tipoFinal}
            value={valor}
            onChange={lidarComMudanca}
            onFocus={() => setFocado(true)}
            onBlur={() => setFocado(false)}
            disabled={disabled}
            placeholder={
              rotulo ? (focado ? placeholder : undefined) : placeholder
            }
            className={`${estilos.input} ${!rotulo ? estilos.semRotulo : ""}`}
            {...props}
          />
        </div>

        {/* Adorno à direita: fica dentro da pílula, alinhado ao centro do campo */}
        {sufixo && (
          <div
            className={estilos.sufixo}
            onMouseDown={(e) => e.preventDefault()}
          >
            {sufixo}
          </div>
        )}
      </div>

      <span id={errorId} aria-hidden={!erro} className={estilos.mensagemErro}>
        {erro || "\u00a0"}
      </span>
    </div>
  );
};

export default InputTexto;
