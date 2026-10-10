import ConteudoMensagem, { lerReferenciaProduto } from "./ConteudoMensagem";
import React, { useState, useEffect, useRef, useCallback } from "react";
import LayoutPagina from "../../components/layout/LayoutPagina";
import Avatar from "../../components/ui/Avatar";
import Botao from "../../components/ui/Botao";
import {
  listarConversas,
  listarMensagens,
  marcarConversaComoLida,
  ConversaResumoDTO,
  MensagemDTO,
} from "../../services/api";
import { conectarChatSocket, ChatSocket } from "../../services/chatSocket";
import { tratarErroApi } from "../../utils/errosApi";
import { useToast } from "../../contexts/ToastContext";
import { formatarData, formatarHora } from "../../utils/formatacao";
import { Send, ArrowLeft, MessageSquare } from "lucide-react";
import { API_BASE_URL, chaveConta } from "../../services/endpoints";
import estilos from "./PaginaChat.module.css";

const MENSAGENS_PRE_PRONTAS = [
  "Pedido confirmado! ✅",
  "Seu pedido está sendo preparado 🍳",
  "Seu pedido saiu para entrega 🚗",
  "Infelizmente não temos esse item disponível",
  "Obrigado pela preferência! ⭐",
];
type Pendente = { id: string; texto: string; incerto: boolean };

