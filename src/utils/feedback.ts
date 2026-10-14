export type TomAviso = 'erro' | 'aviso' | 'info' | 'sucesso';
export interface AvisoModelo {
  titulo: string;
  mensagem: string;
  orientacao?: string;
  tom: TomAviso;
  campos?: Record<string, string>;
  sugerirLogin?: boolean;
  requestId?: string;
}

const rotulos: Record<string, string> = {
  nomeLoja: 'Nome da loja', descricaoLoja: 'Descrição da loja', categoriaLoja: 'Categoria principal', termos: 'Termos de uso', pagamentos: 'Formas de pagamento',
  cpfResponsavel: 'CPF do responsável', cpf: 'CPF', cpfCnpj: 'CPF/CNPJ', nome: 'Nome', nomeCompleto: 'Nome completo', email: 'E-mail', telefone: 'Telefone',
  senha: 'Senha', senhaAtual: 'Senha atual', confirmarSenha: 'Confirmação da senha',
  codigo: 'Código de verificação', codigoTelefone: 'Código recebido por SMS',
  preco: 'Preço', estoque: 'Estoque', categoria: 'Categoria', descricao: 'Descrição',
  imagemUrl: 'Imagem', cep: 'CEP', rua: 'Rua', numero: 'Número', bairro: 'Bairro',
  cidade: 'Cidade', estado: 'Estado', uf: 'Estado', cargo: 'Cargo',
  tempoEntregaMin: 'Tempo mínimo de entrega', tempoEntregaMax: 'Tempo máximo de entrega',
  raioEntregaKm: 'Raio de entrega', taxaEntregaBase: 'Taxa de entrega', adicionais: 'Adicionais',
};
export function rotuloCampo(campo: string): string {
  return rotulos[campo] || rotulos[campo.split('.').pop() || ''] || 'Campo informado';
}
export function mensagemCampo(mensagem: unknown): string {
  if (typeof mensagem !== 'string') return 'Revise o valor informado.';
  if (/must not be (blank|null|empty)|não pode estar (vazio|em branco)|obrigatór/i.test(mensagem)) return 'Preencha este campo.';
  if (/well-formed email|endereço de e-mail.*válido/i.test(mensagem)) return 'Informe um e-mail válido, como nome@exemplo.com.';
  const tamanho = mensagem.match(/size must be between (\d+) and (\d+)/i);
  if (tamanho) return `Use entre ${tamanho[1]} e ${tamanho[2]} caracteres.`;
  const limite = mensagem.match(/must be (greater|less) than( or equal to)? (-?[\d.]+)/i);
  if (limite) return `Informe um valor ${limite[1] === 'greater' ? 'maior' : 'menor'}${limite[2] ? ' ou igual' : ''} a ${limite[3]}.`;
  if (/Failed to convert|java\.|jakarta\./i.test(mensagem)) return 'Confira o formato deste campo.';
  return mensagem;
}

