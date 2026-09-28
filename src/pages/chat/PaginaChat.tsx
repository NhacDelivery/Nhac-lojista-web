import React, { useState, useEffect, useRef, useCallback } from 'react';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Avatar from '../../components/ui/Avatar';
import Botao from '../../components/ui/Botao';
import {
  listarConversas,
  listarMensagens,
  marcarConversaComoLida,
  ConversaResumoDTO,
  MensagemDTO,
} from '../../services/api';
import { conectarChatSocket, ChatSocket } from '../../services/chatSocket';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import { formatarData, formatarHora } from '../../utils/formatacao';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import estilos from './PaginaChat.module.css';

const MENSAGENS_PRE_PRONTAS = [
  'Pedido confirmado! ✅',
  'Seu pedido está sendo preparado 🍳',
  'Seu pedido saiu para entrega 🚗',
  'Infelizmente não temos esse item disponível',
  'Obrigado pela preferência! ⭐',
];
type Pendente = { id: string; texto: string; incerto: boolean };

const PaginaChat = () => {
  const { mostrarToast } = useToast();
  const [conversas, setConversas] = useState<ConversaResumoDTO[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDTO[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);
  const [pendentes, setPendentes] = useState<Record<string, Pendente>>({});

  const socketRef = useRef<ChatSocket | null>(null);
  const desinscreverRef = useRef<(() => void) | null>(null);
  const ativaRef = useRef<string | null>(null);
  const pendentesRef = useRef<Record<string, Pendente>>({});
  const prazosRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const rascunhosRef = useRef<Record<string, string>>({});

  const atualizarPendentes = (valor: Record<string, Pendente>) => {
    pendentesRef.current = valor;
    setPendentes(valor);
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
      if (ativaRef.current === mensagem.conversaId) setNovaMensagem('');
    }
  };

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) ?? null;

  const carregarConversas = useCallback(async () => {
    try {
      setCarregandoConversas(true);
      const dados = await listarConversas();
      setConversas(dados);
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Não foi possível carregar as conversas.');
    } finally {
      setCarregandoConversas(false);
    }
  }, [mostrarToast]);

  useEffect(() => {
    const prazos = prazosRef.current;
    const socket = conectarChatSocket();
    socket.aoConectar(() => {
      const id = ativaRef.current;
      if (id) listarMensagens(id).then((historico) => {
        if (ativaRef.current !== id) return;
        setMensagens((atual) => {
          const porId = new Map([...atual, ...historico].map((m) => [m.id, m]));
          return [...porId.values()].sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
        });
        historico.forEach(confirmar);
      }).catch(() => { /* a tela mantém o histórico já carregado */ });
    });
    socket.aoErro((mensagem) => {
      const id = ativaRef.current;
      if (id && pendentesRef.current[id]) atualizarPendentes({
        ...pendentesRef.current, [id]: { ...pendentesRef.current[id], incerto: true },
      });
      mostrarToast(mensagem);
    });
    socketRef.current = socket;

    carregarConversas();

    return () => {
      desinscreverRef.current?.();
      Object.values(prazos).forEach(clearTimeout);
      socket.desconectar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSelecionarConversa = async (id: string) => {
    desinscreverRef.current?.();
    ativaRef.current = id;
    setConversaAtivaId(id);
    setMensagens([]);
    setNovaMensagem(pendentesRef.current[id]?.texto ?? rascunhosRef.current[id] ?? '');
    desinscreverRef.current = socketRef.current?.assinarConversa(id, (mensagem) => {
      confirmar(mensagem);
      setMensagens((atual) => atual.some((m) => m.id === mensagem.id) ? atual : [...atual, mensagem]);
      setConversas((atual) => atual.map((c) => c.id === mensagem.conversaId
        ? { ...c, ultimaMensagemPreview: mensagem.conteudo, ultimaMensagemEm: mensagem.enviadaEm }
        : c));
    }) ?? null;

    try {
      setCarregandoMensagens(true);
      const historico = await listarMensagens(id);
      if (ativaRef.current !== id) return;
      setMensagens((atual) => {
        const porId = new Map([...atual, ...historico].map((m) => [m.id, m]));
        return [...porId.values()].sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
      });
      historico.forEach(confirmar);
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Não foi possível carregar o histórico.');
    } finally {
      if (ativaRef.current === id) setCarregandoMensagens(false);
    }

    marcarConversaComoLida(id).catch(() => {
      /* melhor esforço — não bloqueia a experiência se falhar */
    });
    setConversas((atual) => atual.map((c) => (c.id === id ? { ...c, naoLidas: 0 } : c)));

  };

  const handleEnviar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novaMensagem.trim() || !conversaAtiva || !socketRef.current) return;
    const id = conversaAtiva.id;
    const pendente = pendentesRef.current[id];
    if (pendente && !pendente.incerto) return;
    const texto = pendente?.texto ?? novaMensagem.trim();
    const identificador = pendente?.id ?? crypto.randomUUID();
    if (!socketRef.current.enviarMensagem(id, texto, identificador)) {
      mostrarToast('Sem conexão com o chat. Tente novamente quando conectar.');
      return;
    }
    atualizarPendentes({ ...pendentesRef.current, [id]: { id: identificador, texto, incerto: false } });
    clearTimeout(prazosRef.current[id]);
    prazosRef.current[id] = setTimeout(() => {
      const atual = pendentesRef.current[id];
      if (atual?.id === identificador) atualizarPendentes({
        ...pendentesRef.current, [id]: { ...atual, incerto: true },
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
        <div className={`${estilos.listaConversas} ${conversaAtivaId ? estilos.esconderMobile : ''}`}>
          {carregandoConversas ? (
            <p style={{ padding: '1rem', color: 'var(--nhac-texto-claro)' }}>Carregando conversas...</p>
          ) : conversas.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--nhac-texto-claro)' }}>Nenhuma conversa ainda.</p>
          ) : (
            conversas.map((conversa) => (
              <button type="button"
                key={conversa.id}
                className={`${estilos.itemConversa} ${conversaAtivaId === conversa.id ? estilos.ativo : ''}`}
                onClick={() => handleSelecionarConversa(conversa.id)}
                aria-current={conversaAtivaId === conversa.id ? 'true' : undefined}
              >
                <Avatar nome={conversa.clienteNome} tamanho="medio" />
                <div className={estilos.infoConversa}>
                  <div className={estilos.linhaTopo}>
                    <span className={estilos.nomeCliente}>{conversa.clienteNome}</span>
                    <span className={estilos.tempo}>{formatarData(conversa.ultimaMensagemEm).split(' ')[0]}</span>
                  </div>
                  <div className={estilos.linhaBase}>
                    <span className={estilos.previa}>{conversa.ultimaMensagemPreview ?? 'Sem mensagens ainda'}</span>
                  </div>
                </div>
                {conversa.naoLidas > 0 && <div className={estilos.badge}>{conversa.naoLidas}</div>}
              </button>
            ))
          )}
        </div>

        <div className={`${estilos.areaChat} ${!conversaAtivaId ? estilos.esconderMobile : ''}`}>
          {conversaAtiva ? (
            <>
              <header className={estilos.cabecalhoChat}>
                <button type="button" aria-label="Voltar às conversas" className={estilos.voltarMobile}
                  onClick={() => setConversaAtivaId(null)}>
                  <ArrowLeft size={24} />
                </button>
                <Avatar nome={conversaAtiva.clienteNome} tamanho="pequeno" />
                <div className={estilos.cabecalhoInfo}>
                  <h3 className={estilos.chatNome}>{conversaAtiva.clienteNome}</h3>
                </div>
              </header>

              <div className={estilos.mensagensContainer}>
                <div className={estilos.mensagens}>
                  {carregandoMensagens ? (
                    <p style={{ color: 'var(--nhac-texto-claro)', textAlign: 'center' }}>Carregando mensagens...</p>
                  ) : (
                    mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${estilos.mensagemWrapper} ${msg.remetenteTipo === 'LOJA' ? estilos.minhaMensagem : estilos.mensagemCliente}`}
                      >
                        <div className={estilos.balao}>{msg.conteudo}</div>
                        <span className={estilos.hora}>{formatarHora(msg.enviadaEm)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={estilos.areaEnvio}>
                <div className={estilos.mensagensRapidas}>
                  {MENSAGENS_PRE_PRONTAS.map((msg, idx) => (
                    <button key={idx} className={estilos.btnMensagemRapida} onClick={() => usarMensagemRapida(msg)}
                      disabled={!!pendentes[conversaAtiva.id]}>
                      {msg}
                    </button>
                  ))}
                </div>
                <form noValidate className={estilos.formEnvio} onSubmit={handleEnviar}>
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
                  <Botao type="submit" icone={<Send size={20} />}
                    disabled={!novaMensagem.trim() || (!!pendentes[conversaAtiva.id] && !pendentes[conversaAtiva.id].incerto)}>
                    {pendentes[conversaAtiva.id]?.incerto ? 'Reenviar' : 'Enviar'}
                  </Botao>
                </form>
                {pendentes[conversaAtiva.id] && <p role="status" className={estilos.estadoEnvio}>
                  {pendentes[conversaAtiva.id].incerto
                    ? 'Sem confirmação. Confira a conversa ou reenvie a mesma mensagem.'
                    : 'Aguardando confirmação da mensagem...'}
                </p>}
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
