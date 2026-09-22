import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle, ArrowLeft } from 'lucide-react';
import estilos from './PaginaRecuperarSenha.module.css';
import { Botao, InputTexto, Cartao } from '../../components/ui';
import { esqueciSenhaEmail, redefinirSenhaEmail } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import {
  validarEmail,
  validarCodigoVerificacao,
  validarSenhaRedefinicao,
  validarConfirmarSenha,
  validarFormulario,
  soDigitos,
} from '../../validators';

type Etapa = 'email' | 'codigo' | 'nova-senha';

const COOLDOWN_SEGUNDOS = 60;

export default function PaginaRecuperarSenha() {
  const navigate = useNavigate();

  const [etapa, setEtapa] = useState<Etapa>('email');
  const [email, setEmail] = useState('');
  const [codigo, setCodigo] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [concluido, setConcluido] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputCodigoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Auto-focus no campo de código ao entrar na etapa
  useEffect(() => {
    if (etapa === 'codigo') inputCodigoRef.current?.focus();
  }, [etapa]);

  const enviarEmail = async () => {
    const novosErros = validarFormulario({ email }, { email: validarEmail });
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setErros({});
    setCarregando(true);
    try {
      await esqueciSenhaEmail(email.trim().toLowerCase());
      setCooldown(COOLDOWN_SEGUNDOS);
      setEtapa('codigo');
    } catch (err) {
      setErros({ email: tratarErroApi(err).mensagemGeral ?? 'Erro ao enviar código.' });
    } finally {
      setCarregando(false);
    }
  };

  const verificarCodigo = () => {
    // Validação local (6 dígitos); a verificação real acontece na redefinição
    const erroCodigo = validarCodigoVerificacao(codigo);
    if (erroCodigo) {
      setErros({ codigo: erroCodigo });
      return;
    }
    setErros({});
    setEtapa('nova-senha');
  };

  const redefinirSenha = async () => {
    const novosErros = validarFormulario(
      { novaSenha, confirmarSenha },
      {
        novaSenha: validarSenhaRedefinicao,
        confirmarSenha: validarConfirmarSenha(novaSenha),
      }
    );
    if (Object.keys(novosErros).length > 0) {
      setErros(novosErros);
      return;
    }

    setErros({});
    setCarregando(true);
    try {
      // O backend valida email + código + novaSenha em uma chamada
      await redefinirSenhaEmail(email.trim().toLowerCase(), soDigitos(codigo), novaSenha);
      setConcluido(true);
    } catch (err) {
      const tratado = tratarErroApi(err);
      // Código inválido/expirado → voltar para a etapa de código
      if (tratado.erroCodigo) {
        setErros({ codigo: tratado.erroCodigo });
        setEtapa('codigo');
      } else {
        setErros({ novaSenha: tratado.mensagemGeral ?? 'Erro ao redefinir senha.' });
      }
    } finally {
      setCarregando(false);
    }
  };

  // Auto-submit do código ao completar 6 dígitos
  const mudarCodigo = (valor: string) => {
    const limpo = soDigitos(valor).slice(0, 6);
    setCodigo(limpo);
    setErros((prev) => { const n = { ...prev }; delete n.codigo; return n; });
    if (limpo.length === 6) setEtapa('nova-senha');
  };

  if (concluido) {
    return (
      <div className={estilos.container}>
        <Cartao className={estilos.cartao}>
          <div className={estilos.sucessoWrapper}>
            <div className={estilos.circuloSucesso}>
              <CheckCircle size={36} />
            </div>
            <h2 className={estilos.titulo}>Senha redefinida!</h2>
            <p className={estilos.subtitulo}>Sua senha foi atualizada com sucesso. Faça login para continuar.</p>
            <Botao variante="primario" larguraTotal onClick={() => navigate('/login')}>
              Ir para o login
            </Botao>
          </div>
        </Cartao>
      </div>
    );
  }

  return (
    <div className={estilos.container}>
      <Cartao className={estilos.cartao}>
        <div className={estilos.cabecalho}>
          <h1 className={estilos.logo}>
            <img
              src={`${process.env.PUBLIC_URL}/nhac-logo.png`}
              alt="Nhac"
              width={132}
              height={49}
            />
          </h1>
          <p className={estilos.subtituloCabecalho}>Lojas</p>
        </div>

        {/* ETAPA 1 — E-mail */}
        {etapa === 'email' && (
          <div className={estilos.corpo}>
            <h2 className={estilos.titulo}>Recuperar senha</h2>
            <p className={estilos.subtitulo}>
              Informe o e-mail cadastrado e enviaremos um código de verificação.
            </p>
            <InputTexto
              rotulo="E-mail"
              tipo="email"
              valor={email}
              aoMudar={setEmail}
              placeholder="seu@email.com"
              icone={<Mail size={18} />}
              erro={erros.email}
              obrigatorio
            />
            <Botao variante="primario" larguraTotal carregando={carregando} onClick={enviarEmail}>
              Enviar código
            </Botao>
          </div>
        )}

        {/* ETAPA 2 — Código */}
        {etapa === 'codigo' && (
          <div className={estilos.corpo}>
            <h2 className={estilos.titulo}>Verifique seu e-mail</h2>
            <p className={estilos.subtitulo}>
              Enviamos um código de 6 dígitos para <strong>{email}</strong>. Verifique sua caixa de entrada.
            </p>
            <div className={estilos.inputCodigo}>
              <input
                ref={inputCodigoRef}
                type="text"
                inputMode="numeric"
                maxLength={6}
                className={estilos.campoCodigo}
                value={codigo}
                onChange={(e) => mudarCodigo(e.target.value)}
                placeholder="000000"
                autoComplete="one-time-code"
              />
              {erros.codigo && <span className={estilos.erro}>{erros.codigo}</span>}
            </div>
            <Botao
              variante="primario"
              larguraTotal
              carregando={carregando}
              disabled={codigo.length !== 6}
              onClick={verificarCodigo}
            >
              Verificar código
            </Botao>
            <button
              type="button"
              className={estilos.linkReenviar}
              disabled={cooldown > 0 || carregando}
              onClick={enviarEmail}
            >
              {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
            </button>
          </div>
        )}

        {/* ETAPA 3 — Nova senha (backend: @Size(min=6)) */}
        {etapa === 'nova-senha' && (
          <div className={estilos.corpo}>
            <h2 className={estilos.titulo}>Nova senha</h2>
            <p className={estilos.subtitulo}>
              Escolha uma senha com pelo menos 6 caracteres.
            </p>
            <InputTexto
              rotulo="Nova senha"
              tipo={mostrarSenha ? 'text' : 'password'}
              valor={novaSenha}
              aoMudar={setNovaSenha}
              icone={<Lock size={18} />}
              erro={erros.novaSenha}
              obrigatorio
              sufixo={
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  aria-label={mostrarSenha ? 'Ocultar senhas' : 'Mostrar senhas'}
                  aria-pressed={mostrarSenha}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <InputTexto
              rotulo="Confirmar nova senha"
              tipo={mostrarConfirmar ? 'text' : 'password'}
              valor={confirmarSenha}
              aoMudar={setConfirmarSenha}
              icone={<Lock size={18} />}
              erro={erros.confirmarSenha}
              obrigatorio
              sufixo={
                <button
                  type="button"
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                  aria-label={mostrarConfirmar ? 'Ocultar confirmação' : 'Mostrar confirmação'}
                  aria-pressed={mostrarConfirmar}
                >
                  {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              }
            />
            <Botao variante="primario" larguraTotal carregando={carregando} onClick={redefinirSenha}>
              Redefinir senha
            </Botao>
          </div>
        )}

        <div className={estilos.rodape}>
          <Link to="/login" className={estilos.linkVoltar}>
            <ArrowLeft size={16} />
            Voltar para o login
          </Link>
        </div>
      </Cartao>
    </div>
  );
}