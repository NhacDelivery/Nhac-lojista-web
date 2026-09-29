import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaginaChat from './PaginaChat';
import { conectarChatSocket } from '../../services/chatSocket';
import { listarConversas, listarMensagens, marcarConversaComoLida } from '../../services/api';

jest.mock('../../components/layout/LayoutPagina', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../../components/ui/Avatar', () => () => <span>Avatar</span>);
jest.mock('../../contexts/ToastContext', () => ({ useToast: () => ({ mostrarToast: jest.fn() }) }));
jest.mock('../../services/api', () => ({
  listarConversas: jest.fn(),
  listarMensagens: jest.fn(),
  marcarConversaComoLida: jest.fn(),
}));
jest.mock('../../services/chatSocket', () => ({ conectarChatSocket: jest.fn() }));

test('mantém o texto até receber a confirmação do mesmo ID', async () => {
  (listarConversas as jest.Mock).mockResolvedValue([{
    id: 'conversa-1', clienteNome: 'Cliente', ultimaMensagemEm: new Date().toISOString(), naoLidas: 0,
  }]);
  (listarMensagens as jest.Mock).mockResolvedValue([]);
  (marcarConversaComoLida as jest.Mock).mockResolvedValue(undefined);
  Object.defineProperty(global, 'crypto', {
    configurable: true, value: { randomUUID: () => '12345678-1234-4234-8234-123456789abc' },
  });
  let receber: (mensagem: any) => void = () => {};
  const enviarMensagem = jest.fn((_conversa: string, _texto: string, _id: string) => true);
  (conectarChatSocket as jest.Mock).mockReturnValue({
    aoConectar: jest.fn(), aoErro: jest.fn(),
    assinarConversa: jest.fn((_id, callback) => { receber = callback; return jest.fn(); }),
    enviarMensagem, desconectar: jest.fn(),
  });

  render(<PaginaChat />);
  fireEvent.click(await screen.findByText('Cliente'));
  const campo = await screen.findByPlaceholderText('Digite sua mensagem...') as HTMLInputElement;
  fireEvent.change(campo, { target: { value: 'Pedido pronto' } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(campo.value).toBe('Pedido pronto');
  expect(screen.getByText('Aguardando confirmação da mensagem...')).toBeTruthy();
  const id = enviarMensagem.mock.calls[0][2];

  act(() => receber({ id: `msg_${id}`, conversaId: 'conversa-1', conteudo: 'Pedido pronto',
    enviadaEm: new Date().toISOString(), remetenteTipo: 'LOJA' }));
  await waitFor(() => expect(campo.value).toBe(''));
  expect(screen.queryByText('Aguardando confirmação da mensagem...')).toBeNull();
});
