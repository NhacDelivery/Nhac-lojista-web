import React, { ReactNode, ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';
import estilos from './Botao.module.css';

export interface PropsBotao extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: 'primario' | 'secundario' | 'fantasma' | 'perigo';
  tamanho?: 'pequeno' | 'medio' | 'grande';
  larguraTotal?: boolean;
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: ReactNode;
}

const Botao = ({
  variante = 'primario',
  tamanho = 'medio',
  larguraTotal = false,
  carregando = false,
  desabilitado = false,
  icone,
  children,
  className = '',
  disabled,
  ...props
}: PropsBotao) => {
  const classes = [
    estilos.botao,
    estilos[variante],
    estilos[tamanho],
    larguraTotal ? estilos.larguraTotal : '',
    className
  ].filter(Boolean).join(' ');

  const estaDesabilitado = desabilitado || disabled || carregando;

  return (
    <button type="button" aria-busy={carregando} className={classes} disabled={estaDesabilitado} {...props}>
      {carregando ? (
        <Loader2 className={estilos.iconeCarregando} size={20} />
      ) : (
        icone && <span className={estilos.icone}>{icone}</span>
      )}
      <span className={estilos.conteudo}>{children}</span>
    </button>
  );
};

export default Botao;
