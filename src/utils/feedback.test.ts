import { ApiError, tratarErroApi } from './errosApi';
import { descreverAviso, mensagemCampo } from './feedback';

describe('avisos dos fluxos do lojista', () => {
  test.each([
    [400, 'Este telefone já está em uso.', 'Telefone já utilizado'],
    [400, 'Este e-mail já está em uso.', 'E-mail já cadastrado'],
    [400, 'E-mail não verificado. Confirme seu e-mail.', 'Confirme seu e-mail'],
    [400, 'Código de verificação expirado.', 'O código expirou'],
    [400, 'Código de verificação inválido.', 'Confira o código'],
    [401, 'E-mail não encontrado ou senha inválida.', 'Não conseguimos entrar'],
    [401, 'Sessão expirada.', 'Entre novamente na sua conta'],
    [403, 'Acesso negado.', 'Você não tem acesso a esta ação'],
    [404, 'Produto não encontrado.', 'Não encontramos esse registro'],
    [409, 'Transição de status inválida.', 'Os dados mudaram'],
    [413, 'Arquivo muito grande.', 'A imagem ultrapassa o limite'],
    [415, 'Formato inválido.', 'Escolha uma imagem compatível'],
    [429, 'Muitas tentativas.', 'Aguarde para tentar novamente'],
    [503, 'Temporariamente indisponível.', 'O serviço está indisponível'],
    [500, 'SQL exception com conteúdo privado', 'Não conseguimos concluir agora'],
  ])('%s %s tem explicação e recuperação', (status, message, titulo) => {
    const aviso = descreverAviso(new ApiError({ status, message }));
    expect(aviso.titulo).toBe(titulo);
    expect(aviso.orientacao).toBeTruthy();
    expect(aviso.mensagem).not.toMatch(/SQL|exception|HTTP|Erro 400/);
  });
  test('telefone duplicado indica campo e login sem sugerir sessão expirada', () => {
    const erro = tratarErroApi(new ApiError({ status: 400, message: 'Este telefone já está em uso.' }));
    expect(erro.errosCampos?.telefone).toContain('outro número');
    expect(erro.aviso?.sugerirLogin).toBe(true);
    expect(erro.sessaoExpirada).toBeUndefined();
  });
  test('validação de todos os campos fica em português', () => {
    const aviso = descreverAviso(new ApiError({ status: 400, message: 'Campos inválidos', details: { nome: 'must not be blank', email: 'must be a well-formed email address', preco: 'must be greater than or equal to 0' } }));
    expect(aviso.campos).toEqual({ nome: 'Preencha este campo.', email: 'Informe um e-mail válido, como nome@exemplo.com.', preco: 'Informe um valor maior ou igual a 0.' });
    expect(mensagemCampo('size must be between 3 and 120')).toBe('Use entre 3 e 120 caracteres.');
  });
  test('timeout não afirma que a gravação falhou e orienta conferir o resultado', () => {
    const aviso = descreverAviso(new ApiError({ status: 0, error: 'TEMPO_LIMITE', message: 'Tempo esgotado' }));
    expect(aviso.titulo).toBe('A resposta está demorando');
    expect(aviso.orientacao).toContain('antes de enviar novamente');
  });
  test('falha de rede não expõe a mensagem técnica do navegador', () => {
    const aviso = descreverAviso(new TypeError('Failed to fetch'));
    expect(aviso.titulo).toBe('Não conseguimos conectar');
    expect(aviso.mensagem).not.toContain('fetch');
  });
});
