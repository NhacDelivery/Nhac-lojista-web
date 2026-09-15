/**
 * Validadores puros por campo — espelham as regras de negócio do backend Nhac.
 *
 * Contrato: cada função retorna `null` se o valor é válido, ou uma mensagem
 * em pt-BR se inválido. O backend continua sendo a fonte da verdade: se ele
 * retornar 400/422, a mensagem do backend tem prioridade sobre a local.
 *
 * Regras extraídas dos DTOs do backend (branch fix/robustez-integracao-frontend-lojista):
 *  - RegistroRequestDTO: nome/email/telefone @NotBlank; senha @Size(min=8)
 *    + @Pattern(^(?=.*[0-9])(?=.*[a-zA-Z]).*$) → mínimo 8, ao menos 1 letra e 1 número.
 *  - LojaCreateDTO: nome @NotBlank @Size(3,100); descricao @Size(max=2000);
 *    categoria @Size(max=50); imagemUrl @NotBlank @Size(max=500);
 *    endereco.* @NotBlank; horarios @NotNull.
 *  - ProdutoCreateDTO: nome @NotBlank @Size(max=100); preco @NotNull @PositiveOrZero;
 *    categoriaMenu @NotBlank; percentualDesconto @Min(0) @Max(100).
 *  - RedefinirSenhaEmailDTO / AlterarSenhaDTO: novaSenha @Size(min=6).
 *  - Código de verificação: 6 dígitos, expira em 15 minutos.
 */

// ==================== Tipos e helpers ====================

export type Validador<T = string> = (valor: T) => string | null;

/** Mantém apenas dígitos (telefone, CPF/CNPJ, CEP, código). */
export function soDigitos(valor: string): string {
  return (valor ?? '').replace(/\D/g, '');
}

/** Trim automático — usar em todo texto antes de enviar/validar. */
export function limparTexto(valor: string): string {
  return (valor ?? '').trim();
}

/** E-mail padronizado: trim + lowercase (regra de envio). */
export function normalizarEmail(valor: string): string {
  return (valor ?? '').trim().toLowerCase();
}

