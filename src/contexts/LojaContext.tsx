import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
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

  // Guarda qual foi a chamada mais recente de recarregar(). O próprio
  // useEffect logo abaixo dispara automaticamente sempre que `usuario`
  // muda — e durante o cadastro isso acontece bem antes da loja existir
  // de fato (definirSessao roda antes de criarLoja). Sem esse controle,
  // duas chamadas ficam "correndo" ao mesmo tempo e, se a mais antiga (o
  // 404 de antes da loja existir) responder DEPOIS da mais nova (o sucesso
  // de depois da loja criada), ela sobrescrevia o estado de volta pra
  // "sem loja" — travando a tela em "Carregando sua loja..." até um refresh.
  const requestIdRef = useRef(0);

  const recarregar = useCallback(async () => {
    if (!usuario) {
      requestIdRef.current += 1;
      setLoja(null);
      setSemLoja(false);
      setErro(null);
      return;
    }

    const idDestaChamada = ++requestIdRef.current;
    setCarregando(true);
    setErro(null);
    try {
      const dados = await buscarMinhaLoja();
      if (requestIdRef.current !== idDestaChamada) return; // resposta obsoleta, ignora

      if (dados) {
        setLoja(dados);
        setSemLoja(false);
      } else {
        setLoja(null);
        setSemLoja(true);
      }
    } catch (err) {
      if (requestIdRef.current !== idDestaChamada) return; // resposta obsoleta, ignora

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
      if (requestIdRef.current === idDestaChamada) setCarregando(false);
    }
  }, [usuario, mostrarToast]);

  useEffect(() => {
    recarregar();
  }, [recarregar]);

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
