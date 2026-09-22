import React, { HTMLAttributes, ReactNode } from 'react';
import estilos from './Emblema.module.css';

export interface PropsEmblema extends HTMLAttributes<HTMLSpanElement> {
  variante?: 'sucesso' | 'erro' | 'aviso' | 'info' | 'neutro';
  children: ReactNode;
  className?: string;
}

const Emblema = ({ variante = 'neutro', children, className = '', ...props }: PropsEmblema) => {
  return (
    <span className={`${estilos.emblema} ${estilos[variante]} ${className}`} {...props}>
      {children}
    </span>
  );
};

export default Emblema;
