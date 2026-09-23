import { buscarFuncionario, listarPedidosPagina, listarProdutosPagina, requisicao } from './api';

beforeEach(() => { localStorage.clear(); global.fetch = jest.fn(); });
function resposta(body: unknown, status = 200) {
  return { ok: status < 400, status, statusText: 'Error', headers: { get: () => 'application/json' }, json: async () => body };
}

test('preserva código e detalhes de erro padronizado do backend', async () => {
  (fetch as jest.Mock).mockResolvedValue(resposta({ errorCode: 'TRANSICAO_STATUS_INVALIDA', message: 'Pedido já foi coletado.', details: { status: 'Inválido' } }, 409));
  await expect(requisicao('/pedidos/p1/status')).rejects.toMatchObject({ status: 409, codigo: 'TRANSICAO_STATUS_INVALIDA', errosCampos: { status: 'Inválido' } });
});
test('envia filtros e mantém metadados de paginação de produtos', async () => {
  (fetch as jest.Mock).mockResolvedValue(resposta({ content: [], totalPages: 6, totalElements: 101, number: 5 }));
  expect(await listarProdutosPagina(5, 'Pão & queijo', 'Lanches')).toMatchObject({ totalPages: 6, totalElements: 101 });
  const url = new URL((fetch as jest.Mock).mock.calls[0][0]);
  expect(url.searchParams.get('nome')).toBe('Pão & queijo');
  expect(url.searchParams.get('page')).toBe('5');
});
test('filtra pedidos cancelados no servidor', async () => {
  (fetch as jest.Mock).mockResolvedValue(resposta({ content: [], totalPages: 0 }));
  await listarPedidosPagina(2, 'CANCELADO');
  expect((fetch as jest.Mock).mock.calls[0][0]).toContain('status=CANCELADO');
});
test('localiza funcionário em página posterior sem truncar a equipe', async () => {
  (fetch as jest.Mock).mockResolvedValueOnce(resposta({ content: [{ id: 'outro' }], totalPages: 2 }))
    .mockResolvedValueOnce(resposta({ content: [{ id: 'alvo', nomeCompleto: 'Ana' }], totalPages: 2 }));
  expect(await buscarFuncionario('alvo')).toMatchObject({ nomeCompleto: 'Ana' });
  expect(fetch).toHaveBeenCalledTimes(2);
});
test('sucesso sem corpo não causa erro JSON', async () => {
  (fetch as jest.Mock).mockResolvedValue({ ok: true, status: 204 });
  await expect(requisicao('/qualquer')).resolves.toBeUndefined();
});
