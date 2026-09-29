import {
  podeCancelar,
  podeTransicionarComoLojista,
  proximoStatusPermitidoParaLojista,
} from './statusPedido';

describe('transições do lojista', () => {
  it('permite confirmar pagamento e iniciar preparo', () => {
    expect(proximoStatusPermitidoParaLojista('PENDENTE')).toBe('PAGO');
    expect(proximoStatusPermitidoParaLojista('PAGO')).toBe('PREPARANDO');
  });

  it('não permite que o lojista faça coleta ou conclusão da entrega', () => {
    expect(proximoStatusPermitidoParaLojista('PREPARANDO')).toBeNull();
    expect(proximoStatusPermitidoParaLojista('SAIU_ENTREGA')).toBeNull();
    expect(podeTransicionarComoLojista('PREPARANDO', 'SAIU_ENTREGA')).toBe(false);
    expect(podeTransicionarComoLojista('SAIU_ENTREGA', 'ENTREGUE')).toBe(false);
  });

  it('bloqueia cancelamento depois do pagamento enquanto não há estorno', () => {
    expect(podeCancelar('PENDENTE')).toBe(true);
    expect(podeCancelar('PAGO')).toBe(false);
    expect(podeCancelar('PREPARANDO')).toBe(false);
  });
});
