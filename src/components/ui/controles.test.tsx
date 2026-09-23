import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InputTexto from './InputTexto';
import ModalConfirmacao from './ModalConfirmacao';
import Toggle from './Toggle';

test('campo associa label e erro e permite mostrar senha', () => {
  render(<InputTexto rotulo="Senha" tipo="password" valor="Segredo123" aoMudar={() => {}} erro="Confira a senha" />);
  const campo = screen.getByLabelText('Senha');
  expect(campo).toHaveAttribute('type', 'password');
  expect(campo).toHaveAttribute('aria-invalid', 'true');
  expect(document.getElementById(campo.getAttribute('aria-describedby')!)).toHaveTextContent('Confira a senha');
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }));
  expect(campo).toHaveAttribute('type', 'text');
});
test('busca pode ser limpa e mantém foco no campo', () => {
  const mudar = jest.fn();
  render(<InputTexto rotulo="Busca" type="search" valor="Pizza" aoMudar={mudar} />);
  fireEvent.click(screen.getByRole('button', { name: 'Limpar busca' }));
  expect(mudar).toHaveBeenCalledWith('');
  expect(screen.getByLabelText('Busca')).toHaveFocus();
});
test('toggle desabilitado não altera estado', () => {
  const mudar = jest.fn();
  render(<Toggle ativo={true} aoMudar={mudar} rotulo="Loja aberta" desabilitado />);
  fireEvent.click(screen.getByRole('switch', { name: 'Loja aberta' }));
  expect(mudar).not.toHaveBeenCalled();
});
test('confirmação aguarda conclusão e não repete ação', async () => {
  HTMLDialogElement.prototype.showModal = function () { this.setAttribute('open', ''); };
  HTMLDialogElement.prototype.close = function () { this.removeAttribute('open'); };
  let terminar!: () => void;
  const confirmar = jest.fn(() => new Promise<void>(resolve => { terminar = resolve; }));
  render(<ModalConfirmacao aberto titulo="Desativar" mensagem="Confirme a operação" aoConfirmar={confirmar} aoCancelar={() => {}} />);
  const botao = screen.getByTestId('confirmation-submit');
  fireEvent.click(botao); fireEvent.click(botao);
  expect(confirmar).toHaveBeenCalledTimes(1);
  expect(botao).toBeDisabled();
  terminar();
  await waitFor(() => expect(botao).toBeEnabled());
});
