/**
 * Cliente WebSocket (STOMP) do chat — Round 20.
 * Backend: /ws (SockJS) em WebSocketConfig, autenticação dentro do frame
 * STOMP CONNECT (não no handshake HTTP — WebSocket nativo do browser não
 * permite headers customizados no handshake, mas o protocolo STOMP permite
 * no CONNECT). Ver StompAuthChannelInterceptor no backend.
 *
 * Uso:
 *   const socket = conectarChatSocket();
 *   socket.aoConectar(() => socket.assinarConversa(id, (msg) => ...));
 *   socket.enviarMensagem(conversaId, "oi");
 *   socket.desconectar(); // ao desmontar o componente
 */
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { MensagemDTO } from './api';

const WS_BASE_URL = process.env.REACT_APP_WS_URL ||
  (process.env.NODE_ENV === 'production' ? `${window.location.origin}/ws` : 'http://localhost:8080/ws');

export interface ChatSocket {
  aoConectar: (callback: () => void) => void;
  aoDesconectar: (callback: () => void) => void;
  aoErro: (callback: (mensagem: string) => void) => void;
  assinarConversa: (conversaId: string, onMensagem: (mensagem: MensagemDTO) => void) => () => void;
  enviarMensagem: (conversaId: string, conteudo: string, clientMessageId: string) => boolean;
  desconectar: () => void;
}

/**
 * Abre a conexão STOMP. O token é lido de localStorage no momento da conexão
 * e a cada reconexão automática (o mesmo `@nhac:token` usado pelo REST) —
 * assim, se o usuário logar de novo com um token diferente, a próxima
 * reconexão automática já usa o token atualizado.
 */
export function conectarChatSocket(): ChatSocket {
  const assinaturasPorConversa = new Map<string, StompSubscription>();
  const conversasDesejadas = new Map<string, (mensagem: MensagemDTO) => void>();
  let conectado: (() => void) | undefined;
  let desconectado: (() => void) | undefined;
  let erro: ((mensagem: string) => void) | undefined;

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_BASE_URL) as unknown as WebSocket,
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  // @stomp/stompjs aceita connectHeaders como objeto fixo — resolvendo o
  // token na hora da conexão (não um objeto congelado no momento do new Client).
  client.beforeConnect = () => {
    client.connectHeaders = {
      Authorization: `Bearer ${localStorage.getItem('@nhac:token') ?? ''}`,
    };
  };

  const assinar = (id: string, onMensagem: (mensagem: MensagemDTO) => void) => {
    if (!client.connected) return;
    assinaturasPorConversa.get(id)?.unsubscribe();
    const assinatura = client.subscribe(`/topic/conversas/${id}`, (frame: IMessage) => {
      try { onMensagem(JSON.parse(frame.body) as MensagemDTO); } catch { /* histórico REST recupera o evento */ }
    });
    assinaturasPorConversa.set(id, assinatura);
  };
  client.onConnect = () => {
    conversasDesejadas.forEach((handler, id) => assinar(id, handler));
    client.subscribe('/user/queue/erros', (frame) => {
      try { erro?.(JSON.parse(frame.body).erro ?? 'Não foi possível enviar a mensagem.'); }
      catch { erro?.('Não foi possível enviar a mensagem.'); }
    });
    conectado?.();
  };
  client.onWebSocketClose = () => { assinaturasPorConversa.clear(); desconectado?.(); };
  client.onStompError = (frame) => erro?.(frame.headers?.message ?? 'Erro na conexão do chat.');
  client.onWebSocketError = () => erro?.('Não foi possível conectar ao chat em tempo real.');
  client.activate();

  return {
    aoConectar(callback) { conectado = callback; if (client.connected) callback(); },
    aoDesconectar(callback) { desconectado = callback; },
    aoErro(callback) { erro = callback; },
    assinarConversa(conversaId, onMensagem) {
      conversasDesejadas.set(conversaId, onMensagem);
      assinar(conversaId, onMensagem);
      return () => {
        conversasDesejadas.delete(conversaId);
        assinaturasPorConversa.get(conversaId)?.unsubscribe();
        assinaturasPorConversa.delete(conversaId);
      };
    },
    enviarMensagem(conversaId, conteudo, clientMessageId) {
      if (!client.connected || !assinaturasPorConversa.has(conversaId)) return false;
      client.publish({
        destination: `/app/conversas/${conversaId}/enviar`,
        body: JSON.stringify({ conteudo, clientMessageId }),
      });
      return true;
    },
    desconectar() {
      assinaturasPorConversa.forEach((assinatura) => assinatura.unsubscribe());
      assinaturasPorConversa.clear();
      conversasDesejadas.clear();
      client.deactivate();
    },
  };
}
