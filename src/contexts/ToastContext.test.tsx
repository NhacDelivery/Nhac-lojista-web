import '@testing-library/jest-dom';
import React from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ProvedorToast, useToast } from './ToastContext';
function Acoes() {
  const { mostrarToast } = useToast();
  return <><button onClick={() => mostrarToast('Produto salvo.')}>Salvar</button><button onClick={() => mostrarToast('Não foi possível conectar.', { tipo: 'erro' })}>Falhar</button></>;
}
beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());
test('sucesso anterior não fecha uma falha nova; falha exige fechar', () => {
  render(<ProvedorToast><Acoes /></ProvedorToast>);
  fireEvent.click(screen.getByText('Salvar'));
  act(() => jest.advanceTimersByTime(5000));
  fireEvent.click(screen.getByText('Falhar'));
  act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByText('Não conseguimos conectar')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Fechar aviso' }));
  expect(screen.queryByText('Não conseguimos conectar')).not.toBeInTheDocument();
});
test('sucesso usa status educado e pausa enquanto o botão está focado', () => {
  render(<ProvedorToast><Acoes /></ProvedorToast>);
  fireEvent.click(screen.getByText('Salvar'));
  const fechar = screen.getByRole('button', { name: 'Fechar aviso' });
  fireEvent.focus(fechar);
  act(() => jest.advanceTimersByTime(10000));
  expect(screen.getByRole('status')).toHaveTextContent('Produto salvo.');
  fireEvent.blur(fechar);
  act(() => jest.advanceTimersByTime(6000));
  expect(screen.queryByRole('status')).not.toBeInTheDocument();
});
