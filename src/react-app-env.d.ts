/// <reference types="react-scripts" />

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// Os estilos globais são carregados pelo bundler, sem exportações.
declare module '*.css';