/** Gera UUID v4 (campo `id` exigido pelo RegistroRequestDTO). */
export function gerarUuid(): string {
  const cryptoObj = typeof crypto !== 'undefined' ? crypto : undefined;
  if (cryptoObj && typeof cryptoObj.randomUUID === 'function') {
    return cryptoObj.randomUUID() as string;
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Executa um esquema { campo: validador } sobre os valores e retorna
 * o mapa de erros (vazio = válido). Equivalente leve a um schema Zod.
 */
export function validarFormulario<Campos extends Record<string, unknown>>(
  valores: Campos,
  esquema: { [K in keyof Campos]?: Validador<Campos[K]> }
): Record<string, string> {
  const erros: Record<string, string> = {};
  (Object.keys(esquema) as (keyof Campos & string)[]).forEach((campo) => {
    const validar = esquema[campo];
    if (!validar) return;
    const erro = validar(valores[campo]);
    if (erro) erros[campo] = erro;
  });
  return erros;
}

/** Validador genérico de campo obrigatório (após trim). */
export function obrigatorio(mensagem: string): Validador {
  return (valor) => (limparTexto(valor) ? null : mensagem);
}

// ==================== Autenticação / Cadastro ====================

/** Nome completo — obrigatório, 3–100 caracteres, sem números/símbolos. */
export const validarNome: Validador = (valor) => {
  const nome = limparTexto(valor);
  if (!nome) return 'Informe seu nome completo.';
  if (nome.length < 3) return 'O nome deve ter pelo menos 3 caracteres.';
  if (nome.length > 100) return 'O nome deve ter no máximo 100 caracteres.';
  if (!/^[A-Za-zÀ-ÖØ-öø-ÿ' ]+$/.test(nome)) {
    return 'O nome não pode conter números ou símbolos.';
  }
  return null;
};

const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** E-mail — obrigatório, formato válido, máx. 150 caracteres. */
export const validarEmail: Validador = (valor) => {
  const email = limparTexto(valor);
  if (!email) return 'Informe seu e-mail.';
  if (email.length > 150) return 'O e-mail deve ter no máximo 150 caracteres.';
  if (!REGEX_EMAIL.test(email)) return 'Informe um e-mail válido.';
  return null;
};

/** Verificações individuais da senha de cadastro (para o checklist visual). */
export const senhaTemMinimoOito = (senha: string): boolean => (senha ?? '').length >= 8;
export const senhaTemLetra = (senha: string): boolean => /(?=.*[a-zA-Z])/.test(senha ?? '');
export const senhaTemNumero = (senha: string): boolean => /(?=.*[0-9])/.test(senha ?? '');

/** Força da senha (apenas UX — o backend não exige caractere especial). */
export function forcaSenha(senha: string): 'fraca' | 'media' | 'forte' {
  const criterios = [senhaTemMinimoOito(senha), senhaTemLetra(senha), senhaTemNumero(senha), (senha ?? '').length >= 12];
  const atendidos = criterios.filter(Boolean).length;
  if (atendidos <= 2) return 'fraca';
  if (atendidos === 3) return 'media';
  return 'forte';
}

/**
 * Senha de cadastro — espelha RegistroRequestDTO.senha:
 * @Size(min=8) + @Pattern(^(?=.*[0-9])(?=.*[a-zA-Z]).*$).
 * Mensagens idênticas às do backend.
 */
export const validarSenhaCadastro: Validador = (valor) => {
  const senha = valor ?? '';
  if (!senha) return 'Informe uma senha.';
  if (senha.length < 8) return 'A senha deve ter pelo menos 8 caracteres.';
  if (!senhaTemLetra(senha) || !senhaTemNumero(senha)) {
    return 'A senha deve conter pelo menos uma letra e um número.';
  }
  if (senha.length > 72) return 'A senha deve ter no máximo 72 caracteres.';
  return null;
};

/** Senha de redefinição/alteração — backend exige @Size(min=6). */
export const validarSenhaRedefinicao: Validador = (valor) => {
  const senha = valor ?? '';
  if (!senha) return 'Informe a nova senha.';
  if (senha.length < 6) return 'A senha deve ter pelo menos 6 caracteres.';
  return null;
};

/** Confirmação de senha — deve bater exatamente. */
export const validarConfirmarSenha = (senha: string): Validador => (valor) =>
  (valor ?? '') === (senha ?? '') ? null : 'As senhas não coincidem.';

/** Senha no login — apenas obrigatória (sem regras de força). */
export const validarSenhaLogin: Validador = (valor) =>
  (valor ?? '').length > 0 ? null : 'Informe sua senha.';

/** Telefone brasileiro com DDD — 10 ou 11 dígitos. */
export const validarTelefone: Validador = (valor) => {
  const telefone = soDigitos(valor);
  if (!telefone) return 'Informe seu telefone.';
  if (!/^\d{10,11}$/.test(telefone)) return 'Informe um telefone válido com DDD.';
  return null;
};

// ==================== CPF / CNPJ (utilitários) ====================

/** Dígito verificador do CPF. */
function calcularDigitoCpf(base: string): string {
  let soma = 0;
  let peso = base.length + 1;
  for (let i = 0; i < base.length; i++) {
    soma += parseInt(base[i], 10) * peso;
    peso--;
  }
  const resto = (soma * 10) % 11;
  return String(resto === 10 ? 0 : resto);
}

/** CPF — 11 dígitos + dígito verificador + bloqueio de sequências repetidas. */
export const validarCpf: Validador = (valor) => {
  const cpf = soDigitos(valor);
  if (cpf.length !== 11) return 'CPF inválido.';
  if (/^(\d)\1{10}$/.test(cpf)) return 'CPF inválido.';
  if (calcularDigitoCpf(cpf.slice(0, 9)) !== cpf[9]) return 'CPF inválido.';
  if (calcularDigitoCpf(cpf.slice(0, 10)) !== cpf[10]) return 'CPF inválido.';
  return null;
};

/** Dígito verificador do CNPJ. */
function calcularDigitoCnpj(base: string): string {
  const pesos = base.length === 12 ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2] : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let soma = 0;
  for (let i = 0; i < base.length; i++) {
    soma += parseInt(base[i], 10) * pesos[i];
  }
  const resto = soma % 11;
  return String(resto < 2 ? 0 : 11 - resto);
}

/** CNPJ — 14 dígitos + dígitos verificadores + bloqueio de sequências repetidas. */
export const validarCnpj: Validador = (valor) => {
  const cnpj = soDigitos(valor);
  if (cnpj.length !== 14) return 'CNPJ inválido.';
  if (/^(\d)\1{13}$/.test(cnpj)) return 'CNPJ inválido.';
  if (calcularDigitoCnpj(cnpj.slice(0, 12)) !== cnpj[12]) return 'CNPJ inválido.';
  if (calcularDigitoCnpj(cnpj.slice(0, 13)) !== cnpj[13]) return 'CNPJ inválido.';
  return null;
};

/** CPF ou CNPJ — decide pelo tamanho digitado. */
export const validarCpfCnpj: Validador = (valor) => {
  const doc = soDigitos(valor);
  if (!doc) return 'Informe seu CPF ou CNPJ.';
  if (doc.length === 11) return validarCpf(doc);
  if (doc.length === 14) return validarCnpj(doc);
  return 'Informe seu CPF ou CNPJ.';
};

// ==================== Código de verificação ====================

/** Código de e-mail — exatamente 6 dígitos numéricos. */
export const validarCodigoVerificacao: Validador = (valor) => {
  const codigo = soDigitos(valor);
  if (!codigo) return 'Informe o código recebido por e-mail.';
  if (!/^\d{6}$/.test(codigo)) return 'O código deve ter 6 dígitos.';
  return null;
};

// ==================== Loja ====================

/** Nome da loja — backend: @NotBlank @Size(min=3, max=100). */
export const validarNomeLoja: Validador = (valor) => {
  const nome = limparTexto(valor);
  if (!nome) return 'Informe o nome da loja.';
  if (nome.length < 3 || nome.length > 100) {
    return 'Informe o nome da loja (3 a 100 caracteres).';
  }
  return null;
};

/** Descrição da loja — spec §5.3: obrigatória, backend @Size(max=2000). */
export const validarDescricaoLoja: Validador = (valor) => {
  const d = limparTexto(valor);
  if (!d) return 'Informe a descrição da loja.';
  if (d.length > 2000) return 'A descrição deve ter no máximo 2000 caracteres.';
  return null;
};

/** Categoria — obrigatória no formulário (backend aceita até 50 caracteres). */
export const validarCategoria: Validador = (valor) => {
  const categoria = limparTexto(valor);
  if (!categoria) return 'Selecione uma categoria.';
  if (categoria.length > 50) return 'A categoria deve ter no máximo 50 caracteres.';
  return null;
};

/** CEP — 8 dígitos. */
export const validarCep: Validador = (valor) => {
  const cep = soDigitos(valor);
  if (!cep) return 'Informe um CEP válido.';
  if (!/^\d{8}$/.test(cep)) return 'Informe um CEP válido.';
  return null;
};

/** Rua — obrigatória, máx. 150 caracteres. */
export const validarRua: Validador = (valor) => {
  const rua = limparTexto(valor);
  if (!rua) return 'Informe a rua.';
  if (rua.length > 150) return 'A rua deve ter no máximo 150 caracteres.';
  return null;
};

/** Número — obrigatório (aceita "S/N"), máx. 10 caracteres. */
export const validarNumeroEndereco: Validador = (valor) => {
  const numero = limparTexto(valor);
  if (!numero) return 'Informe o número.';
  if (numero.length > 10) return 'O número deve ter no máximo 10 caracteres.';
  return null;
};

/** Complemento — opcional, máx. 50 caracteres. */
export const validarComplemento: Validador = (valor) =>
  (valor ?? '').trim().length > 50 ? 'O complemento deve ter no máximo 50 caracteres.' : null;

/** Campo de texto obrigatório com limite (bairro, cidade...). */
export const validarTextoCurto = (rotulo: string, maximo = 100): Validador => (valor) => {
  const texto = limparTexto(valor);
  if (!texto) return `Informe ${rotulo}.`;
  if (texto.length > maximo) return `${rotulo[0].toUpperCase()}${rotulo.slice(1)} deve ter no máximo ${maximo} caracteres.`;
  return null;
};

export const validarBairro = validarTextoCurto('o bairro');
export const validarCidade = validarTextoCurto('a cidade');

/** UF — 2 letras maiúsculas. */
export const validarUf: Validador = (valor) => {
  const uf = limparTexto(valor).toUpperCase();
  if (!uf) return 'Selecione o estado (UF).';
  if (!/^[A-Z]{2}$/.test(uf)) return 'Informe uma UF válida (2 letras).';
  return null;
};

/** imagemUrl — backend: @NotBlank @Size(max=500). */
export const validarImagemUrl: Validador = (valor) => {
  const url = limparTexto(valor);
  if (!url) return 'Informe uma imagem para a loja.';
  if (url.length > 500) return 'A URL da imagem deve ter no máximo 500 caracteres.';
  return null;
};

/**
 * Horário de funcionamento de um dia.
 * Se aberto, abertura e fechamento são obrigatórios (HH:mm)
 * e o fechamento deve ser após a abertura.
 */
export function validarHorarioDia(dia: {
  aberto: boolean;
  abertura: string;
  fechamento: string;
}): string | null {
  if (!dia.aberto) return null;
  const formatoHora = /^\d{2}:\d{2}$/;
  if (!formatoHora.test(dia.abertura) || !formatoHora.test(dia.fechamento)) {
    return 'Informe abertura e fechamento no formato HH:mm.';
  }
  if (dia.fechamento <= dia.abertura) {
    return 'O horário de fechamento deve ser após a abertura.';
  }
  return null;
}

// ==================== Produto ====================

/** Nome do produto — backend: @NotBlank @Size(max=100). */
export const validarNomeProduto: Validador = (valor) => {
  const nome = limparTexto(valor);
  if (!nome) return 'Informe o nome do produto.';
  if (nome.length > 100) return 'O nome deve ter no máximo 100 caracteres.';
  return null;
};

/** Descrição do produto — opcional, máx. 300 caracteres (guarda de UX). */
export const validarDescricaoProduto: Validador = (valor) =>
  (valor ?? '').length > 300 ? 'A descrição deve ter no máximo 300 caracteres.' : null;

/**
 * Preço — backend: @NotNull @PositiveOrZero (aceita 0, rejeita negativo).
 * Aceita "25,50" | "25.50" | "R$ 25,50".
 */
export const validarPreco: Validador = (valor) => {
  const texto = limparTexto(valor);
  if (!texto) return 'Informe o preço.';
  const numero = typeof valor === 'number' ? valor : parseFloat(soDigitosPreservandoSeparadores(texto));
  if (Number.isNaN(numero)) return 'Informe um preço válido.';
  if (numero < 0) return 'O preço não pode ser negativo.';
  return null;
};

/** Converte texto de preço ("R$ 1.234,56" | "1234.56") para number. */
export function parsePreco(valor: string): number {
  const texto = limparTexto(valor).replace(/[R$\s]/g, '');
  if (texto.includes(',')) {
    return parseFloat(texto.replace(/\./g, '').replace(',', '.'));
  }
  return parseFloat(texto);
}

function soDigitosPreservandoSeparadores(texto: string): string {
  return texto.replace(/[^\d.,]/g, '').replace(',', '.');
}

/** percentualDesconto — backend: @Min(0) @Max(100). */
export const validarPercentualDesconto: Validador = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) return 'Informe um percentual válido.';
  if (numero < 0 || numero > 100) return 'O percentual deve estar entre 0 e 100.';
  return null;
};

