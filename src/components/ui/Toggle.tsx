import React from "react";
import estilos from "./Toggle.module.css";

export interface PropsToggle {
  ativo: boolean;
  aoMudar: (ativo: boolean) => void;
  rotulo?: string;
  ariaLabel?: string;
  desabilitado?: boolean;
}

const Toggle = ({
  ativo,
  aoMudar,
  rotulo,
  ariaLabel,
  desabilitado = false,
}: PropsToggle) => {
  return (
    <label
      className={`${estilos.container} ${desabilitado ? estilos.desabilitado : ""}`}
    >
      <div
        className={`${estilos.trilho} ${ativo ? estilos.ativo : ""}`}
        onClick={() => !desabilitado && aoMudar(!ativo)}
        role="switch"
        aria-label={ariaLabel || rotulo}
        aria-disabled={desabilitado}
        aria-checked={ativo}
        tabIndex={desabilitado ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !desabilitado) {
            e.preventDefault();
            aoMudar(!ativo);
          }
        }}
      >
        <div
          className={`${estilos.botao} ${ativo ? estilos.botaoAtivo : ""}`}
        />
      </div>
      {rotulo && (
        <span
          className={estilos.rotulo}
          onClick={() => !desabilitado && aoMudar(!ativo)}
        >
          {rotulo}
        </span>
      )}
    </label>
  );
};

export default Toggle;
