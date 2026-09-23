import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { StatusPedido } from '../types';

const WS_BASE_URL = process.env.REACT_APP_WS_URL || (process.env.REACT_APP_API_URL || 'http://localhost:8080/api/v1').replace(/\/api\/v1\/?$/, '/ws');
const STATUS_VALIDOS = new Set<StatusPedido>([
  'PENDENTE',
  'PAGO',
  'PREPARANDO',
  'SAIU_ENTREGA',
  'ENTREGUE',
  'CANCELADO',
]);

export interface PedidoStatusSocket {
  desconectar: () => void;
}

/**
 * Acompanha as mudanças feitas pelo entregador no pedido. O backend publica
 * texto puro em /topic/pedidos/{id}/status quando há aceite, coleta ou entrega.
 */
export function conectarStatusPedidoSocket(
  pedidoId: string,
  aoAtualizar: (status: StatusPedido) => void,
): PedidoStatusSocket {
  let encerrado = false;
  let assinatura: StompSubscription | undefined;

  const client = new Client({
    webSocketFactory: () => new SockJS(WS_BASE_URL) as unknown as WebSocket,
    reconnectDelay: 4000,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
  });

  client.beforeConnect = () => {
    client.connectHeaders = {
      Authorization: `Bearer ${localStorage.getItem('@nhac:token') ?? ''}`,
    };
  };

  client.onConnect = () => {
    if (encerrado) return;
    assinatura = client.subscribe(`/topic/pedidos/${pedidoId}/status`, (frame: IMessage) => {
      const status = frame.body.trim().replace(/^"|"$/g, '') as StatusPedido;
      if (!encerrado && STATUS_VALIDOS.has(status)) aoAtualizar(status);
    });
  };

  client.activate();

  return {
    desconectar() {
      encerrado = true;
      if (client.connected) assinatura?.unsubscribe();
      assinatura = undefined;
      void client.deactivate();
    },
  };
}
