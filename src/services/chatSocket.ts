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

const WS_BASE_URL = process.env.REACT_APP_WS_URL || 'http://localhost:8080/ws';

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
  const ouvintes = new Map<string, (mensagem: MensagemDTO) => void>();

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

  const assinar = (conversaId: string) => {
    const ouvinte = ouvintes.get(conversaId);
    if (!ouvinte || !client.connected) return;
    assinaturasPorConversa.get(conversaId)?.unsubscribe();
    assinaturasPorConversa.set(conversaId, client.subscribe(`/topic/conversas/${conversaId}`, (frame: IMessage) => {
      try {
        ouvinte(JSON.parse(frame.body) as MensagemDTO);
      } catch {
        // Uma mensagem inválida não impede a reconexão; o histórico cobre a lacuna.
      }
    }));
  };

  client.onConnect = () => {
    assinaturasPorConversa.clear();
    ouvintes.forEach((_, id) => assinar(id));
    aoConectar?.();
  };
  client.onWebSocketClose = () => {
    assinaturasPorConversa.clear();
    aoDesconectar?.();
  };
  let aoConectar: (() => void) | undefined;
  let aoDesconectar: (() => void) | undefined;
  client.activate();

  return {
    aoConectar(callback) {
      aoConectar = callback;
      if (client.connected) callback();
    },
    aoDesconectar(callback) {
      aoDesconectar = callback;
    },
    aoErro(callback) {
      client.onStompError = (frame) => callback(frame.headers?.message ?? 'Erro na conexão do chat.');
      client.onWebSocketError = () => callback('Não foi possível conectar ao chat em tempo real.');
    },
    assinarConversa(conversaId, onMensagem) {
      ouvintes.set(conversaId, onMensagem);
      assinar(conversaId);

      return () => {
        assinaturasPorConversa.get(conversaId)?.unsubscribe();
        assinaturasPorConversa.delete(conversaId);
        ouvintes.delete(conversaId);
      };
    },
    enviarMensagem(conversaId, conteudo, clientMessageId) {
      if (!client.connected) return false;
      client.publish({
        destination: `/app/conversas/${conversaId}/enviar`,
        body: JSON.stringify({ conteudo, clientMessageId }),
      });
      return true;
    },
    desconectar() {
      assinaturasPorConversa.forEach((assinatura) => assinatura.unsubscribe());
      assinaturasPorConversa.clear();
      ouvintes.clear();
      client.deactivate();
    },
  };
}
