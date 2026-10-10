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
        const porId = new Map([...atual, ...historico].map((m) => [m.id, m]));
        return [...porId.values()].sort((a, b) =>
          a.enviadaEm.localeCompare(b.enviadaEm),
        );
      });
      historico.forEach(confirmar);
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(
        tratado.mensagemGeral ?? "Não foi possível carregar o histórico.",
      );
    } finally {
      if (ativaRef.current === id) setCarregandoMensagens(false);
    }

    await marcarLida(id);
  };

  const handleEnviar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novaMensagem.trim() || !conversaAtiva || !socketRef.current) return;
    const id = conversaAtiva.id;
    const pendente = pendentesRef.current[id];
    if (pendente && !pendente.incerto) return;
    const texto = pendente?.texto ?? novaMensagem.trim();
    const identificador = pendente?.id ?? crypto.randomUUID();
    if (
      !atualizarPendentes({
        ...pendentesRef.current,
        [id]: { id: identificador, texto, incerto: true },
      })
    )
      return;
    if (!socketRef.current.enviarMensagem(id, texto, identificador)) {
      mostrarToast("Sem conexão com o chat. Tente novamente quando conectar.");
      return;
    }
    atualizarPendentes({
      ...pendentesRef.current,
      [id]: { id: identificador, texto, incerto: false },
    });
    clearTimeout(prazosRef.current[id]);
    prazosRef.current[id] = setTimeout(() => {
      const atual = pendentesRef.current[id];
      if (atual?.id === identificador)
        atualizarPendentes({
          ...pendentesRef.current,
          [id]: { ...atual, incerto: true },
        });
    }, 15000);
  };

  const usarMensagemRapida = (texto: string) => {
    if (conversaAtivaId && pendentesRef.current[conversaAtivaId]) return;
    if (conversaAtivaId) rascunhosRef.current[conversaAtivaId] = texto;
    setNovaMensagem(texto);
  };

  return (
    <LayoutPagina titulo="Chat">
      <div className={estilos.container}>
        <div
          className={`${estilos.listaConversas} ${conversaAtivaId ? estilos.esconderMobile : ""}`}
        >
          {carregandoConversas ? (
            <p style={{ padding: "1rem", color: "var(--nhac-texto-claro)" }}>
              Carregando conversas...
            </p>
          ) : conversas.length === 0 ? (
            <p style={{ padding: "1rem", color: "var(--nhac-texto-claro)" }}>
              Nenhuma conversa ainda.
            </p>
          ) : (
            conversas.map((conversa) => (
              <button
                type="button"
                key={conversa.id}
                className={`${estilos.itemConversa} ${conversaAtivaId === conversa.id ? estilos.ativo : ""}`}
                onClick={() => handleSelecionarConversa(conversa.id)}
                aria-current={
                  conversaAtivaId === conversa.id ? "true" : undefined
                }
              >
                <Avatar nome={conversa.clienteNome} tamanho="medio" />
                <div className={estilos.infoConversa}>
                  <div className={estilos.linhaTopo}>
                    <span className={estilos.nomeCliente}>
                      {conversa.clienteNome}
                    </span>
                    <span className={estilos.tempo}>
                      {formatarData(conversa.ultimaMensagemEm).split(" ")[0]}
                    </span>
                  </div>
                  <div className={estilos.linhaBase}>
                    <span className={estilos.previa}>
                      {lerReferenciaProduto(
                        conversa.ultimaMensagemPreview ?? "",
                      )?.nome ??
                        conversa.ultimaMensagemPreview?.split("\n")[0] ??
                        "Sem mensagens ainda"}
                    </span>
                  </div>
                </div>
                {conversa.naoLidas > 0 && (
                  <div className={estilos.badge}>{conversa.naoLidas}</div>
                )}
              </button>
            ))
          )}
        </div>

        <div
          className={`${estilos.areaChat} ${!conversaAtivaId ? estilos.esconderMobile : ""}`}
        >
          {conversaAtiva ? (
            <>
              <header className={estilos.cabecalhoChat}>
                <button
                  type="button"
                  aria-label="Voltar às conversas"
                  className={estilos.voltarMobile}
                  onClick={() => setConversaAtivaId(null)}
                >
                  <ArrowLeft size={24} />
                </button>
                <Avatar nome={conversaAtiva.clienteNome} tamanho="pequeno" />
                <div className={estilos.cabecalhoInfo}>
                  <h3 className={estilos.chatNome}>
                    {conversaAtiva.clienteNome}
                  </h3>
                </div>
              </header>

              <div className={estilos.mensagensContainer} ref={scrollRef}>
                {maisAntigas && (
                  <button
                    disabled={carregandoAntigas}
                    onClick={() => void carregarAntigas()}
                  >
                    {carregandoAntigas
                      ? "Carregando…"
                      : "Carregar mensagens anteriores"}
                  </button>
                )}
                <div className={estilos.mensagens}>
                  {carregandoMensagens ? (
                    <p
                      style={{
                        color: "var(--nhac-texto-claro)",
                        textAlign: "center",
                      }}
                    >
                      Carregando mensagens...
                    </p>
                  ) : (
                    mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${estilos.mensagemWrapper} ${msg.remetenteTipo === "LOJA" ? estilos.minhaMensagem : estilos.mensagemCliente}`}
                      >
                        <div className={estilos.balao}>
                          <ConteudoMensagem conteudo={msg.conteudo} />
                        </div>
                        <span className={estilos.hora}>
                          {formatarHora(msg.enviadaEm)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={estilos.areaEnvio}>
                <div className={estilos.mensagensRapidas}>
                  {MENSAGENS_PRE_PRONTAS.map((msg, idx) => (
                    <button
                      key={idx}
                      className={estilos.btnMensagemRapida}
                      onClick={() => usarMensagemRapida(msg)}
                      disabled={!!pendentes[conversaAtiva.id]}
                    >
                      {msg}
                    </button>
                  ))}
                </div>
                <form
                  noValidate
                  className={estilos.formEnvio}
                  onSubmit={handleEnviar}
                >
                  <input
                    type="text"
                    className={estilos.inputMensagem}
                    value={novaMensagem}
                    onChange={(e) => {
                      rascunhosRef.current[conversaAtiva.id] = e.target.value;
                      setNovaMensagem(e.target.value);
                    }}
                    disabled={!!pendentes[conversaAtiva.id]}
                    maxLength={4000}
                    placeholder="Digite sua mensagem..."
                  />
                  <Botao
                    type="submit"
                    icone={<Send size={20} />}
                    disabled={
                      !novaMensagem.trim() ||
                      (!!pendentes[conversaAtiva.id] &&
                        !pendentes[conversaAtiva.id].incerto)
                    }
                  >
                    {pendentes[conversaAtiva.id]?.incerto
                      ? "Reenviar"
                      : "Enviar"}
                  </Botao>
                </form>
                {pendentes[conversaAtiva.id] && (
                  <p role="status" className={estilos.estadoEnvio}>
                    {pendentes[conversaAtiva.id].incerto
                      ? "Sem confirmação. Confira a conversa ou reenvie a mesma mensagem."
                      : "Aguardando confirmação da mensagem..."}
                  </p>
                )}
              </div>
            </>
          ) : (
            <div className={estilos.estadoVazio}>
              <MessageSquare size={48} color="var(--nhac-borda)" />
              <p>Selecione uma conversa para começar a falar</p>
            </div>
          )}
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaChat;
