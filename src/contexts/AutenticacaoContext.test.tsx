import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProvedorAutenticacao } from './AutenticacaoContext';
import { useAutenticacao } from '../hooks/useAutenticacao';
import { buscarUsuario, login } from '../services/api';
import RotaProtegida from '../components/compartilhados/RotaProtegida';

jest.mock('react-router-dom', () => ({ Navigate: () => <p>Faça login</p> }));
jest.mock('../services/api', () => ({ buscarUsuario: jest.fn(), login: jest.fn() }));
const perfil = (papel: string, cargo: string | null = null) => ({ id: 'u-1', nome: 'Dono', email: 'dono@exemplo.local', telefone: '11988887777', papel, cargo });
function Fluxo() {
  const { entrar, atualizarPerfil, carregando } = useAutenticacao();
  if (carregando) return <p>Carregando</p>;
  return <>
    <button onClick={() => void entrar('dono@exemplo.local', 'senha')}>Entrar</button>
    <button onClick={() => void atualizarPerfil('u-1')}>Loja criada</button>
    <RotaProtegida somenteDono cargosPermitidos={['administrador']}><p>Configurações disponíveis</p></RotaProtegida>
  </>;
}
beforeEach(() => { localStorage.clear(); jest.resetAllMocks(); });
async function preparar(papel: string, cargo: string | null = null) {
  localStorage.setItem('@nhac:token', 'token-teste');
  localStorage.setItem('@nhac:usuario', JSON.stringify({ id: 'u-1', papel, cargo: 'administrador' }));
  (buscarUsuario as jest.Mock).mockResolvedValue(perfil(papel, cargo));
  render(<ProvedorAutenticacao><Fluxo /></ProvedorAutenticacao>);
  await screen.findByRole('button', { name: 'Loja criada' });
}
test('após criar loja consulta papel do servidor e libera configurações sem novo login', async () => {
  await preparar('CLIENTE');
  expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
  (buscarUsuario as jest.Mock).mockResolvedValue(perfil('LOJISTA'));
  fireEvent.click(screen.getByRole('button', { name: 'Loja criada' }));
  await screen.findByText('Configurações disponíveis');
  expect(JSON.parse(localStorage.getItem('@nhac:usuario') || '{}')).toMatchObject({ papel: 'LOJISTA', cargo: 'administrador' });
});
test('funcionário administrador continua sem acesso às configurações do dono', async () => {
  await preparar('FUNCIONARIO', 'administrador');
  fireEvent.click(screen.getByRole('button', { name: 'Loja criada' }));
  await waitFor(() => expect(buscarUsuario).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('Configurações disponíveis')).not.toBeInTheDocument();
  expect(screen.getByText('Acesso Negado')).toBeInTheDocument();
});
test('login usa papel atual do perfil mesmo se resposta de login estiver desatualizada', async () => {
  await preparar('CLIENTE');
  (login as jest.Mock).mockResolvedValue({ usuarioId: 'u-1', nome: 'Dono', papel: 'CLIENTE', accessToken: 'novo-token' });
  (buscarUsuario as jest.Mock).mockResolvedValue(perfil('LOJISTA'));
  fireEvent.click(screen.getByRole('button', { name: 'Entrar' }));
  await screen.findByText('Configurações disponíveis');
});
