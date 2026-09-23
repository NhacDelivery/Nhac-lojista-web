import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { MensagemDTO } from './api';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1';
const WS_BASE_URL = process.env.REACT_APP_WS_URL || API_URL.replace(/\/api\/v1\/?$/, '/ws');

export interface ChatSocket {
  aoConectar: (callback: () => void) => void;
  aoDesconectar: (callback: () => void) => void;
  aoErro: (callback: (mensagem: string) => void) => void;
  assinarConversa: (id: string, callback: (mensagem: MensagemDTO) => void) => () => void;
  enviarMensagem: (id: string, conteudo: string) => boolean;
  desconectar: () => void;
}

export function conectarChatSocket(): ChatSocket {
  const desejadas = new Map<string, (mensagem: MensagemDTO) => void>();
  const ativas = new Map<string, StompSubscription>();
  let encerrado = false;
  let conectado = () => {};
  let desconectado = () => {};
  let erro: (mensagem: string) => void = () => {};
  const client = new Client({
    webSocketFactory: () => new SockJS(WS_BASE_URL) as unknown as WebSocket,
    reconnectDelay: 4000, heartbeatIncoming: 10000, heartbeatOutgoing: 10000,
  });
  const assinar = (id: string) => {
    if (!client.connected || encerrado || ativas.has(id)) return;
    ativas.set(id, client.subscribe(`/topic/conversas/${id}`, (frame: IMessage) => {
      if (encerrado) return;
      try { desejadas.get(id)?.(JSON.parse(frame.body)); }
      catch { erro('Mensagem inválida recebida. Atualize o histórico.'); }
    }));
  };
  client.beforeConnect = () => {
    client.connectHeaders = { Authorization: `Bearer ${localStorage.getItem('@nhac:token') ?? ''}` };
  };
  client.onConnect = () => {
    if (encerrado) return;
    ativas.clear();
    desejadas.forEach((_, id) => assinar(id));
    conectado();
  };
  client.onWebSocketClose = () => { ativas.clear(); if (!encerrado) desconectado(); };
  client.onStompError = () => { if (!encerrado) erro('Não foi possível concluir a operação no chat.'); };
  client.onWebSocketError = () => { if (!encerrado) erro('Chat desconectado. Tentando reconectar...'); };
  client.activate();
  return {
    aoConectar(callback) { conectado = callback; if (client.connected) callback(); },
    aoDesconectar(callback) { desconectado = callback; },
    aoErro(callback) { erro = callback; },
    assinarConversa(id, callback) {
      desejadas.set(id, callback);
      assinar(id);
      return () => {
        if (desejadas.get(id) !== callback) return;
        desejadas.delete(id);
        if (client.connected) ativas.get(id)?.unsubscribe();
        ativas.delete(id);
      };
    },
    enviarMensagem(id, conteudo) {
      if (encerrado || !client.connected || !conteudo.trim() || conteudo.length > 4000) return false;
      try {
        client.publish({ destination: `/app/conversas/${id}/enviar`, body: JSON.stringify({ conteudo }) });
        return true;
      } catch { erro('Mensagem não enviada. Tente novamente.'); return false; }
    },
    desconectar() {
      encerrado = true;
      desejadas.clear();
      ativas.clear();
      void client.deactivate();
    },
  };
}
