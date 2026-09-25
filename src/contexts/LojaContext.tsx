import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { buscarMinhaLoja, LojaResponseDTO } from '../services/api';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { ehApiError, tratarErroApi } from '../utils/errosApi';
import { useToast } from './ToastContext';

interface LojaContextType {
  loja: LojaResponseDTO | null;
  semLoja: boolean;
  carregando: boolean;
  erro: string | null;
  recarregar: () => Promise<void>;
}

const LojaContext = createContext<LojaContextType | undefined>(undefined);

export const ProvedorLoja: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { usuario } = useAutenticacao();
  const { mostrarToast } = useToast();
  const [loja, setLoja] = useState<LojaResponseDTO | null>(null);
  const [semLoja, setSemLoja] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const recarregar = useCallback(async () => {
    // A sessão pode ter sido criada nesta mesma ação de cadastro, antes do
    // próximo render do contexto. O cliente HTTP usa este mesmo token.
    if (!localStorage.getItem('@nhac:token')) {
      setLoja(null);
      setSemLoja(false);
      setErro(null);
      return;
    }

    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarMinhaLoja();
      if (dados) {
        setLoja(dados);
        setSemLoja(false);
      } else {
        setLoja(null);
        setSemLoja(true);
      }
    } catch (err) {
      // 404 em /lojas/minha-loja = usuário NÃO tem loja (state inicial,
      // logo após o cadastro). Nunca é erro fatal — para o onboarding.
      if (ehApiError(err) && err.status === 404) {
        setLoja(null);
        setSemLoja(true);
        setErro(null);
        return;
      }

      const tratado = tratarErroApi(err);
      if (tratado.lojaNaoEncontrada) {
        setLoja(null);
        setSemLoja(true);
      } else if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
        setErro(tratado.mensagemGeral ?? null);
      } else {
        setErro(tratado.mensagemGeral ?? 'Erro ao carregar loja.');
      }
    } finally {
      setCarregando(false);
    }
  }, [mostrarToast]);

  useEffect(() => {
    recarregar();
  }, [usuario, recarregar]);

  return (
    <LojaContext.Provider value={{ loja, semLoja, carregando, erro, recarregar }}>
      {children}
    </LojaContext.Provider>
  );
};

export function useLoja(): LojaContextType {
  const ctx = useContext(LojaContext);
  if (!ctx) {
    throw new Error('useLoja deve ser usado dentro de ProvedorLoja');
  }
  return ctx;
}
