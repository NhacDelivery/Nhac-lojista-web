import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Mail } from 'lucide-react';
import { Botao } from '../ui';
import {
  enviarCodigoCadastro,
  confirmarEmailCadastro,
} from '../../services/api';
import { marcarEmailVerificado, tratarErroApi } from '../../utils/errosApi';
import { validarCodigoVerificacao, soDigitos } from '../../validators';
import estilos from './VerificacaoEmail.module.css';

interface PropsVerificacaoEmail {
  email: string;
  onVerificado: () => void;
  enviarCodigoAoMontar?: boolean;
}

const COOLDOWN_SEGUNDOS = 60;
/** Expiração do código no backend (CadastroCodigoService): 15 minutos. */
const EXPIRACAO_SEGUNDOS = 15 * 60;

export default function VerificacaoEmail({
  email,
  onVerificado,
  enviarCodigoAoMontar = true,
}: PropsVerificacaoEmail) {
  const [codigo, setCodigo] = useState('');
  const [erroCodigo, setErroCodigo] = useState('');
  const [erroGeral, setErroGeral] = useState('');
  const [bloqueado, setBloqueado] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiracaoRestante, setExpiracaoRestante] = useState(EXPIRACAO_SEGUNDOS);
  const inputRef = useRef<HTMLInputElement>(null);
  const enviadoInicial = useRef(false);

  // Cooldown do botão de reenvio (60s)
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  // Contador de expiração do código (15 min no backend)
  useEffect(() => {
    if (expiracaoRestante <= 0) return;
    const timer = window.setInterval(() => {
      setExpiracaoRestante((prev) => Math.max(prev - 1, 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [expiracaoRestante]);

  // Auto-focus ao entrar na etapa
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const enviarCodigo = useCallback(async () => {
    setErroGeral('');
    setErroCodigo('');
    setCarregando(true);
    try {
      await enviarCodigoCadastro(email);
      // Spec §3.2: cada envio invalida os anteriores — descarta qualquer
      // código digitado da tentativa antiga e foca no campo limpo.
      setCodigo('');
      setCooldown(COOLDOWN_SEGUNDOS);
      setExpiracaoRestante(EXPIRACAO_SEGUNDOS);
      inputRef.current?.focus();
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.sugerirLogin) {
        setBloqueado(true);
        setErroGeral(tratado.mensagemGeral ?? 'Este e-mail já está em uso.');
      } else if (tratado.rateLimit) {
        // Spec §7: 429 → bloquear UI com temporizador (reaproveita o cooldown).
        setCooldown(COOLDOWN_SEGUNDOS);
        setErroGeral(tratado.mensagemGeral ?? 'Muitas tentativas. Aguarde antes de reenviar.');
      } else {
        setErroGeral(tratado.mensagemGeral ?? 'Erro ao enviar código.');
      }
    } finally {
      setCarregando(false);
    }
  }, [email]);

  useEffect(() => {
    if (enviarCodigoAoMontar && !enviadoInicial.current) {
      enviadoInicial.current = true;
      enviarCodigo();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarCodigo = useCallback(async (valor: string) => {
    setErroCodigo('');
    setErroGeral('');

    const erroValidacao = validarCodigoVerificacao(valor);
    if (erroValidacao) {
      setErroCodigo(erroValidacao);
      return;
    }

    setCarregando(true);
    try {
      await confirmarEmailCadastro(email, valor);
      marcarEmailVerificado(email);
      onVerificado();
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.erroCodigo) {
        setCodigo('');
        setErroCodigo(tratado.erroCodigo);
      } else if (tratado.sugerirLogin) {
        setBloqueado(true);
        setErroGeral(tratado.mensagemGeral ?? 'Este e-mail já está em uso.');
      } else {
        setErroGeral(tratado.mensagemGeral ?? 'Erro ao confirmar código.');
      }
    } finally {
      setCarregando(false);
    }
  }, [email, onVerificado]);

  const mudarCodigo = (novoValor: string) => {
    const limpo = soDigitos(novoValor).slice(0, 6);
    setCodigo(limpo);
    setErroCodigo('');
    // Auto-submit ao completar 6 dígitos (recomendado pela spec)
    if (limpo.length === 6) {
      confirmarCodigo(limpo);
    }
  };

  if (bloqueado) {
    return (
      <div className={estilos.container}>
        <p className={estilos.descricao}>{erroGeral}</p>
        <p className={estilos.descricao}>
          Já tem uma conta?{' '}
          <Link to="/login" className={estilos.link}>
            Faça login
          </Link>
        </p>
      </div>
    );
  }

  const minutosRestantes = Math.floor(expiracaoRestante / 60);
  const segundosRestantes = expiracaoRestante % 60;
  const expirou = expiracaoRestante <= 0;

  return (
    <div className={estilos.container}>
      <div className={estilos.iconeWrapper}>
        <Mail size={32} />
      </div>
      <p className={estilos.descricao}>
        Enviamos um código de 6 dígitos para <strong>{email}</strong>.
        Digite abaixo para confirmar seu e-mail.
      </p>

      {erroGeral && <div className={estilos.erro}>{erroGeral}</div>}

      <div className={estilos.campoCodigo}>
        <label htmlFor="codigo-verificacao" className={estilos.rotulo}>
          Código de verificação
        </label>
        <input
          id="codigo-verificacao"
          ref={inputRef}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={6}
          className={`${estilos.inputCodigo} ${erroCodigo ? estilos.inputErro : ''}`}
          value={codigo}
          onChange={(e) => mudarCodigo(e.target.value)}
          placeholder="000000"
          autoComplete="one-time-code"
          disabled={carregando}
        />
        {erroCodigo && <span className={estilos.erroCampo}>{erroCodigo}</span>}
      </div>

      <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--nhac-texto-claro)' }}>
        {expirou
          ? 'O código pode ter expirado. Reenvie para gerar um novo.'
          : `O código expira em ${minutosRestantes}:${String(segundosRestantes).padStart(2, '0')}`}
      </p>

      <div className={estilos.acoes}>
        <Botao
          type="button"
          variante="primario"
          larguraTotal
          carregando={carregando}
          disabled={carregando || codigo.length !== 6}
          onClick={() => confirmarCodigo(codigo)}
        >
          Confirmar código
        </Botao>

        <Botao
          type="button"
          variante="secundario"
          larguraTotal
          disabled={cooldown > 0 || carregando}
          onClick={enviarCodigo}
        >
          {cooldown > 0 ? `Reenviar código (${cooldown}s)` : 'Reenviar código'}
        </Botao>
      </div>
    </div>
  );
}
