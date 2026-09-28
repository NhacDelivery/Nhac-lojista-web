import { Client } from '@stomp/stompjs';
import { conectarChatSocket } from './chatSocket';

jest.mock('sockjs-client', () => jest.fn());
jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));

test('assina após conectar, reassina após reconectar e envia o mesmo identificador', () => {
  const assinaturas: Array<{ destination: string; callback: (frame: { body: string }) => void }> = [];
  const publish = jest.fn();
  const unsubscribe = jest.fn();
  const client: any = {
    connected: false,
    activate: jest.fn(),
    deactivate: jest.fn(),
    subscribe: jest.fn((destination, callback) => {
      assinaturas.push({ destination, callback });
      return { unsubscribe };
    }),
    publish,
  };
  (Client as jest.Mock).mockImplementation(() => client);

  const socket = conectarChatSocket();
  const receber = jest.fn();
  socket.assinarConversa('conversa-1', receber);
  expect(client.subscribe).not.toHaveBeenCalled();
  expect(socket.enviarMensagem('conversa-1', 'Oi', '12345678-1234-4234-8234-123456789abc')).toBe(false);

  client.connected = true;
  client.onConnect();
  expect(client.subscribe).toHaveBeenCalledTimes(1);
  expect(assinaturas[0].destination).toBe('/topic/conversas/conversa-1');
  const id = '12345678-1234-4234-8234-123456789abc';
  expect(socket.enviarMensagem('conversa-1', 'Oi', id)).toBe(true);
  expect(JSON.parse(publish.mock.calls[0][0].body)).toEqual({ conteudo: 'Oi', clientMessageId: id });

  client.connected = false;
  client.onWebSocketClose();
  client.connected = true;
  client.onConnect();
  expect(client.subscribe).toHaveBeenCalledTimes(2);
  assinaturas[1].callback({ body: JSON.stringify({ id: `msg_${id}`, conversaId: 'conversa-1' }) });
  expect(receber).toHaveBeenCalledTimes(1);
  socket.desconectar();
  expect(unsubscribe).toHaveBeenCalled();
});
