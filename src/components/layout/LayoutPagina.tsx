import { chaveConta } from "../../services/endpoints";
import React, { ReactNode, useState, useEffect } from "react";
import BarraLateral from "./BarraLateral";
import BarraSuperior from "./BarraSuperior";
import NavegacaoMobile from "./NavegacaoMobile";
import estilos from "./LayoutPagina.module.css";
import { listarPedidosPagina } from "../../services/api";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { useLoja } from "../../contexts/LojaContext";
import { useToast } from "../../contexts/ToastContext";

const pedidosConhecidosPorLoja = new Map<string, Set<string>>();

interface LayoutPaginaProps {
  titulo: string;
  children: ReactNode;
}

const LayoutPagina: React.FC<LayoutPaginaProps> = ({ titulo, children }) => {
  const [menuAberto, setMenuAberto] = useState(false);
  const [sidebarRecolhida, setSidebarRecolhida] = useState(false);
  const { usuario } = useAutenticacao();
  const { loja } = useLoja();
  const { mostrarToast } = useToast();

  useEffect(() => {
    if (!usuario?.id || !loja?.id) return;
    const chave = `${usuario.id}:${loja.id}`;
    let ativo = true;
    let consultando = false;
    const armazenamento = `@nhac:pedidos-conhecidos:${chave}`;
    try {
      const salvos = localStorage.getItem(armazenamento);
      if (salvos)
        pedidosConhecidosPorLoja.set(chave, new Set(JSON.parse(salvos)));
    } catch {
      /* Mantém os avisos em memória se o histórico local estiver inválido. */
    }
    const consultar = async () => {
      if (consultando) return;
      consultando = true;
      try {
        const pagina = await listarPedidosPagina({ page: 0, size: 30 });
        if (!ativo) return;
        const ids = new Set((pagina.content ?? []).map((pedido) => pedido.id));
        const anteriores = pedidosConhecidosPorLoja.get(chave);
        if (anteriores && ![...ids].some((id) => anteriores.has(id))) {
          for (let numero = 1; numero < pagina.totalPages; numero++) {
            const seguinte = await listarPedidosPagina({
              page: numero,
              size: 30,
            });
            if (!ativo) return;
            const encontrados = (seguinte.content ?? []).map((p) => p.id);
            encontrados.forEach((id) => ids.add(id));
            if (encontrados.some((id) => anteriores.has(id))) break;
          }
        }
        if (anteriores) {
          const novos = [...ids].filter((id) => !anteriores.has(id));
          if (novos.length) {
            const avisoKey = "@nhac:avisos:" + chaveConta();
            let historico: string[] = [];
            try {
              historico = JSON.parse(localStorage.getItem(avisoKey) || "[]");
            } catch {
              /* Mantém os avisos em memória se o histórico local estiver inválido. */
            }
            localStorage.setItem(
              avisoKey,
              JSON.stringify(
                [
                  `${novos.length} novo(s) pedido(s) recebido(s).`,
                  ...historico,
                ].slice(0, 50),
              ),
            );
            window.dispatchEvent(new Event("nhac-avisos"));
          }
          if (novos.length)
            mostrarToast(
              novos.length === 1
                ? "Novo pedido recebido."
                : `${novos.length} novos pedidos recebidos.`,
            );
        }
        const conhecidos = new Set([...(anteriores ?? []), ...ids]);
        pedidosConhecidosPorLoja.set(chave, conhecidos);
        localStorage.setItem(
          armazenamento,
          JSON.stringify([...conhecidos].slice(-10000)),
        );
      } catch {
        /* A próxima consulta recupera a lista sem bloquear a página. */
      } finally {
        consultando = false;
      }
    };
    void consultar();
    const intervalo = window.setInterval(() => void consultar(), 10000);
    return () => {
      ativo = false;
      window.clearInterval(intervalo);
    };
  }, [usuario?.id, loja?.id, mostrarToast]);

  return (
    <div className={estilos.layout}>
      <BarraLateral
        abertaMobile={menuAberto}
        onFechar={() => setMenuAberto(false)}
        recolhida={sidebarRecolhida}
        onToggleRecolher={() => setSidebarRecolhida((v) => !v)}
      />

      {menuAberto && (
        <div className={estilos.overlay} onClick={() => setMenuAberto(false)} />
      )}

      <div
        className={`${estilos.conteudoPrincipal} ${sidebarRecolhida ? estilos.conteudoPrincipalRecolhido : ""}`}
      >
        <BarraSuperior
          titulo={titulo}
          onAbrirMenu={() => {
            setMenuAberto(true);
            setSidebarRecolhida(false);
          }}
          recolhida={sidebarRecolhida}
        />

        <main className={estilos.main}>{children}</main>
      </div>

      <NavegacaoMobile />
    </div>
  );
};

export default LayoutPagina;
