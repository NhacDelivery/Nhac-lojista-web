import React, { useState, useEffect } from 'react';
import estilos from './Avatar.module.css';

export interface PropsAvatar {
  nome: string;
  fotoUrl?: string;
  tamanho?: 'pequeno' | 'medio' | 'grande';
  className?: string;
  tipo?: 'foto' | 'logo';
}

const Avatar = ({ nome, fotoUrl, tamanho = 'medio', className = '', tipo = 'foto' }: PropsAvatar) => {
  const [erroImagem, setErroImagem] = useState(false);

  useEffect(() => setErroImagem(false), [fotoUrl]);

  const obterIniciais = (nome: string) => {
    if (!nome) return '';
    const partes = nome.trim().split(/\s+/);
    if (partes.length === 1) return partes[0].substring(0, 2).toUpperCase();
    return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
  };

  const mostrarIniciais = !fotoUrl || erroImagem;

  return (
    <div className={`${estilos.avatar} ${estilos[tamanho]} ${tipo === 'logo' ? estilos.logo : ''} ${className}`}>
      {mostrarIniciais ? (
        <span className={estilos.iniciais}>{obterIniciais(nome)}</span>
      ) : (
        <img 
          src={fotoUrl} 
          alt={`${tipo === 'logo' ? 'Logo' : 'Avatar'} de ${nome}`} 
          className={estilos.imagem}
          onError={() => setErroImagem(true)}
        />
      )}
    </div>
  );
};

export default Avatar;
