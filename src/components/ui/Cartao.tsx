import React, { HTMLAttributes, ReactNode } from 'react';
import estilos from './Cartao.module.css';

export interface PropsCartao extends Omit<HTMLAttributes<HTMLDivElement>, 'onClick'> {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  destaque?: boolean;
}

const Cartao = ({ children, className = '', onClick, destaque = false, ...props }: PropsCartao) => {
  const classes = [
    estilos.cartao,
    onClick ? estilos.clicavel : '',
    destaque ? estilos.destaque : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} onClick={onClick} {...props}>
      {children}
    </div>
  );
};

export default Cartao;
