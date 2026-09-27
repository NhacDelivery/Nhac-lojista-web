import { atualizarLocalizacaoLoja } from './api';

test('envia endereço e coordenadas no mesmo PATCH', async () => {
  const originalFetch = global.fetch;
  const requisicoes: Array<[string, RequestInit]> = [];
  global.fetch = jest.fn(async (url: RequestInfo | URL, options?: RequestInit) => {
    requisicoes.push([String(url), options!]);
    return { ok: true, status: 200, headers: { get: () => null } } as unknown as Response;
  });
  try {
    const endereco = {
      cep: '06000000', rua: 'Rua Nova', numero: '45', bairro: 'Centro',
      cidade: 'Osasco', estado: 'SP', complemento: 'Loja B',
    };
    await atualizarLocalizacaoLoja('loja-1', -23.53, -46.79, endereco);
    expect(requisicoes).toHaveLength(1);
    expect(requisicoes[0][0]).toMatch(/\/lojas\/loja-1\/localizacao$/);
    expect(requisicoes[0][1].method).toBe('PATCH');
    expect(JSON.parse(String(requisicoes[0][1].body))).toEqual({
      latitude: -23.53, longitude: -46.79, endereco,
    });
  } finally {
    global.fetch = originalFetch;
  }
});
