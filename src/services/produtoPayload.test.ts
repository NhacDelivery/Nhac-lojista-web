import { atualizarProduto } from './api';

test('PUT envia isAtivo conforme o contrato do backend', async () => {
  const fetchAnterior = global.fetch;
  const requisicoes: RequestInit[] = [];
  global.fetch = jest.fn(async (_url: RequestInfo | URL, options?: RequestInit) => {
    requisicoes.push(options!);
    return { ok: true, status: 200, headers: { get: () => null } } as unknown as Response;
  });
  try {
    await atualizarProduto('produto-1', {
      nome: 'Lanche', descricao: '', preco: 12, categoriaMenu: 'Lanches',
      ativo: false, adicionais: [],
    });
    const payload = JSON.parse(String(requisicoes[0].body));
    expect(payload.isAtivo).toBe(false);
    expect(payload).not.toHaveProperty('ativo');
    expect(payload.adicionais).toEqual([]);
  } finally {
    global.fetch = fetchAnterior;
  }
});
