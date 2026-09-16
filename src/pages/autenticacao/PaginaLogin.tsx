import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import estilos from './PaginaLogin.module.css';
import { Botao, InputTexto, Cartao, InputSenha } from '../../components/ui';
import { useAutenticacao } from '../../hooks/useAutenticacao';
import { validarEmail, validarSenhaLogin, validarFormulario } from '../../validators';
import { tratarErroApi } from '../../utils/errosApi';

/** Duração do bloqueio local após 429 (rate limit de login). */
const SEGUNDOS_BLOQUEIO_429 = 60;

export default function PaginaLogin() {
  const navigate = useNavigate();
  const { entrar } = useAutenticacao();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosTocados, setErrosTocados] = useState<Record<string, boolean>>({});
  // Rate limit (429): bloqueia o envio até o temporizador zerar.
  const [bloqueadoAte, setBloqueadoAte] = useState<number | null>(null);
  const [segundosRestantes, setSegundosRestantes] = useState(0);

  useEffect(() => {
    if (bloqueadoAte === null) {
      setSegundosRestantes(0);
      return;
    }
    const atualizar = () => {
      const restam = Math.ceil((bloqueadoAte - Date.now()) / 1000);
      setSegundosRestantes(restam > 0 ? restam : 0);
    };
    atualizar();
    const timer = window.setInterval(atualizar, 1000);
    return () => window.clearInterval(timer);
  }, [bloqueadoAte]);

  const bloqueado = segundosRestantes > 0;

  // Erro exibido por campo: on blur (se já tocou) ou on submit — nunca on change
  const erroCampo = (campo: string): string | undefined =>
    errosTocados[campo] || Object.keys(errosTocados).length > 0 ? erros[campo] : undefined;

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

  const validaTudo = (): boolean => {
    const novosErros = validarFormulario({ email, senha }, {
      email: validarEmail,
      senha: validarSenhaLogin,
    });
    setErros(novosErros);
    setErrosTocados({ email: true, senha: true });
    return Object.keys(novosErros).length === 0;
  };

  const lidarComSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (bloqueado) return;
    setErros({});
    if (!validaTudo()) return;

    setCarregando(true);
    try {
      await entrar(email.trim().toLowerCase(), senha);
      navigate('/');
    } catch (err: unknown) {
      const tratado = tratarErroApi(err);
      if (tratado.rateLimit) {
        // 429 → bloqueia novas tentativas com temporizador.
        setBloqueadoAte(Date.now() + SEGUNDOS_BLOQUEIO_429 * 1000);
      }
      // 401 → mensagem genérica (não revelar qual campo errou).
      setErros({
        geral:
          tratado.mensagemGeral ||
          'E-mail ou senha inválidos. Se o e-mail não estiver confirmado, reenvie o código no cadastro.',
      });
    } finally {
      setCarregando(false);
    }
  };

  const alternarVisualizacaoSenha = () => {
    setMostrarSenha(!mostrarSenha);
  };

  return (
    <div className={estilos.container}>
      <Cartao className={estilos.cartao}>
        <div className={estilos.cabecalho}>
          <h1 className={estilos.logo}>Nhac</h1>
          <p className={estilos.subtitulo}>Lojas</p>
        </div>

        {erros.geral && <div className={estilos.erro}>{erros.geral}</div>}

        <form className={estilos.formulario} onSubmit={lidarComSubmit} noValidate>
          <InputTexto
            rotulo="E-mail"
            tipo="email"
            valor={email}
            aoMudar={setEmail}
            placeholder="seu@email.com"
            icone={<Mail size={18} />}
            erro={erroCampo('email')}
            onBlur={() => tocarCampo('email', email, validarEmail)}
            obrigatorio
          />

          <InputSenha
            rotulo="Senha"
            valor={senha}
            aoMudar={setSenha}
            placeholder="Sua senha"
            icone={<Lock size={18} />}
            erro={erroCampo('senha')}
            onBlur={() => tocarCampo('senha', senha, validarSenhaLogin)}
            mostrarAgora={mostrarSenha}
            onAlternarVisualizacao={alternarVisualizacaoSenha}
            obrigatorio
          />

          <div className={estilos.opcoes}>
            <Link to="/recuperar-senha" className={estilos.link}>Esqueci minha senha</Link>
          </div>

          <Botao
            type="submit"
            variante="primario"
            larguraTotal
            carregando={carregando}
            disabled={bloqueado || carregando}
          >
            {bloqueado ? `Aguarde ${segundosRestantes}s` : 'Entrar'}
          </Botao>
        </form>

        <div className={estilos.rodape}>
          Não tem uma conta?{' '}
          <Link to="/cadastro" className={estilos.link}>
            Cadastre-se
          </Link>
        </div>
      </Cartao>
    </div>
  );
}