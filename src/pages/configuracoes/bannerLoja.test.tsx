import React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import PaginaCadastro from '../autenticacao/PaginaCadastro';
import PaginaEditarBannerLoja from './PaginaEditarBannerLoja';
import { atualizarBannerLoja, buscarCep, criarLoja, enviarImagem } from '../../services/api';

jest.mock('react-router-dom', () => ({
  useNavigate: () => jest.fn(),
  Link: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));
jest.mock('../../components/layout/LayoutPagina', () =>
  ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
);
jest.mock('../../hooks/useAutenticacao', () => ({
  useAutenticacao: () => ({ usuario: { id: 'usuario-1' }, atualizarPerfil: jest.fn() }),
}));
jest.mock('../../contexts/LojaContext', () => ({
  useLoja: () => ({
    loja: { id: 'loja-1', bannerUrl: 'https://example.com/anterior.png' },
    recarregar: jest.fn(),
  }),
}));
jest.mock('../../contexts/ToastContext', () => ({
  useToast: () => ({ mostrarToast: jest.fn() }),
}));
jest.mock('../../services/api', () => ({
  atualizarBannerLoja: jest.fn(),
  buscarCep: jest.fn(),
  criarLoja: jest.fn(),
  enviarImagem: jest.fn(),
}));

const logo = new File(['logo'], 'logo.png', { type: 'image/png' });
const banner = new File(['banner'], 'banner.png', { type: 'image/png' });
const novaUrl = 'https://example.com/banner.png';

beforeAll(() => {
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: () => 'blob:previa' });
  Object.defineProperty(URL, 'revokeObjectURL', { configurable: true, value: () => undefined });
});

afterAll(() => {
  Reflect.deleteProperty(URL, 'createObjectURL');
  Reflect.deleteProperty(URL, 'revokeObjectURL');
});

beforeEach(() => jest.spyOn(window, 'scrollTo').mockImplementation(() => {}));
afterEach(() => jest.restoreAllMocks());

test.each([true, false])('cadastro envia logo e banner separadamente quando selecionado (%s)', async (comBanner) => {
  const urlLogo = 'https://example.com/logo.png';
  jest.mocked(enviarImagem).mockResolvedValueOnce(urlLogo).mockResolvedValueOnce(novaUrl);
  jest.mocked(buscarCep).mockResolvedValue({
    logradouro: 'Rua das Flores', bairro: 'Centro', localidade: 'São Paulo',
    uf: 'SP', complemento: '', cep: '01001000',
  });
  jest.mocked(criarLoja).mockResolvedValue({ id: 'loja-1' });
  render(<PaginaCadastro modo="apenas-loja" />);

  const preencher = (rotulo: string | RegExp, value: string) =>
    fireEvent.change(screen.getByLabelText(rotulo), { target: { value } });
  const continuar = () => fireEvent.click(screen.getByRole('button', { name: 'Continuar' }));
  fireEvent.change(screen.getByLabelText('Logo da Loja'), { target: { files: [logo] } });
  if (comBanner) {
    fireEvent.change(screen.getByLabelText('Banner da loja (opcional)'), { target: { files: [banner] } });
    expect(screen.getByAltText('Prévia do banner da loja')).toBeInTheDocument();
  }
  expect(enviarImagem).not.toHaveBeenCalled();

  preencher(/Nome da Loja/, 'Loja Teste');
  preencher(/CPF do responsável/, '52998224725');
  preencher(/Categoria Principal/, 'Lanches');
  fireEvent.change(screen.getByPlaceholderText(/Fale um pouco/), { target: { value: 'Lanches artesanais.' } });
  continuar();
  preencher(/CEP/, '01001000');
  await waitFor(() => expect(screen.getByLabelText(/Rua/)).toHaveValue('Rua das Flores'));
  preencher(/Número/, '12');
  continuar();
  continuar();
  continuar();
  fireEvent.click(screen.getByText('Dinheiro'));
  continuar();
  fireEvent.click(screen.getByRole('button', { name: 'Confirmar e Finalizar' }));

  await waitFor(() => expect(criarLoja).toHaveBeenCalledWith(
    expect.objectContaining({ imagemUrl: urlLogo, bannerUrl: comBanner ? novaUrl : undefined }),
  ));
  expect(jest.mocked(enviarImagem).mock.calls).toEqual(
    comBanner ? [[logo, 'lojas'], [banner, 'lojas']] : [[logo, 'lojas']],
  );
});

test('troca o banner e reaproveita o upload após falha ao salvar', async () => {
  jest.mocked(enviarImagem).mockResolvedValue(novaUrl);
  jest.mocked(atualizarBannerLoja)
    .mockRejectedValueOnce(new Error('Não foi possível salvar.'))
    .mockResolvedValueOnce({ id: 'loja-1', bannerUrl: novaUrl } as Awaited<ReturnType<typeof atualizarBannerLoja>>);
  render(<PaginaEditarBannerLoja />);

  expect(screen.getByAltText('Prévia do banner da loja')).toHaveAttribute('src', 'https://example.com/anterior.png');
  const salvar = screen.getByRole('button', { name: 'Salvar banner' });
  expect(salvar).toBeDisabled();
  fireEvent.change(screen.getByLabelText('Banner da loja'), { target: { files: [banner] } });
  expect(enviarImagem).not.toHaveBeenCalled();
  fireEvent.click(salvar);
  await screen.findByRole('alert');
  fireEvent.click(salvar);

  await waitFor(() => expect(atualizarBannerLoja).toHaveBeenCalledTimes(2));
  expect(atualizarBannerLoja).toHaveBeenLastCalledWith('loja-1', novaUrl);
  expect(enviarImagem).toHaveBeenCalledTimes(1);
});