/** Traduz falhas conhecidas sem expor corpo HTTP, SQL, credenciais ou stack traces. */
export function descreverAviso(erro: unknown): AvisoModelo {
  const e = erro && typeof erro === 'object' ? erro as Record<string, unknown> : {};
  const status = typeof e.status === 'number' ? e.status : undefined;
  const codigo = String(e.codigo || e.error || '');
  const texto = typeof erro === 'string' ? erro : String(e.mensagem || e.message || '');
  const m = texto.toLowerCase();
  const id = typeof e.requestId === 'string' && /^[a-zA-Z0-9-]{1,80}$/.test(e.requestId) ? e.requestId : undefined;
  const camposBrutos = e.errosCampos || e.details;
  const campos = camposBrutos && typeof camposBrutos === 'object'
    ? Object.fromEntries(Object.entries(camposBrutos).map(([campo, msg]) => [campo, mensagemCampo(msg)])) : undefined;
  const base: AvisoModelo = { titulo: 'Não foi possível concluir', mensagem: 'Confira as informações e tente novamente.', tom: 'erro', requestId: id };
  if (codigo === 'TEMPO_LIMITE' || /demorou demais|tempo.*limite|timeout|confirmação a tempo/i.test(texto)) return {
    ...base, titulo: 'A resposta está demorando', mensagem: 'Não recebemos a confirmação a tempo.',
    orientacao: 'Confira se a alteração apareceu antes de enviar novamente. Se necessário, atualize os dados.', tom: 'aviso',
  };
  if (codigo === 'REDE_INDISPONIVEL' || /failed to fetch|network|sem conexão|conectar|conexão|internet/i.test(texto)) return {
    ...base, titulo: 'Não conseguimos conectar', mensagem: 'A comunicação com o Nhac foi interrompida.',
    orientacao: 'Verifique sua conexão e tente novamente. O preenchimento continua nesta tela.',
  };
  if (status === 429 || /muitas tentativas|aguarde.*reenviar/i.test(texto)) return {
    ...base, titulo: 'Aguarde para tentar novamente', mensagem: 'Foram feitas várias tentativas em pouco tempo.',
    orientacao: 'Espere o contador terminar antes de enviar outro código ou tentar entrar.', tom: 'aviso',
  };
  if (/cpf/i.test(texto) && /já está em uso|já (?:está )?cadastrad/i.test(texto)) return {
    ...base, titulo: 'CPF já utilizado', mensagem: 'Esse CPF já está vinculado a outra conta do Nhac.',
    orientacao: 'Confira o CPF do responsável antes de tentar novamente.',
    campos: { cpfResponsavel: 'Informe o CPF do responsável por esta conta.' },
  };
  if ((/já está em uso|já (?:está )?cadastrad|já existe/i.test(texto)) && /telefone|e-mail|email/i.test(texto)) {
    const telefone = m.includes('telefone');
    return { ...base, titulo: telefone ? 'Telefone já utilizado' : 'E-mail já cadastrado',
      mensagem: telefone ? 'Esse número já está vinculado a uma conta do Nhac.' : 'Já existe uma conta do Nhac com esse e-mail.',
      orientacao: 'Se a conta é sua, faça login ou recupere a senha. Para criar outra conta, informe outro dado.',
      campos: { [telefone ? 'telefone' : 'email']: telefone ? 'Informe outro número ou entre na conta existente.' : 'Use outro e-mail ou entre na conta existente.' },
      sugerirLogin: true, tom: 'aviso' };
  }
  if (/e-mail não verificado|verifique seu e-mail|confirme seu e-mail/i.test(texto)) return {
    ...base, titulo: 'Confirme seu e-mail', mensagem: 'A confirmação do e-mail precisa estar válida para concluir o cadastro.',
    orientacao: 'Volte à etapa de verificação. Se o código expirou, solicite outro.', tom: 'aviso',
  };
  if (/código|codigo/i.test(texto)) return {
    ...base, titulo: /expirad/i.test(texto) ? 'O código expirou' : 'Confira o código',
    mensagem: /expirad/i.test(texto) ? 'Esse código não pode mais ser utilizado.' : 'Não conseguimos validar o código informado.',
    orientacao: /expirad/i.test(texto) ? 'Solicite um novo código e use o mais recente.' : 'Confira os números recebidos. Ao reenviar, use apenas o novo código.',
  };
  if (codigo === 'CREDENCIAIS_INVALIDAS' || /e-mail ou senha inválidos|e-mail não encontrado|senha inválida|senha atual/i.test(texto)) return {
    ...base, titulo: /senha atual/i.test(texto) ? 'Confira sua senha atual' : 'Não conseguimos entrar',
    mensagem: /senha atual/i.test(texto) ? 'A senha atual informada não foi aceita.' : 'E-mail ou senha não conferem.',
    orientacao: 'Confira o preenchimento ou use a recuperação de senha.',
  };
  if (status === 401 || /sessão expirada|sessão inválida/i.test(texto)) return {
    ...base, titulo: 'Entre novamente na sua conta', mensagem: 'Sua sessão precisa ser renovada.',
    orientacao: 'Faça login para continuar.', sugerirLogin: true, tom: 'aviso',
  };
  if (status === 403 || /permissão|acesso negado|apenas.*dono/i.test(texto)) return {
    ...base, titulo: 'Você não tem acesso a esta ação', mensagem: 'Seu perfil não permite fazer essa alteração.',
    orientacao: 'Peça ao responsável pela loja para revisar seu acesso. Não é necessário repetir a tentativa.', tom: 'aviso',
  };
  if (status === 413 || /5 mb|5mb|arquivo.*grande|tamanho.*imagem/i.test(texto)) return {
    ...base, titulo: 'A imagem ultrapassa o limite', mensagem: 'Escolha uma imagem de até 5 MB.',
    orientacao: 'Reduza o arquivo e selecione uma imagem JPG, PNG ou WEBP.', campos: { imagemUrl: 'Use uma imagem de até 5 MB.' },
  };
  if (status === 415 || /formato.*(imagem|arquivo)|jpg|png|webp/i.test(texto)) return {
    ...base, titulo: 'Escolha uma imagem compatível', mensagem: 'Esse arquivo não pode ser utilizado como imagem.',
    orientacao: 'Selecione um arquivo JPG, PNG ou WEBP.',
  };
  if (status === 409 || /transição|transicao|pedido.*(preparo|cancel)|conflito|já.*(coletad|entregue)/i.test(texto)) return {
    ...base, titulo: 'Os dados mudaram', mensagem: 'Essa ação não pode ser feita com o estado atual do registro.',
    orientacao: 'Atualize os dados e confira as ações disponíveis antes de continuar.', tom: 'aviso',
  };
  if (status === 404 || /não encontrad/i.test(texto)) return {
    ...base, titulo: 'Não encontramos esse registro', mensagem: 'Ele pode ter sido alterado ou não estar mais disponível.',
    orientacao: 'Volte à lista e atualize os dados.', tom: 'aviso',
  };
  if (status === 503 || /temporariamente indisponível/i.test(texto)) return {
    ...base, titulo: 'O serviço está indisponível', mensagem: 'O Nhac não conseguiu atender essa solicitação agora.',
    orientacao: 'Aguarde um pouco antes de tentar novamente.',
  };
  if ((status !== undefined && status >= 500) || /erro interno|erro \d{3}|SQL|Exception|stack|<html|java\./i.test(texto)) return {
    ...base, titulo: 'Não conseguimos concluir agora', mensagem: 'Ocorreu um problema ao processar sua solicitação.',
    orientacao: 'Confira o resultado da ação antes de repetir. Se continuar, informe a referência ao suporte.',
  };
  if (campos && Object.keys(campos).length) return {
    ...base, titulo: 'Revise os campos indicados', mensagem: 'Algumas informações precisam ser corrigidas para continuar.',
    orientacao: 'Confira os avisos abaixo. Seu preenchimento foi mantido.', campos,
  };
  if (status === 422) return { ...base, titulo: 'Essa ação ainda não está disponível',
    mensagem: texto || 'Confira o estado do registro.', orientacao: 'Revise as condições da ação antes de continuar.', tom: 'aviso' };
  // Mensagens de validação da própria interface já estão em português.
  return { ...base, mensagem: texto && !/fetch|undefined|TypeError|Error:/i.test(texto) ? texto : base.mensagem,
    orientacao: 'Confira as informações indicadas e tente novamente.' };
}
