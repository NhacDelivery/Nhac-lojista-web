import React from "react";
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  MessageCircle,
  Users,
  BarChart3,
  ClipboardList,
} from "lucide-react";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { Cargo } from "../../types";
import estilos from "./NavegacaoMobile.module.css";

interface NavItem {
  rotulo: string;
  caminho: string;
  icone: React.ElementType;
  cargos: Cargo[];
}

const itensNavegacao: NavItem[] = [
  {
    rotulo: "Painel",
    caminho: "/",
    icone: LayoutDashboard,
    cargos: ["administrador", "gerente"],
  },
  {
    rotulo: "Pedidos",
    caminho: "/pedidos",
    icone: ClipboardList,
    cargos: ["administrador", "gerente", "atendente"],
  },
  {
    rotulo: "Produtos",
    caminho: "/produtos",
    icone: Package,
    cargos: ["administrador", "gerente"],
  },
  {
    rotulo: "Chat",
    caminho: "/chat",
    icone: MessageCircle,
    cargos: ["administrador", "gerente", "atendente"],
  },
  {
    rotulo: "Equipe",
    caminho: "/funcionarios",
    icone: Users,
    cargos: ["administrador"],
  },
  {
    rotulo: "Caixa",
    caminho: "/financeiro",
    icone: BarChart3,
    cargos: ["administrador"],
  },
];

const NavegacaoMobile: React.FC = () => {
  const { usuario } = useAutenticacao();

  if (!usuario) return null;

  const itensFiltrados = itensNavegacao.filter(
    (item) =>
      item.cargos.includes(usuario.cargo) &&
      !(usuario.papel === "FUNCIONARIO" && item.caminho === "/funcionarios"),
  );

  return (
    <nav className={estilos.navegacaoMobile}>
      {itensFiltrados.map((item) => {
        const Icone = item.icone;
        return (
          <NavLink
            key={item.caminho}
            to={item.caminho}
            className={({ isActive }) =>
              `${estilos.link} ${isActive ? estilos.ativo : ""}`
            }
          >
            <Icone size={24} />
            <span className={estilos.rotulo}>{item.rotulo}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};

export default NavegacaoMobile;
