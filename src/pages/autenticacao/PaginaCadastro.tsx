import React, { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  User, Mail, Phone, 
  Store, UploadCloud, MapPin, CheckCircle, 
  Banknote, CreditCard, Smartphone, Utensils, ShoppingBag,
} from 'lucide-react';
import estilos from './PaginaCadastro.module.css';
import { Botao, InputTexto, Seletor, Toggle, Checkbox, IndicadorEtapas, Cartao, InputSenha } from '../../components/ui';
import { mascaraTelefone, mascaraCep, ESTADOS_BRASILEIROS } from '../../utils/formatacao';
import { CATEGORIAS_LOJA } from '../../dados/categorias';
import { registrar, criarLoja, buscarCep as apiBuscarCep, enviarCodigoCadastro, checarEmail, enviarImagem } from '../../services/api';
import VerificacaoEmail from '../../components/autenticacao/VerificacaoEmail';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { useLoja } from '../../contexts/LojaContext';
import { emailEstaVerificado, limparEmailVerificado, tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import {
  validarNome,
  validarEmail,
  validarTelefone,
  validarSenhaCadastro,
  validarConfirmarSenha,
  validarNomeLoja,
  validarDescricaoLoja,
  validarCategoria,
  validarCep,
  validarRua,
  validarNumeroEndereco,
  validarComplemento,
  validarBairro,
  validarCidade,
  validarUf,
  validarHorarioDia,
  validarFormulario,
  senhaTemMinimoOito,
  senhaTemLetra,
  senhaTemNumero,
  forcaSenha,
  limparTexto,
  normalizarEmail,
  soDigitos,
  gerarUuid,
  validarArquivoImagem,
} from '../../validators';

const ETAPAS_COMPLETO = [
  'Dados Pessoais',
  'Verificação de E-mail',
  'Dados da Loja',
  'Endereço',
  'Entrega',
  'Horários',
  'Pagamento',
  'Revisão',
];

const ETAPAS_LOJA = [
  'Dados da Loja',
  'Endereço',
  'Entrega',
  'Horários',
  'Pagamento',
  'Revisão',
];

type ModoCadastro = 'completo' | 'apenas-loja';

interface PropsPaginaCadastro {
  modo?: ModoCadastro;
}

const DIAS_SEMANA = [
  { id: 'seg', nome: 'Segunda-feira' },
  { id: 'ter', nome: 'Terça-feira' },
  { id: 'qua', nome: 'Quarta-feira' },
  { id: 'qui', nome: 'Quinta-feira' },
  { id: 'sex', nome: 'Sexta-feira' },
  { id: 'sab', nome: 'Sábado' },
  { id: 'dom', nome: 'Domingo' }
];

export default function PaginaCadastro({ modo = 'completo' }: PropsPaginaCadastro) {
  const navigate = useNavigate();
  const { definirSessao } = useAutenticacao();
  const { recarregar: recarregarLoja } = useLoja();
  const { mostrarToast } = useToast();

  const etapas = modo === 'apenas-loja' ? ETAPAS_LOJA : ETAPAS_COMPLETO;
  // Forma uniforme em ambos os modos (evita `number | undefined` na união)
  const indices = useMemo(() => {
    if (modo === 'apenas-loja') {
      return { DADOS: -1, VERIFICACAO: -1, LOJA: 0, ENDERECO: 1, ENTREGA: 2, HORARIOS: 3, PAGAMENTO: 4, REVISAO: 5 };
    }
    return {
      DADOS: 0,
      VERIFICACAO: 1,
      LOJA: 2,
      ENDERECO: 3,
      ENTREGA: 4,
      HORARIOS: 5,
      PAGAMENTO: 6,
      REVISAO: 7,
    };
  }, [modo]);

  const [etapaAtual, setEtapaAtual] = useState(0);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [cadastroConcluido, setCadastroConcluido] = useState(false);
  const [carregando, setCarregando] = useState(false);
  // Spec §7: 429 no envio de código → bloqueia o botão Avançar com temporizador.
  const [bloqueadoEnvioAte, setBloqueadoEnvioAte] = useState<number | null>(null);

  useEffect(() => {
    if (bloqueadoEnvioAte === null) return;

    const tempoRestante = bloqueadoEnvioAte - Date.now();
    if (tempoRestante <= 0) {
      setBloqueadoEnvioAte(null);
      return;
    }

    const temporizador = window.setTimeout(() => setBloqueadoEnvioAte(null), tempoRestante);
    return () => window.clearTimeout(temporizador);
  }, [bloqueadoEnvioAte]);

  // Etapa 0 — Dados Pessoais
  const [nomeCompleto, setNomeCompleto] = useState('');
  const [email, setEmail] = useState('');
  const [telefone, setTelefone] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);
  const [errosTocados, setErrosTocados] = useState<Record<string, boolean>>({});
  const [aceitouTermos, setAceitouTermos] = useState(false);

  // Etapa 1 — Dados da Loja (antiga etapa 2)
  const [fotoUrl, setFotoUrl] = useState('');
  const [enviandoLogo, setEnviandoLogo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [nomeLoja, setNomeLoja] = useState('');
  const [descricaoLoja, setDescricaoLoja] = useState('');
  const [categoriaLoja, setCategoriaLoja] = useState('');

  // Etapa 2 — Endereço (antiga etapa 3)
  const [cep, setCep] = useState('');
  const [rua, setRua] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [cidade, setCidade] = useState('');
  const [uf, setUf] = useState('');
  const [buscandoCep, setBuscandoCep] = useState(false);

  // Etapa 3 — Entrega (antiga etapa 4)
  const [entregaPropria, setEntregaPropria] = useState(true);
  const [retiradaNoLocal, setRetiradaNoLocal] = useState(true);
  const [raioEntregaKm, setRaioEntregaKm] = useState('5');
  const [taxaEntregaReais, setTaxaEntregaReais] = useState('5.00');
  const [tempoEntregaMin, setTempoEntregaMin] = useState('30');
  const [tempoEntregaMax, setTempoEntregaMax] = useState('60');

  // Etapa 4 — Horários (antiga etapa 5)
  const [horarios, setHorarios] = useState(
    DIAS_SEMANA.map(dia => ({
      ...dia,
      aberto: dia.id !== 'sab' && dia.id !== 'dom',
      abertura: '10:00',
      fechamento: '22:00'
    }))
  );

  // Etapa 5 — Pagamento (antiga etapa 6)
  const [pagamentos, setPagamentos] = useState({
    dinheiro: false,
    credito: false,
    debito: false,
    pix: false,
    refeicao: false,
    alimentacao: false
  });

  // Erro exibido por campo: on blur (se já tocou) ou on submit — nunca on change
  const erroCampo = (campo: string): string | undefined =>
    errosTocados[campo] ? erros[campo] : undefined;

  const tocarCampo = (campo: string, valor: string, validar: (v: string) => string | null) => {
    setErrosTocados((prev) => ({ ...prev, [campo]: true }));
    const erro = validar(valor);
    setErros((prev) => {
      const novos = { ...prev };
      if (erro) novos[campo] = erro;
      else delete novos[campo];
      return novos;
    });
  };

  const validarDadosPessoais = () => {
    const novosErros = validarFormulario(
      { nomeCompleto, email, telefone, senha, confirmarSenha },
      {
        nomeCompleto: validarNome,
        email: validarEmail,
        telefone: validarTelefone,
        senha: validarSenhaCadastro,
        confirmarSenha: validarConfirmarSenha(senha),
      }
    );
    if (!aceitouTermos) novosErros.termos = 'É necessário aceitar os termos para continuar.';
    setErros(novosErros);
    setErrosTocados({
      nomeCompleto: true,
      email: true,
      telefone: true,
      senha: true,
      confirmarSenha: true,
    });
    return Object.keys(novosErros).length === 0;
  };

  const validarEtapaLoja = () => {
    const novosErros = validarFormulario(
      { nomeLoja, descricaoLoja, categoriaLoja },
      {
        nomeLoja: validarNomeLoja,
        descricaoLoja: validarDescricaoLoja,
        categoriaLoja: validarCategoria,
      }
    );
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const validarEtapaEndereco = () => {
    const novosErros = validarFormulario(
      { cep, rua, numero, bairro, cidade, uf },
      {
        cep: validarCep,
        rua: validarRua,
        numero: validarNumeroEndereco,
        bairro: validarBairro,
        cidade: validarCidade,
        uf: validarUf,
      }
    );
    const erroComplemento = validarComplemento(complemento);
    if (erroComplemento) novosErros.complemento = erroComplemento;
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const validarEtapaEntrega = () => {
    const novosErros: Record<string, string> = {};
    const min = parseInt(tempoEntregaMin, 10);
    const max = parseInt(tempoEntregaMax, 10);
    if (Number.isNaN(min) || min < 0) novosErros.tempoEntregaMin = 'Informe o tempo mínimo em minutos';
    if (Number.isNaN(max) || max < 0) novosErros.tempoEntregaMax = 'Informe o tempo máximo em minutos';
    if (!Number.isNaN(min) && !Number.isNaN(max) && max < min) {
      novosErros.tempoEntregaMax = 'O tempo máximo deve ser maior ou igual ao mínimo';
    }
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  };

  const validarEtapaPagamento = () => {
    const selecionadoAlgum = Object.values(pagamentos).some(v => v);
    if (!selecionadoAlgum) {
      setErros({ pagamentos: 'Selecione pelo menos uma forma de pagamento' });
      return false;
    }
    setErros({});
    return true;
  };

  const avancar = async () => {
    let valido = false;

    if (modo === 'completo' && etapaAtual === indices.DADOS) {
      if (!validarDadosPessoais()) return;
      setCarregando(true);
      setErros({});
      // Spec §3.1 — checar-email antes de enviar o código: se o e-mail
      // já existir, redireciona para o login em vez de enviar código.
      try {
        const resultadoEmail = await checarEmail(email);
        if (resultadoEmail.existe) {
          const msg = 'Este e-mail já está cadastrado. Faça login.';
          setErros({ email: msg });
          mostrarToast(msg);
          navigate('/login');
          setCarregando(false);
          return;
        }
      } catch (erroCheck) {
        const tratCheck = tratarErroApi(erroCheck);
        if (tratCheck.sugerirLogin) {
          setErros({ email: tratCheck.mensagemGeral ?? 'Este e-mail já está cadastrado.' });
          mostrarToast(tratCheck.mensagemGeral ?? 'Este e-mail já está cadastrado. Faça login.');
          navigate('/login');
          setCarregando(false);
          return;
        }
        if (tratCheck.rateLimit || tratCheck.toastGenerico) {
          setErros({ geral: tratCheck.mensagemGeral ?? 'Não foi possível verificar o e-mail.' });
          setCarregando(false);
          return;
        }
        // 400 de validação local: segue para enviar-codigo e deixa o
        // backend responder com a mensagem definitiva.
      }
      try {
        await enviarCodigoCadastro(email);
        setEtapaAtual(indices.VERIFICACAO);
        window.scrollTo(0, 0);
      } catch (err) {
        const tratado = tratarErroApi(err);
        if (tratado.sugerirLogin) {
          setErros({ geral: `${tratado.mensagemGeral} Faça login se já possui conta.` });
        } else if (tratado.rateLimit) {
          // Spec §7: 429 → bloquear UI com temporizador (bloqueio de 60s).
          setBloqueadoEnvioAte(Date.now() + 60 * 1000);
          setErros({ geral: tratado.mensagemGeral ?? 'Muitas tentativas. Aguarde antes de reenviar.' });
        } else if (tratado.toastGenerico) {
          mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
        } else {
          setErros({ geral: tratado.mensagemGeral ?? 'Erro ao enviar código.' });
        }
      } finally {
        setCarregando(false);
      }
      return;
    }

    else if (etapaAtual === indices.LOJA) valido = validarEtapaLoja();
    else if (etapaAtual === indices.ENDERECO) valido = validarEtapaEndereco();
    else if (etapaAtual === indices.ENTREGA) valido = validarEtapaEntrega();
    else if (etapaAtual === indices.HORARIOS) {
      // Cada dia aberto exige abertura < fechamento (HH:mm)
      const errosHorarios: Record<string, string> = {};
      horarios.forEach((dia) => {
        const erro = validarHorarioDia(dia);
        if (erro) errosHorarios[dia.id] = erro;
      });
      setErros(errosHorarios);
      valido = Object.keys(errosHorarios).length === 0;
    }
    else if (etapaAtual === indices.PAGAMENTO) valido = validarEtapaPagamento();

    if (valido) {
      setEtapaAtual((prev) => Math.min(prev + 1, etapas.length - 1));
      window.scrollTo(0, 0);
    }
  };

  const voltar = () => {
    setEtapaAtual(prev => Math.max(prev - 1, 0));
    window.scrollTo(0, 0);
  };

  const montarPayloadLoja = () => {
    const serializarHorario = (dia: { aberto: boolean; abertura: string; fechamento: string }) =>
      dia.aberto ? `${dia.abertura} - ${dia.fechamento}` : 'Fechado';

    return {
      nome: nomeLoja,
      imagemUrl: fotoUrl || 'https://via.placeholder.com/150',
      descricao: descricaoLoja || '',
      categoria: categoriaLoja,
      isAberto: true,
      endereco: {
        cep: cep.replace(/\D/g, ''),
        rua,
        numero,
        complemento: complemento || undefined,
        bairro,
        cidade,
        estado: uf,
      },
      horarios: {
        segunda: serializarHorario(horarios[0]),
        terca: serializarHorario(horarios[1]),
        quarta: serializarHorario(horarios[2]),
        quinta: serializarHorario(horarios[3]),
        sexta: serializarHorario(horarios[4]),
        sabado: serializarHorario(horarios[5]),
        domingo: serializarHorario(horarios[6]),
      },
      dadosOperacionais: {
        entregaPropria,
        retiradaNoLocal,
        raioEntregaKm: parseFloat(raioEntregaKm) || null,
        taxaEntregaBase: parseFloat(taxaEntregaReais.replace(',', '.')) || 0,
        tempoEntregaMin: parseInt(tempoEntregaMin, 10),
        tempoEntregaMax: parseInt(tempoEntregaMax, 10),
      },
      formasPagamento: {
        aceitaDinheiro: pagamentos.dinheiro,
        aceitaCredito: pagamentos.credito,
        aceitaDebito: pagamentos.debito,
        aceitaPix: pagamentos.pix,
        aceitaValeRefeicao: pagamentos.refeicao,
        aceitaValeAlimentacao: pagamentos.alimentacao,
      },
    };
  };

  const finalizar = async () => {
    setCarregando(true);
    setErros({});
    try {
      // A conta (registrar + definirSessao) já foi criada logo após a
      // verificação de e-mail, em handleVerificacaoConcluida — é o que
      // garante que já existe token válido quando o upload da logo
      // acontece na etapa "Dados da Loja". Esta checagem fica só como
      // rede de segurança para o caso do usuário chegar aqui sem ter
      // passado por lá.
      if (modo === 'completo' && !emailEstaVerificado(email)) {
        setEtapaAtual(indices.VERIFICACAO);
        setErros({ geral: 'Confirme seu e-mail antes de finalizar o cadastro.' });
        return;
      }

      await criarLoja(montarPayloadLoja());
      await recarregarLoja();

      if (modo === 'apenas-loja') {
        navigate('/');
        return;
      }

      setCadastroConcluido(true);
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.redirecionarVerificacao) {
        setEtapaAtual(indices.VERIFICACAO);
        setErros({ geral: tratado.mensagemGeral ?? 'Erro de verificação.' });
      } else if (tratado.sugerirLogin) {
        setErros({ geral: `${tratado.mensagemGeral} Faça login se já possui conta.` });
      } else if (tratado.errosCampos) {
        setErros(tratado.errosCampos);
      } else if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        setErros({ geral: tratado.mensagemGeral ?? 'Erro ao cadastrar. Tente novamente.' });
      }
    } finally {
      setCarregando(false);
    }
  };


  /**
   * Roda assim que o código de verificação é confirmado. Antes, a conta só
   * era criada (registrar + definirSessao) no finalizar(), na última etapa —
   * só que o upload da logo, na etapa seguinte ("Dados da Loja"), depende de
   * ter um token em localStorage. Sem conta ainda criada, a chamada de
   * upload saía sem Authorization e o backend respondia 403. Por isso a
   * criação da conta foi movida pra cá: assim que o e-mail é confirmado, já
   * temos token válido antes de o usuário conseguir escolher uma foto.
   */
  const handleVerificacaoConcluida = async () => {
    if (modo !== 'completo') {
      setEtapaAtual(indices.LOJA);
      window.scrollTo(0, 0);
      return;
    }

    setCarregando(true);
    setErros({});
    try {
      const respostaRegistro = await registrar({
        id: gerarUuid(),
        nome: limparTexto(nomeCompleto),
        email: normalizarEmail(email),
        telefone: soDigitos(telefone),
        senha,
      });

      // definirSessao já persiste o token em '@nhac:token' — não duplicar.
      const tokenValido = respostaRegistro.accessToken || respostaRegistro.token || '';
      definirSessao(tokenValido, {
        id: respostaRegistro.usuarioId ?? email,
        nomeCompleto: respostaRegistro.nome ?? nomeCompleto,
        email,
        telefone,
        // Neste momento o papel REAL no backend é CLIENTE — ele só é
        // promovido a LOJISTA quando a loja é criada (POST /lojas), lá na
        // etapa de Revisão. A UI trata qualquer usuário autenticado como
        // 'administrador' (mesma conversão de converterUsuarioApi no
        // AutenticacaoContext). Enviar o papel cru ('CLIENTE') quebrava o
        // RotaProtegida logo após o cadastro (cargo inexistente na UI).
        cargo: 'administrador',
      });
      limparEmailVerificado();

      setEtapaAtual(indices.LOJA);
      window.scrollTo(0, 0);
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.sugerirLogin) {
        setErros({ geral: `${tratado.mensagemGeral} Faça login se já possui conta.` });
      } else if (tratado.toastGenerico) {
        mostrarToast(tratado.mensagemGeral ?? 'Erro interno.');
      } else {
        setErros({ geral: tratado.mensagemGeral ?? 'Erro ao criar sua conta. Tente novamente.' });
      }
    } finally {
      setCarregando(false);
    }
  };

  /**
   * Sobe a logo para o Firebase Storage via POST /uploads/imagem (pasta
   * "lojas") e guarda a URL PERSISTENTE devolvida pelo backend. Antes era
   * usado URL.createObjectURL(), que gera uma URL local (blob:) — ela não
   * sobrevive ao fim da sessão e nunca chegava ao servidor.
   */
  const lidarComArquivo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    e.target.value = '';
    if (!arquivo) return;

    // Mesmas regras do backend: JPG/PNG/WEBP até 5 MB.
    const erroArquivo = validarArquivoImagem(arquivo);
    if (erroArquivo) {
      setErros((prev) => ({ ...prev, imagemUrl: erroArquivo }));
      return;
    }

    setEnviandoLogo(true);
    try {
      const url = await enviarImagem(arquivo, 'lojas');
      setFotoUrl(url);
      setErros((prev) => { const n = { ...prev }; delete n.imagemUrl; return n; });
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErros((prev) => ({ ...prev, imagemUrl: tratado.mensagemGeral ?? 'Não foi possível enviar a imagem.' }));
    } finally {
      setEnviandoLogo(false);
    }
  };

  const buscarCep = async (valorCep: string) => {
    const cepLimpo = valorCep.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      setBuscandoCep(true);
      try {
        const dados = await apiBuscarCep(cepLimpo);
        setRua(dados.logradouro);
        setBairro(dados.bairro);
        setCidade(dados.localidade);
        setUf(dados.uf);
        if (dados.complemento) setComplemento(dados.complemento);
      } catch {
        setErros(prev => ({ ...prev, cep: 'CEP não encontrado' }));
      } finally {
        setBuscandoCep(false);
      }
    }
  };

  const copiarHorario = (indexOrigem: number) => {
    const origem = horarios[indexOrigem];
    setHorarios(horarios.map(h => ({
      ...h,
      aberto: origem.aberto,
      abertura: origem.abertura,
      fechamento: origem.fechamento
    })));
  };

  const atualizarHorario = (index: number, campo: string, valor: string | boolean) => {
    const novos = [...horarios];
    novos[index] = { ...novos[index], [campo]: valor };
    setHorarios(novos);
  };

  const togglePagamento = (chave: keyof typeof pagamentos) => {
    setPagamentos(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  const pagamentosSelecionados = Object.entries(pagamentos)
    .filter(([, v]) => v)
    .map(([k]) => ({ dinheiro: 'Dinheiro', credito: 'Crédito', debito: 'Débito', pix: 'Pix', refeicao: 'Vale-refeição', alimentacao: 'Vale-alimentação' }[k]))
    .join(', ');

  return (
    <div className={estilos.container}>
      <div className={estilos.conteudo}>
        <div className={estilos.cabecalho}>
          <h1 className={estilos.titulo}>
            {modo === 'apenas-loja' ? 'Cadastre sua loja' : 'Crie sua conta'}
          </h1>
          <p className={estilos.subtitulo}>
            {modo === 'apenas-loja'
              ? 'Complete os dados para começar a vender no Nhac'
              : 'Junte-se ao Nhac e expanda suas vendas'}
          </p>
        </div>

        <IndicadorEtapas etapas={etapas} etapaAtual={etapaAtual} />

        <Cartao className={estilos.cartao}>
          {erros.geral && <div className={estilos.erro}>{erros.geral}</div>}

          {/* Dados Pessoais */}
          {modo === 'completo' && etapaAtual === indices.DADOS && (
            <div className={estilos.grid}>
              <InputTexto
                rotulo="Nome Completo"
                valor={nomeCompleto}
                aoMudar={setNomeCompleto}
                icone={<User size={18} />}
                erro={erroCampo('nomeCompleto')}
                onBlur={() => tocarCampo('nomeCompleto', nomeCompleto, validarNome)}
                obrigatorio
              />
              <InputTexto
                rotulo="E-mail"
                tipo="email"
                valor={email}
                aoMudar={setEmail}
                icone={<Mail size={18} />}
                erro={erroCampo('email')}
                onBlur={() => tocarCampo('email', email, validarEmail)}
                obrigatorio
              />
              <InputTexto
                rotulo="Telefone"
                valor={telefone}
                aoMudar={(v) => setTelefone(mascaraTelefone(v))}
                icone={<Phone size={18} />}
                erro={erroCampo('telefone')}
                onBlur={() => tocarCampo('telefone', telefone, validarTelefone)}
                obrigatorio
              />
              <InputSenha
                rotulo="Senha"
                valor={senha}
                aoMudar={setSenha}
                erro={erroCampo('senha')}
                obrigatorio
                onBlur={() => tocarCampo('senha', senha, validarSenhaCadastro)}
                mostrarAgora={mostrarSenha}
                onAlternarVisualizacao={() => setMostrarSenha(!mostrarSenha)}
              />
              {senha.length > 0 && (
                <div style={{ marginTop: '0.5rem', display: 'grid', gap: '0.25rem', fontSize: '0.8rem' }}>
                  <span style={{ color: senhaTemMinimoOito(senha) ? 'var(--nhac-sucesso, green)' : 'var(--nhac-texto-claro)' }}>
                    {senhaTemMinimoOito(senha) ? '✓' : '○'} Mínimo 8 caracteres
                  </span>
                  <span style={{ color: senhaTemLetra(senha) ? 'var(--nhac-sucesso, green)' : 'var(--nhac-texto-claro)' }}>
                    {senhaTemLetra(senha) ? '✓' : '○'} Pelo menos 1 letra
                  </span>
                  <span style={{ color: senhaTemNumero(senha) ? 'var(--nhac-sucesso, green)' : 'var(--nhac-texto-claro)' }}>
                    {senhaTemNumero(senha) ? '✓' : '○'} Pelo menos 1 número
                  </span>
                  <span style={{ color: forcaSenha(senha) === 'forte' ? 'var(--nhac-sucesso, green)' : forcaSenha(senha) === 'media' ? 'orange' : 'var(--nhac-texto-claro)' }}>
                    Força: {forcaSenha(senha)}
                  </span>
                </div>
              )}
              <InputSenha
                rotulo="Confirmar Senha"
                valor={confirmarSenha}
                aoMudar={setConfirmarSenha}
                erro={erroCampo('confirmarSenha')}
                obrigatorio
                onBlur={() => tocarCampo('confirmarSenha', confirmarSenha, validarConfirmarSenha(senha))}
                mostrarAgora={mostrarConfirmarSenha}
                onAlternarVisualizacao={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
              />

              <div>
                <Checkbox
                  marcado={aceitouTermos}
                  aoMudar={(marcado) => {
                    setAceitouTermos(marcado);
                    setErros((prev) => { const n = { ...prev }; delete n.termos; return n; });
                  }}
                  rotulo="Aceito os termos de uso e a política de privacidade (LGPD)"
                />
                {erros.termos && <div className={estilos.erro}>{erros.termos}</div>}
              </div>
            </div>
          )}

          {/* Verificação de E-mail */}
          {modo === 'completo' && etapaAtual === indices.VERIFICACAO && (
            <VerificacaoEmail
              email={email}
              onVerificado={handleVerificacaoConcluida}
              enviarCodigoAoMontar={false}
            />
          )}

          {/* Dados da Loja */}
          {etapaAtual === indices.LOJA && (
            <div className={estilos.grid}>
              <div>
                <span className={estilos.rotuloTextarea}>Logo da Loja</span>
                <div 
                  className={estilos.uploadArea} 
                  onClick={() => { if (!enviandoLogo) fileInputRef.current?.click(); }}
                >
                  {enviandoLogo ? (
                    <span>Enviando imagem...</span>
                  ) : fotoUrl ? (
                    <img src={fotoUrl} alt="Logo" className={estilos.previewImagem} />
                  ) : (
                    <>
                      <UploadCloud size={40} className={estilos.uploadIcone} />
                      <span>Clique para fazer upload da logo</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    accept="image/*" 
                    ref={fileInputRef}
                    onChange={lidarComArquivo}
                    style={{ display: 'none' }}
                  />
                </div>
                {erros.imagemUrl && (
                  <span style={{ color: 'var(--nhac-erro, #e53935)', fontSize: '0.8125rem' }}>
                    {erros.imagemUrl}
                  </span>
                )}
              </div>
              
                <InputTexto
                  rotulo="Nome da Loja"
                  valor={nomeLoja}
                  aoMudar={setNomeLoja}
                  icone={<Store size={18} />}
                  erro={erros.nomeLoja}
                  obrigatorio
                  onBlur={() => tocarCampo('nomeLoja', nomeLoja, validarNomeLoja)}
                />

              <Seletor
                rotulo="Categoria Principal"
                opcoes={CATEGORIAS_LOJA.map(c => ({ valor: c, rotulo: c }))}
                valor={categoriaLoja}
                aoMudar={setCategoriaLoja}
                erro={erros.categoriaLoja}
                obrigatorio
              />

              <div>
                <label className={estilos.rotuloTextarea}>Descrição da Loja</label>
                <textarea
                  className={estilos.textarea}
                  value={descricaoLoja}
                  onChange={(e) => setDescricaoLoja(e.target.value)}
                  placeholder="Fale um pouco sobre sua loja e o que você oferece..."
                  maxLength={2000}
                />
                <span style={{ display: 'block', textAlign: 'right', fontSize: '0.75rem', color: 'var(--nhac-texto-claro)' }}>
                  {descricaoLoja.length}/2000
                </span>
              </div>
            </div>
          )}

          {/* Endereço */}
          {etapaAtual === indices.ENDERECO && (
            <div className={estilos.grid}>
              <InputTexto
                rotulo="CEP"
                valor={cep}
                aoMudar={(v) => {
                  const valFormatado = mascaraCep(v);
                  setCep(valFormatado);
                  if (valFormatado.length === 9) buscarCep(valFormatado);
                }}
                icone={<MapPin size={18} />}
                erro={erroCampo('cep')}
                onBlur={() => tocarCampo('cep', cep, validarCep)}
                obrigatorio
              />
              {buscandoCep && <span style={{ fontSize: '0.8rem', color: 'var(--nhac-primaria)' }}>Buscando endereço...</span>}
              
              <div className={`${estilos.grid} ${estilos.grid2}`}>
                <InputTexto rotulo="Rua" valor={rua} aoMudar={setRua} erro={erros.rua} obrigatorio />
                <InputTexto rotulo="Número" valor={numero} aoMudar={setNumero} erro={erros.numero} obrigatorio />
              </div>

              <div className={`${estilos.grid} ${estilos.grid2}`}>
                <InputTexto rotulo="Complemento" valor={complemento} aoMudar={setComplemento} />
                <InputTexto rotulo="Bairro" valor={bairro} aoMudar={setBairro} erro={erros.bairro} obrigatorio />
              </div>

              <div className={`${estilos.grid} ${estilos.grid2}`}>
                <InputTexto rotulo="Cidade" valor={cidade} aoMudar={setCidade} erro={erros.cidade} obrigatorio />
                <Seletor
                  rotulo="Estado (UF)"
                  opcoes={ESTADOS_BRASILEIROS.map(uf => ({ valor: uf, rotulo: uf }))}
                  valor={uf}
                  aoMudar={setUf}
                  erro={erros.uf}
                  obrigatorio
                />
              </div>
            </div>
          )}

          {/* Entrega */}
          {etapaAtual === indices.ENTREGA && (
            <div className={estilos.grid}>
              <Toggle
                rotulo="Oferece entrega própria?"
                ativo={entregaPropria}
                aoMudar={setEntregaPropria}
              />
              
              {entregaPropria && (
                <>
                  <InputTexto
                    rotulo="Raio de entrega (km)"
                    tipo="number"
                    valor={raioEntregaKm}
                    aoMudar={setRaioEntregaKm}
                  />
                  <InputTexto
                    rotulo="Taxa de entrega base (R$)"
                    valor={taxaEntregaReais}
                    aoMudar={setTaxaEntregaReais}
                  />
                </>
              )}

              <div className={`${estilos.grid} ${estilos.grid2}`}>
                <InputTexto
                  rotulo="Tempo mínimo de entrega (min)"
                  tipo="number"
                  valor={tempoEntregaMin}
                  aoMudar={setTempoEntregaMin}
                  erro={erros.tempoEntregaMin}
                  obrigatorio
                />
                <InputTexto
                  rotulo="Tempo máximo de entrega (min)"
                  tipo="number"
                  valor={tempoEntregaMax}
                  aoMudar={setTempoEntregaMax}
                  erro={erros.tempoEntregaMax}
                  obrigatorio
                />
              </div>

              <Toggle
                rotulo="Permite retirada no local?"
                ativo={retiradaNoLocal}
                aoMudar={setRetiradaNoLocal}
              />
            </div>
          )}

          {/* Horários */}
          {etapaAtual === indices.HORARIOS && (
            <div className={estilos.listaHorarios}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--nhac-texto-claro)' }}>
                Configure os horários de funcionamento da sua loja.
              </p>
              
              {horarios.map((dia, index) => (
                <div key={dia.id} className={estilos.linhaHorario}>
                  <div className={estilos.diaInfo}>
                    <Toggle
                      rotulo={dia.nome}
                      ativo={dia.aberto}
                      aoMudar={(v) => atualizarHorario(index, 'aberto', v)}
                    />
                  </div>
                  
                  {dia.aberto ? (
                    <div className={estilos.inputsTempo}>
                      <input
                        type="time"
                        className={estilos.inputTempo}
                        value={dia.abertura}
                        onChange={(e) => atualizarHorario(index, 'abertura', e.target.value)}
                      />
                      <span>às</span>
                      <input
                        type="time"
                        className={estilos.inputTempo}
                        value={dia.fechamento}
                        onChange={(e) => atualizarHorario(index, 'fechamento', e.target.value)}
                      />
                    </div>
                  ) : (
                    <span style={{ color: 'var(--nhac-texto-claro)', fontSize: '0.875rem' }}>Fechado</span>
                  )}
                  
                  <Botao 
                    variante="secundario" 
                    tamanho="pequeno" 
                    onClick={() => copiarHorario(index)}
                  >
                    Copiar
                  </Botao>
                </div>
              ))}
            </div>
          )}

          {/* Pagamento */}
          {etapaAtual === indices.PAGAMENTO && (
            <div className={estilos.grid}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--nhac-texto-claro)' }}>
                Quais formas de pagamento você aceita?
              </p>

              {erros.pagamentos && <div className={estilos.erro}>{erros.pagamentos}</div>}

              <div className={estilos.gridPagamentos}>
                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.dinheiro ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('dinheiro')}
                >
                  <Banknote className={estilos.iconePagamento} />
                  <span>Dinheiro</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.dinheiro} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>

                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.credito ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('credito')}
                >
                  <CreditCard className={estilos.iconePagamento} />
                  <span>Cartão de Crédito</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.credito} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>

                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.debito ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('debito')}
                >
                  <CreditCard className={estilos.iconePagamento} />
                  <span>Cartão de Débito</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.debito} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>

                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.pix ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('pix')}
                >
                  <Smartphone className={estilos.iconePagamento} />
                  <span>Pix</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.pix} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>

                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.refeicao ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('refeicao')}
                >
                  <Utensils className={estilos.iconePagamento} />
                  <span>Vale-refeição</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.refeicao} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>

                <div 
                  className={`${estilos.cartaoPagamento} ${pagamentos.alimentacao ? estilos.selecionado : ''}`}
                  onClick={() => togglePagamento('alimentacao')}
                >
                  <ShoppingBag className={estilos.iconePagamento} />
                  <span>Vale-alimentação</span>
                  <div style={{ marginLeft: 'auto' }}>
                    <Checkbox marcado={pagamentos.alimentacao} aoMudar={() => {}} rotulo="" />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Revisão */}
          {etapaAtual === indices.REVISAO && (
            <div className={estilos.grid}>
              <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--nhac-texto-claro)' }}>
                Revise suas informações antes de finalizar o cadastro.
              </p>

              {modo === 'completo' && (
                <div className={estilos.revisaoSecao}>
                  <h4 className={estilos.revisaoTitulo}>Dados Pessoais</h4>
                  <div className={estilos.revisaoItem}><span>Nome</span><strong>{nomeCompleto}</strong></div>
                  <div className={estilos.revisaoItem}><span>E-mail</span><strong>{email}</strong></div>
                  <div className={estilos.revisaoItem}><span>Telefone</span><strong>{telefone}</strong></div>
                </div>
              )}

              <div className={estilos.revisaoSecao}>
                <h4 className={estilos.revisaoTitulo}>Dados da Loja</h4>
                <div className={estilos.revisaoItem}><span>Nome</span><strong>{nomeLoja || '—'}</strong></div>
                <div className={estilos.revisaoItem}><span>Categoria</span><strong>{categoriaLoja || '—'}</strong></div>
                {descricaoLoja && <div className={estilos.revisaoItem}><span>Descrição</span><strong>{descricaoLoja}</strong></div>}
              </div>

              <div className={estilos.revisaoSecao}>
                <h4 className={estilos.revisaoTitulo}>Endereço</h4>
                <div className={estilos.revisaoItem}><span>CEP</span><strong>{cep || '—'}</strong></div>
                <div className={estilos.revisaoItem}><span>Endereço</span><strong>{rua}{numero ? `, ${numero}` : ''}{complemento ? ` - ${complemento}` : ''}</strong></div>
                <div className={estilos.revisaoItem}><span>Bairro/Cidade</span><strong>{bairro}{cidade ? ` — ${cidade}/${uf}` : ''}</strong></div>
              </div>

              <div className={estilos.revisaoSecao}>
                <h4 className={estilos.revisaoTitulo}>Entrega</h4>
                <div className={estilos.revisaoItem}><span>Entrega própria</span><strong>{entregaPropria ? `Sim (${raioEntregaKm} km, R$ ${taxaEntregaReais})` : 'Não'}</strong></div>
                <div className={estilos.revisaoItem}><span>Tempo de entrega</span><strong>{tempoEntregaMin}–{tempoEntregaMax} min</strong></div>
                <div className={estilos.revisaoItem}><span>Retirada no local</span><strong>{retiradaNoLocal ? 'Sim' : 'Não'}</strong></div>
              </div>

              <div className={estilos.revisaoSecao}>
                <h4 className={estilos.revisaoTitulo}>Horários</h4>
                {horarios.filter(d => d.aberto).map(d => (
                  <div key={d.id} className={estilos.revisaoItem}>
                    <span>{d.nome}</span>
                    <strong>{d.abertura} às {d.fechamento}</strong>
                  </div>
                ))}
                {horarios.filter(d => !d.aberto).length > 0 && (
                  <div className={estilos.revisaoItem}>
                    <span>Fechado</span>
                    <strong>{horarios.filter(d => !d.aberto).map(d => d.nome).join(', ')}</strong>
                  </div>
                )}
              </div>

              <div className={estilos.revisaoSecao}>
                <h4 className={estilos.revisaoTitulo}>Formas de Pagamento</h4>
                <div className={estilos.revisaoItem}>
                  <span>Aceitas</span>
                  <strong>{pagamentosSelecionados || '—'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Navegação — oculta na etapa de verificação (ações internas) */}
          {!(modo === 'completo' && etapaAtual === indices.VERIFICACAO) && (
            <div className={estilos.acoes}>
              {etapaAtual > 0 ? (
                <Botao type="button" variante="secundario" onClick={voltar}>
                  Voltar
                </Botao>
              ) : (
                <div />
              )}

              {etapaAtual < etapas.length - 1 ? (
                <Botao
                  type="button"
                  variante="primario"
                  onClick={avancar}
                  carregando={carregando}
                  disabled={bloqueadoEnvioAte !== null}
                >
                  Continuar
                </Botao>
              ) : (
                <Botao type="button" variante="primario" onClick={finalizar} carregando={carregando}>
                  Confirmar e Finalizar
                </Botao>
              )}
            </div>
          )}
        </Cartao>

        {modo === 'completo' && (
          <div className={estilos.rodape}>
            Já tem uma conta?{' '}
            <Link to="/login" className={estilos.link}>
              Faça login
            </Link>
          </div>
        )}
      </div>

      {/* MODAL SUCESSO */}
      {cadastroConcluido && (
        <div className={estilos.overlay}>
          <div className={estilos.modalSucesso}>
            <div className={estilos.circuloSucesso}>
              <CheckCircle size={40} />
            </div>
            <h2 className={estilos.titulo}>Cadastro realizado com sucesso!</h2>
            <p className={estilos.subtitulo}>Sua loja já está pronta para usar o painel Nhac.</p>
            <Botao
              variante="primario"
              larguraTotal
              onClick={() => navigate('/')}
            >
              Ir para o painel
            </Botao>
          </div>
        </div>
      )}
    </div>
  );
}