const PaginaChat = () => {
  const { mostrarToast } = useToast();
  const [conversas, setConversas] = useState<ConversaResumoDTO[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDTO[]>([]);
  const [novaMensagem, setNovaMensagem] = useState("");
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const chavePersistencia = useRef(
    `@nhac:chat:${API_BASE_URL}:${chaveConta()}`,
  );
  const restaurados = useRef<Record<string, Pendente>>(
    (() => {
      try {
        const salvos: Record<string, unknown> = JSON.parse(
          localStorage.getItem(chavePersistencia.current) || "{}",
        );
        const validos: Record<string, Pendente> = {};
        for (const [id, valor] of Object.entries(salvos)) {
          if (!valor || typeof valor !== "object") continue;
          const item = valor as Partial<Pendente>;
          if (typeof item.id === "string" && typeof item.texto === "string") {
            validos[id] = { id: item.id, texto: item.texto, incerto: true };
          }
        }
        return validos;
      } catch {
        return {};
      }
    })(),
  );
  const [pendentes, setPendentes] = useState<Record<string, Pendente>>(
    restaurados.current,
  );

  const socketRef = useRef<ChatSocket | null>(null);
  const desinscreverRef = useRef<(() => void) | null>(null);
  const ativaRef = useRef<string | null>(null);
  const pendentesRef = useRef<Record<string, Pendente>>(restaurados.current);
  const prazosRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rascunhosRef = useRef<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [paginaAntiga, setPaginaAntiga] = useState(0);
  const [carregandoAntigas, setCarregandoAntigas] = useState(false);
  const [maisAntigas, setMaisAntigas] = useState(true);
  const restaurandoPosicao = useRef(false);
  const listaOcupada = useRef(false);
  const atualizarPendentes = (valor: Record<string, Pendente>): boolean => {
    try {
      localStorage.setItem(chavePersistencia.current, JSON.stringify(valor));
    } catch {
      mostrarToast(
        "Não foi possível guardar a mensagem neste aparelho. Libere espaço e tente novamente.",
      );
      return false;
    }
    pendentesRef.current = valor;
    setPendentes(valor);
    return true;
  };
  const confirmar = (mensagem: MensagemDTO) => {
    const pendente = pendentesRef.current[mensagem.conversaId];
    if (pendente && mensagem.id === `msg_${pendente.id}`) {
      clearTimeout(prazosRef.current[mensagem.conversaId]);
      delete prazosRef.current[mensagem.conversaId];
      const novos = { ...pendentesRef.current };
      delete novos[mensagem.conversaId];
      atualizarPendentes(novos);
      delete rascunhosRef.current[mensagem.conversaId];
      if (ativaRef.current === mensagem.conversaId) setNovaMensagem("");
    }
  };

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) ?? null;

  const carregarConversas = useCallback(
    async (silencioso = false) => {
      if (listaOcupada.current) return;
      listaOcupada.current = true;
      try {
        if (!silencioso) setCarregandoConversas(true);
        const dados = await listarConversas();
        setConversas(dados);
      } catch (err) {
        const tratado = tratarErroApi(err);
        mostrarToast(
          tratado.mensagemGeral ?? "Não foi possível carregar as conversas.",
        );
      } finally {
        listaOcupada.current = false;
        setCarregandoConversas(false);
      }
    },
    [mostrarToast],
  );

  useEffect(() => {
    const prazos = prazosRef.current;
    const socket = conectarChatSocket();
    socket.aoConectar(() => {
      const id = ativaRef.current;
      if (id)
        listarMensagens(id)
          .then((historico) => {
            if (ativaRef.current !== id) return;
            setMensagens((atual) => {
              const porId = new Map(
                [...atual, ...historico].map((m) => [m.id, m]),
              );
              return [...porId.values()].sort((a, b) =>
                a.enviadaEm.localeCompare(b.enviadaEm),
              );
            });
            historico.forEach(confirmar);
          })
          .catch(() => {
            /* a tela mantém o histórico já carregado */
          });
    });
    socket.aoErro((mensagem) => {
      const id = ativaRef.current;
      if (id && pendentesRef.current[id])
        atualizarPendentes({
          ...pendentesRef.current,
          [id]: { ...pendentesRef.current[id], incerto: true },
        });
      mostrarToast(mensagem);
    });
    socketRef.current = socket;

    carregarConversas();
    const intervalo = setInterval(() => {
      void carregarConversas(true);
      const id = ativaRef.current;
      if (id) void marcarLida(id);
    }, 10000);

    return () => {
      clearInterval(intervalo);
      desinscreverRef.current?.();
      Object.values(prazos).forEach(clearTimeout);
      socket.desconectar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const marcarLida = async (id: string) => {
    if (ativaRef.current !== id) return;
    try {
      await marcarConversaComoLida(id);
      if (ativaRef.current === id)
        setConversas((atual) =>
          atual.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c)),
        );
    } catch {
      mostrarToast(
        "Não foi possível confirmar a leitura. Tentaremos novamente enquanto a conversa estiver aberta.",
      );
    }
  };
  useEffect(() => {
    if (!restaurandoPosicao.current && scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [mensagens, conversaAtivaId]);
  const carregarAntigas = async () => {
    const id = ativaRef.current;
    if (!id || carregandoAntigas) return;
    setCarregandoAntigas(true);
    restaurandoPosicao.current = true;
    const altura = scrollRef.current?.scrollHeight || 0;
    const topo = scrollRef.current?.scrollTop || 0;
    try {
      const antigas = await listarMensagens(id, { page: paginaAntiga + 1 });
      if (ativaRef.current !== id) return;
      setMensagens((atual) =>
        [
          ...new Map([...antigas, ...atual].map((m) => [m.id, m])).values(),
        ].sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm)),
      );
      setPaginaAntiga((v) => v + 1);
      setMaisAntigas(antigas.length === 30);
      setTimeout(() => {
        if (ativaRef.current === id && scrollRef.current)
          scrollRef.current.scrollTop =
            topo + scrollRef.current.scrollHeight - altura;
        restaurandoPosicao.current = false;
      }, 0);
    } catch {
      restaurandoPosicao.current = false;
      mostrarToast(
        "Não foi possível carregar mensagens antigas. Tente novamente.",
      );
    } finally {
      setCarregandoAntigas(false);
    }
  };

  const handleSelecionarConversa = async (id: string) => {
    desinscreverRef.current?.();
    ativaRef.current = id;
    setConversaAtivaId(id);
    setMensagens([]);
    setPaginaAntiga(0);
    setMaisAntigas(true);
    setNovaMensagem(
      pendentesRef.current[id]?.texto ?? rascunhosRef.current[id] ?? "",
    );
    desinscreverRef.current =
      socketRef.current?.assinarConversa(id, (mensagem) => {
        confirmar(mensagem);
        if (mensagem.remetenteTipo !== "LOJA") void marcarLida(id);
        setMensagens((atual) =>
          atual.some((m) => m.id === mensagem.id)
            ? atual
            : [...atual, mensagem],
        );
        setConversas((atual) =>
          atual.map((c) =>
            c.id === mensagem.conversaId
              ? {
                  ...c,
                  ultimaMensagemPreview: mensagem.conteudo,
                  ultimaMensagemEm: mensagem.enviadaEm,
                }
              : c,
          ),
        );
      }) ?? null;

    try {
      setCarregandoMensagens(true);
      const historico = await listarMensagens(id);
      if (ativaRef.current !== id) return;
      setMensagens((atual) => {
        const porId = new Map([...atual, ...historico].map((m) => [m.id, …9278 tokens truncated…ratarErroApi(err);
      setErro(
        tratado.mensagemGeral ?? "Não foi possível carregar os funcionários.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const getCorCargo = (cargo: string): "info" | "aviso" | "neutro" => {
    switch (cargo.toLowerCase()) {
      case "administrador":
        return "info";
      case "gerente":
        return "aviso";
      default:
        return "neutro";
    }
  };

  const handleExcluir = async (id: string) => {
    try {
      await desativarFuncionario(id);
      setFuncionarios(
        funcionarios.map((f) => (f.id === id ? { ...f, ativo: false } : f)),
      );
      mostrarToast("Funcionário desativado.");
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(
        tratado.mensagemGeral ?? "Não foi possível desativar o funcionário.",
      );
    } finally {
      setConfirmandoExclusao(null);
    }
  };

  const handleReativar = async (id: string) => {
    try {
      await reativarFuncionario(id);
      setFuncionarios(
        funcionarios.map((f) => (f.id === id ? { ...f, ativo: true } : f)),
      );
      mostrarToast("Funcionário reativado.");
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(
        tratado.mensagemGeral ?? "Não foi possível reativar o funcionário.",
      );
    }
  };

  return (
    <LayoutPagina titulo="Funcionários">
      <div className={estilos.container}>
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Equipe</h2>
          <Botao
            onClick={() => navigate("/funcionarios/novo")}
            icone={<Plus size={20} />}
          >
            Novo funcionário
          </Botao>
        </header>

        {carregando ? (
          <p
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--nhac-texto-claro)",
            }}
          >
            Carregando...
          </p>
        ) : erro ? (
          <div
            style={{
              padding: "2rem",
              textAlign: "center",
              color: "var(--nhac-texto-claro)",
            }}
          >
            <p>{erro}</p>
            <Botao variante="secundario" onClick={carregar}>
              Tentar novamente
            </Botao>
          </div>
        ) : (
          <Cartao className={estilos.tabelaCartao}>
            <div className={estilos.responsivoTabela}>
              <table className={estilos.tabela}>
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>Contato</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Data de Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.length === 0 ? (
                    <tr>
                      <td colSpan={6}>Nenhum funcionário cadastrado ainda.</td>
                    </tr>
                  ) : (
                    funcionarios.map((func) => (
                      <tr key={func.id}>
                        <td>
                          <div className={estilos.infoUsuario}>
                            <Avatar
                              nome={func.nomeCompleto}
                              fotoUrl={func.fotoUrl}
                              tamanho="pequeno"
                            />
                            <span className={estilos.nome}>
                              {func.nomeCompleto}
                            </span>
                          </div>
                        </td>
                        <td>
                          <div className={estilos.contato}>
                            <span className={estilos.email}>{func.email}</span>
                            <span className={estilos.telefone}>
                              {func.telefone}
                            </span>
                          </div>
                        </td>
                        <td>
                          <Emblema variante={getCorCargo(func.cargo)}>
                            {func.cargo}
                          </Emblema>
                        </td>
                        <td>
                          <Emblema variante={func.ativo ? "sucesso" : "erro"}>
                            {func.ativo ? "Ativo" : "Inativo"}
                          </Emblema>
                        </td>
                        <td>{formatarData(func.dataCadastro)}</td>
                        <td>
                          <div className={estilos.acoes}>
                            <Botao
                              aria-label={`Editar ${func.nomeCompleto}`}
                              variante="fantasma"
                              icone={<Edit2 size={18} />}
                              onClick={() =>
                                navigate(`/funcionarios/${func.id}`)
                              }
                            />
                            {func.ativo ? (
                              <Botao
                                aria-label={`Desativar ${func.nomeCompleto}`}
                                variante="perigo"
                                icone={<Trash2 size={18} />}
                                onClick={() => setConfirmandoExclusao(func.id)}
                              />
                            ) : (
                              <Botao
                                aria-label={`Reativar ${func.nomeCompleto}`}
                                variante="secundario"
                                icone={<RotateCcw size={18} />}
                                onClick={() => handleReativar(func.id)}
                              />
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className={estilos.listaMobile}>
              {funcionarios.map((func) => (
                <div key={func.id} className={estilos.cartaoMobile}>
                  <div className={estilos.cabecalhoMobile}>
                    <div className={estilos.infoUsuario}>
                      <Avatar
                        nome={func.nomeCompleto}
                        fotoUrl={func.fotoUrl}
                        tamanho="medio"
                      />
                      <div>
                        <div className={estilos.nome}>{func.nomeCompleto}</div>
                        <div className={estilos.email}>{func.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className={estilos.corpoMobile}>
                    <div className={estilos.detalheMobile}>
                      <span className={estilos.rotulo}>Cargo:</span>
                      <Emblema variante={getCorCargo(func.cargo)}>
                        {func.cargo}
                      </Emblema>
                    </div>
                    <div className={estilos.detalheMobile}>
                      <span className={estilos.rotulo}>Status:</span>
                      <Emblema variante={func.ativo ? "sucesso" : "erro"}>
                        {func.ativo ? "Ativo" : "Inativo"}
                      </Emblema>
                    </div>
                    <div className={estilos.acoesMobile}>
                      <Botao
                        variante="secundario"
                        onClick={() => navigate(`/funcionarios/${func.id}`)}
                      >
                        Editar
                      </Botao>
                      {func.ativo ? (
                        <Botao
                          variante="perigo"
                          onClick={() => setConfirmandoExclusao(func.id)}
                        >
                          Excluir
                        </Botao>
                      ) : (
                        <Botao
                          variante="secundario"
                          onClick={() => handleReativar(func.id)}
                        >
                          Reativar
                        </Botao>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Cartao>
        )}
      </div>

      <ModalConfirmacao
        aberto={confirmandoExclusao !== null}
        titulo="Desativar funcionário"
        mensagem="Isso bloqueia o login desse funcionário imediatamente. Tem certeza?"
        textoBotaoConfirmar="Desativar"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={() =>
          confirmandoExclusao && handleExcluir(confirmandoExclusao)
        }
        aoCancelar={() => setConfirmandoExclusao(null)}
      />
    </LayoutPagina>
  );
};

export default PaginaListaFuncionarios;
