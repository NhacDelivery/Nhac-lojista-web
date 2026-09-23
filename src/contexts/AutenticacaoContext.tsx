import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { Usuario, Cargo } from '../types';
import { login, LoginResponseDTO } from '../services/api';
import { normalizarEmail } from '../validators';
import { ehApiError, tratarErroApi } from '../utils/errosApi';

interface ContextoAutenticacao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<void>;
  definirSessao: (token: string, dados: Partial<Usuario> & { id: string; nomeCompleto: string }) => void;
  sair: () => void;
}

export const AutenticacaoContext = createContext<ContextoAutenticacao | undefined>(undefined);

/**
 * Mapeia o papel do backend (CLIENTE | LOJISTA | ADMIN) para os cargos da UI.
 * Nota: o cadastro retorna CLIENTE; o usuário é promovido a LOJISTA
 * no backend quando a loja é criada (POST /lojas).
 */
function mapearCargo(papel?: string): Cargo {
  if (papel === 'LOJISTA' || papel === 'ADMIN') return 'administrador';
  return 'administrador';
}

function converterUsuarioApi(usuarioApi: LoginResponseDTO, emailFallback = ''): Usuario {
  return {
    id: usuarioApi.usuarioId,
    nomeCompleto: usuarioApi.nome,
    email: usuarioApi.email ?? emailFallback,
    telefone: '',
    cargo: mapearCargo(usuarioApi.papel),
    lojaId: '',
  };
}

export const ProvedorAutenticacao: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const usuarioSalvo = localStorage.getItem('@nhac:usuario');
    const tokenSalvo = localStorage.getItem('@nhac:token');

    if (usuarioSalvo && tokenSalvo) {
      try {
        const salvo = JSON.parse(usuarioSalvo);
        if (!salvo?.id || !salvo?.nomeCompleto) throw new Error('Sessão inválida');
        setUsuario(salvo);
      } catch {
        localStorage.removeItem('@nhac:usuario');
        localStorage.removeItem('@nhac:token');
      }
    }
    setCarregando(false);
  }, []);

  const definirSessao = (token: string, dados: Partial<Usuario> & { id: string; nomeCompleto: string }) => {
    localStorage.setItem('@nhac:token', token);
    const usuarioFormatado: Usuario = {
      id: dados.id,
      nomeCompleto: dados.nomeCompleto,
      email: dados.email ?? '',
      telefone: dados.telefone ?? '',
      cargo: dados.cargo ?? 'administrador',
      lojaId: dados.lojaId ?? '',
      fotoUrl: dados.fotoUrl,
    };
    setUsuario(usuarioFormatado);
    localStorage.setItem('@nhac:usuario', JSON.stringify(usuarioFormatado));
  };

  const entrar = async (emailBruto: string, senha: string): Promise<void> => {
    setCarregando(true);
    try {
      // E-mail padronizado: trim + lowercase antes de enviar
      const email = normalizarEmail(emailBruto);
      const resposta = await login({ email, senha });
      definirSessao(resposta.accessToken, converterUsuarioApi(resposta, email));
    } catch (erro) {
      // Repassa o ApiError original para a UI poder distinguir casos como
      // 429 (rate limit) e 400 (e-mail não verificado) dos 401 genéricos.
      if (ehApiError(erro)) {
        throw erro;
      }
      const tratado = tratarErroApi(erro);
      throw new Error(tratado.mensagemGeral || 'E-mail ou senha inválidos.');
    } finally {
      setCarregando(false);
    }
  };

  const sair = () => {
    setUsuario(null);
    localStorage.removeItem('@nhac:usuario');
    localStorage.removeItem('@nhac:token');
  };

  return (
    <AutenticacaoContext.Provider value={{ usuario, carregando, entrar, definirSessao, sair }}>
      {children}
    </AutenticacaoContext.Provider>
  );
};
