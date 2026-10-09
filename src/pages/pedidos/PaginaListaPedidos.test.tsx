import '@testing-library/jest-dom';
import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import PaginaListaPedidos from './PaginaListaPedidos';
import { listarPedidosPagina } from '../../services/api';

jest.mock('react-router-dom', () => ({ useNavigate: () => jest.fn() }), { virtual: true });
jest.mock('../../components/layout/LayoutPagina', () => ({ children }: { children: React.ReactNode }) => <div>{children}</div>);
jest.mock('../../services/api', () => ({ listarPedidosPagina: jest.fn() }));
const resposta = { content: [{ id: 'pedido-123', clienteNome: 'Ana', status: 'PAGO', quantidadeItens: 1, valorTotal: 15, criadoEm: '2026-10-09T12:00:00Z' }], totalPages: 1, totalElements: 1 };
const consultar = listarPedidosPagina as jest.Mock;
beforeEach(() => { jest.useFakeTimers(); consultar.mockReset(); });
afterEach(() => { jest.useRealTimers(); });
async function avancar(ms = 0) {
  await act(async () => { jest.advanceTimersByTime(ms); await Promise.resolve(); });
}
test('poll não substitui a consulta inicial lenta e as contagens são sequenciais', async () => {
  let concluir: (valor: any) => void = () => {};
  consultar.mockImplementationOnce(() => new Promise(resolve => { concluir = resolve; }));
  consultar.mockResolvedValue(resposta);
  render(<PaginaListaPedidos />); await avancar();
  expect(consultar).toHaveBeenCalledTimes(1);
  await avancar(30000); expect(consultar).toHaveBeenCalledTimes(1);
  expect(screen.getByText('Carregando pedidos...')).toBeInTheDocument();
  await act(async () => { concluir(resposta); });
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.queryByText('Carregando pedidos...')).not.toBeInTheDocument();
  expect(consultar).toHaveBeenCalledTimes(6);
});
test('falha silenciosa preserva os pedidos e retry recupera a atualização', async () => {
  consultar.mockResolvedValue(resposta);
  render(<PaginaListaPedidos />); await avancar();
  expect(screen.getByText('Ana')).toBeInTheDocument();
  consultar.mockRejectedValueOnce(new Error('Rede indisponível'));
  await avancar(10000);
  expect(screen.getByText('Ana')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent('Os pedidos anteriores foram preservados');
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' })); await avancar();
  expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  expect(screen.getByText('Ana')).toBeInTheDocument();
});
