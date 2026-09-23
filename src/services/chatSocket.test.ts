import { Client } from '@stomp/stompjs';
import { conectarChatSocket } from './chatSocket';

jest.mock('@stomp/stompjs', () => ({ Client: jest.fn() }));
beforeEach(() => {
  (Client as unknown as jest.Mock).mockImplementation(() => ({
    connected: false, activate: jest.fn(), deactivate: jest.fn(), publish: jest.fn(),
    subscribe: jest.fn(() => ({ unsubscribe: jest.fn() })),
  }));
});
jest.mock('sockjs-client', () => jest.fn());
const cliente = () => (Client as unknown as jest.Mock).mock.results.slice(-1)[0].value;

test('adia assinatura até conectar e restaura depois de reconectar', () => {
  const socket = conectarChatSocket(); const c = cliente();
  const remover = socket.assinarConversa('c1', jest.fn());
  expect(c.subscribe).not.toHaveBeenCalled();
  c.connected = true; c.onConnect();
  expect(c.subscribe).toHaveBeenCalledTimes(1);
  c.connected = false; c.onWebSocketClose();
  c.connected = true; c.onConnect();
  expect(c.subscribe).toHaveBeenCalledTimes(2);
  remover(); c.onConnect();
  expect(c.subscribe).toHaveBeenCalledTimes(2);
  socket.desconectar();
});
test('não publica offline nem depois de desmontar', () => {
  const socket = conectarChatSocket(); const c = cliente();
  expect(socket.enviarMensagem('c1', 'oi')).toBe(false);
  c.connected = true;
  expect(socket.enviarMensagem('c1', 'oi')).toBe(true);
  socket.desconectar();
  expect(socket.enviarMensagem('c1', 'oi')).toBe(false);
  expect(c.publish).toHaveBeenCalledTimes(1);
});
