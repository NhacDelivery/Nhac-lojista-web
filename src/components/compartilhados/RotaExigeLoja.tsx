import React, { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useLoja } from '../../contexts/LojaContext';

interface PropsRotaExigeLoja {
  children: ReactNode;
}

/**
 * Bloqueia a renderização até `GET /lojas/minha-loja` ser resolvida.
 *
 * Regra da spec (§5.2): o 404 de /minha-loja é um ESTADO VÁLIDO (usuário sem
 * loja) e leva ao onboarding, NÃO para o login. Um lojista com loja (200) segue
 * para o painel. Importante: só redirecionamos quando o contexto JÁ confirmou a
 * ausência (`semLoja`); enquanto a requisição não resolveu (`loja === null` e
 * `semLoja === false`) mostramos skeleton — assim evitamos expulsar o lojista
 * para o onboarding entre o login e a resposta do backend.
 */
const RotaExigeLoja: React.FC<PropsRotaExigeLoja> = ({ children }) => {
  const { carregando, semLoja, loja, erro, recarregar } = useLoja();

  if (carregando) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
        Carregando sua loja...
      </div>
    );
  }

  // 404 confirmado = usuário autenticado ainda não criou loja → onboarding.
  if (semLoja) {
    return <Navigate to="/onboarding-loja" replace />;
  }

  // Ainda não resolvido (ex.: logo após o login) ou erro não-fatal: nunca
  // renderizar o painel sem loja (evita TypeError de `loja.nome` etc.).
  if (!loja) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
        {erro ?? 'Carregando sua loja...'}
        {erro && <button type="button" onClick={() => recarregar()}>Tentar novamente</button>}
      </div>
    );
  }

  return <>{children}</>;
};

export default RotaExigeLoja;
