import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Usuario } from "../types";
import { buscarUsuario, login, LoginResponseDTO } from "../services/api";
import { mapearCargo } from "../utils/cargo";
import { normalizarEmail } from "../validators";
import { ehApiError, tratarErroApi } from "../utils/errosApi";

interface ContextoAutenticacao {
  usuario: Usuario | null;
  carregando: boolean;
  entrar: (email: string, senha: string) => Promise<Usuario>;
  definirSessao: (
    token: string,
    dados: Partial<Usuario> & { id: string; nomeCompleto: string },
  ) => void;
  atualizarPerfil: (id?: string) => Promise<void>;
  sair: () => void;
}

export const AutenticacaoContext = createContext<
  ContextoAutenticacao | undefined
>(undefined);

function converterUsuarioApi(
  usuarioApi: LoginResponseDTO,
  emailFallback = "",
): Usuario {
  return {
    papel: usuarioApi.papel,
    id: usuarioApi.usuarioId,
    nomeCompleto: usuarioApi.nome,
    email: usuarioApi.email ?? emailFallback,
    telefone: "",
    cargo: mapearCargo(usuarioApi.papel, usuarioApi.cargo),
    lojaId: "",
  };
}

export const ProvedorAutenticacao: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    const usuarioSalvo = localStorage.getItem("@nhac:usuario");
    const tokenSalvo = localStorage.getItem("@nhac:token");

    const restaurar = async () => {
      try {
        if (!usuarioSalvo || !tokenSalvo) return;
        const salvo = JSON.parse(usuarioSalvo) as Usuario;
        if (!salvo.id) throw new Error("Sessão inválida.");
        const perfil = await buscarUsuario(salvo.id);
        if (!ativo || localStorage.getItem("@nhac:token") !== tokenSalvo)
          return;
        const atualizado: Usuario = {
          papel: perfil.papel,
          id: perfil.id,
          nomeCompleto: perfil.nome,
          email: perfil.email,
          telefone: perfil.telefone,
          fotoUrl: perfil.imagemUrl,
          cargo: mapearCargo(perfil.papel, perfil.cargo),
          lojaId: perfil.lojaVinculadaId ?? salvo.lojaId ?? "",
        };
        setUsuario(atualizado);
        localStorage.setItem("@nhac:usuario", JSON.stringify(atualizado));
      } catch {
        if (ativo && localStorage.getItem("@nhac:token") === tokenSalvo) {
          localStorage.removeItem("@nhac:usuario");
          localStorage.removeItem("@nhac:token");
          setUsuario(null);
        }
      } finally {
        if (ativo) setCarregando(false);
      }
    };
    void restaurar();
    return () => {
      ativo = false;
    };
  }, []);

  const definirSessao = (
    token: string,
    dados: Partial<Usuario> & { id: string; nomeCompleto: string },
  ) => {
    if (!token || !dados.id)
      throw new Error(
        "Não foi possível iniciar sua sessão. Faça login novamente.",
      );
    localStorage.setItem("@nhac:token", token);
    const usuarioFormatado: Usuario = {
      papel: dados.papel ?? usuario?.papel,
      id: dados.id,
      nomeCompleto: dados.nomeCompleto,
      email: dados.email ?? "",
      telefone: dados.telefone ?? "",
      cargo: dados.cargo ?? "atendente",
      lojaId: dados.lojaId ?? "",
      fotoUrl: dados.fotoUrl,
    };
    setUsuario(usuarioFormatado);
    localStorage.setItem("@nhac:usuario", JSON.stringify(usuarioFormatado));
  };

  const atualizarPerfil = async (id = usuario?.id) => {
    const token = localStorage.getItem("@nhac:token");
    if (!id || !token) throw new Error("Faça login para atualizar sua sessão.");
    const perfil = await buscarUsuario(id);
    // Uma resposta antiga não pode restaurar uma sessão encerrada ou trocada.
    if (localStorage.getItem("@nhac:token") !== token) return;
    definirSessao(token, {
      id: perfil.id,
      nomeCompleto: perfil.nome,
      email: perfil.email,
      telefone: perfil.telefone,
      fotoUrl: perfil.imagemUrl,
      papel: perfil.papel,
      cargo: mapearCargo(perfil.papel, perfil.cargo),
      lojaId: perfil.lojaVinculadaId ?? usuario?.lojaId ?? "",
    });
  };

  const entrar = async (
    emailBruto: string,
    senha: string,
  ): Promise<Usuario> => {
    setCarregando(true);
    try {
      // E-mail padronizado: trim + lowercase antes de enviar
      const email = normalizarEmail(emailBruto);
      const resposta = await login({ email, senha });
      const autenticado = converterUsuarioApi(resposta, email);
      definirSessao(resposta.accessToken, autenticado);
      const perfil = await buscarUsuario(autenticado.id);
      const completo = {
        ...autenticado,
        lojaId: perfil.lojaVinculadaId ?? "",
        papel: perfil.papel,
        cargo: mapearCargo(perfil.papel, perfil.cargo),
        nomeCompleto: perfil.nome,
        email: perfil.email,
        telefone: perfil.telefone,
        fotoUrl: perfil.imagemUrl,
      };
      definirSessao(resposta.accessToken, completo);
      return completo;
    } catch (erro) {
      // Repassa o ApiError original para a UI poder distinguir casos como
      // 429 (rate limit) e 400 (e-mail não verificado) dos 401 genéricos.
      if (ehApiError(erro)) {
        throw erro;
      }
      const tratado = tratarErroApi(erro);
      throw new Error(tratado.mensagemGeral || "E-mail ou senha inválidos.");
    } finally {
      setCarregando(false);
    }
  };

  const sair = () => {
    setUsuario(null);
    localStorage.removeItem("@nhac:usuario");
    localStorage.removeItem("@nhac:token");
  };

  return (
    <AutenticacaoContext.Provider
      value={{ usuario, carregando, entrar, definirSessao, atualizarPerfil, sair }}
    >
      {children}
    </AutenticacaoContext.Provider>
  );
};
