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

  if (onClick) return <button type="button" className={classes} onClick={onClick}
    data-testid={(props as Record<string, unknown>)['data-testid'] as string | undefined} style={{ textAlign: 'left', color: 'inherit', width: '100%' }}>{children}</button>;
  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Cartao;