/**
 * Estoque — backend AtualizarEstoqueDTO: @NotNull @PositiveOrZero.
 * Vazio é aceito (no cadastro o backend assume o padrão; na edição o campo
 * omitido mantém o valor atual).
 */
export const validarEstoque: Validador = (valor) => {
  if (valor === '' || valor === null || valor === undefined) return null;
  const numero = Number(valor);
  if (Number.isNaN(numero) || !Number.isInteger(numero)) return 'Informe uma quantidade inteira de unidades.';
  if (numero < 0) return 'O estoque não pode ser negativo.';
  return null;
};

// ==================== Imagem (arquivo) ====================

const FORMATOS_IMAGEM_ACEITOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANHO_MAX_IMAGEM_BYTES = 5 * 1024 * 1024; // 5 MB

/** Valida arquivo de imagem: formatos JPG/PNG/WEBP e tamanho máx. 5 MB. */
export function validarArquivoImagem(arquivo: File): string | null {
  if (!FORMATOS_IMAGEM_ACEITOS.includes(arquivo.type)) {
    return 'Formato de imagem não suportado. Use JPG, PNG ou WEBP.';
  }
  if (arquivo.size > TAMANHO_MAX_IMAGEM_BYTES) {
    return 'A imagem deve ter no máximo 5 MB.';
  }
  return null;
}

// ==================== Termos ====================

/** Checkbox de termos de uso / LGPD. */
export const validarTermos = (marcado: boolean): string | null =>
  marcado ? null : 'É necessário aceitar os termos para continuar.';