import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import AvisoFormulario from './AvisoFormulario';
import { descreverAviso } from '../../utils/feedback';
import { ApiError } from '../../utils/errosApi';

test('telefone duplicado anuncia o erro e oferece correção, login e recuperação', () => {
  const corrigir = jest.fn();
  render(<AvisoFormulario aviso={descreverAviso(new ApiError({ status: 400, message: 'Este telefone já está em uso.' }))} aoCorrigirCampo={corrigir} />);
  expect(screen.getByRole('alert')).toHaveAccessibleName('Telefone já utilizado');
  fireEvent.click(screen.getByRole('button', { name: /telefone/i }));
  expect(corrigir).toHaveBeenCalledWith('telefone');
  expect(screen.getByRole('link', { name: 'Fazer login' })).toHaveAttribute('href', '/login');
  expect(screen.getByRole('link', { name: 'Recuperar senha' })).toHaveAttribute('href', '/recuperar-senha');
});
test('referência fica acessível sem mostrar o erro interno', () => {
  render(<AvisoFormulario aviso={descreverAviso(new ApiError({ status: 500, message: 'SQL senha=segredo', requestId: 'req-123' }))} focar />);
  expect(screen.queryByText(/SQL|segredo/)).not.toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveFocus();
  expect(screen.getByText('req-123')).toBeInTheDocument();
});
