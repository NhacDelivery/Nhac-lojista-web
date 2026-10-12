import React, { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { Cargo } from "../../types";

interface PropsRotaProtegida {
  children: ReactNode;
  cargosPermitidos?: Cargo[];
  somenteDono?: boolean;
}

const RotaProtegida: React.FC<PropsRotaProtegida> = ({
  children,
  cargosPermitidos,
  somenteDono = false,
}) => {
  const { usuario, carregando } = useAutenticacao();

  if (carregando) {
    return <div>Carregando...</div>;
  }

  if (!usuario) {
    return <Navigate to="/login" replace />;
  }

  if (
    (somenteDono && !["LOJISTA", "ADMIN"].includes(usuario.papel ?? "")) ||
    (cargosPermitidos && !cargosPermitidos.includes(usuario.cargo))
  ) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "var(--nhac-texto)",
        }}
      >
        <h2>Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    );
  }

  return <>{children}</>;
};

export default RotaProtegida;
