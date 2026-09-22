import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import LayoutPagina from "../../components/layout/LayoutPagina";
import Cartao from "../../components/ui/Cartao";
import InputTexto from "../../components/ui/InputTexto";
import Toggle from "../../components/ui/Toggle";
import Botao from "../../components/ui/Botao";
import { Mail, Phone, Lock, Eye, EyeOff, Bell } from "lucide-react";
import {
  alterarSenha,
  atualizarUsuario,
  buscarPreferenciasNotificacao,
  atualizarPreferenciasNotificacao,
  PreferenciasNotificacaoDTO,
} from "../../services/api";
import { tratarErroApi } from "../../utils/errosApi";
import {
  validarEmail,
  validarTelefone,
  validarSenhaRedefinicao,
  validarConfirmarSenha,
  validarFormulario,
  soDigitos,
} from "../../validators";
import { useToast } from "../../contexts/ToastContext";
import { useAutenticacao } from "../../hooks/useAutenticacao";
import { mascaraTelefone } from "../../utils/formatacao";
import estilos from "./PaginaConfiguracoesConta.module.css";

const PaginaConfiguracoesConta = () => {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const { usuario, definirSessao } = useAutenticacao();

  const usuarioId = usuario?.id ?? "";

  // Dados da conta — vêm da sessão (login/cadastro), sem mock.
  const [email, setEmail] = useState(usuario?.email ?? "");
  const [telefone, setTelefone] = useState(usuario?.telefone ?? "");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [editandoEmail, setEditandoEmail] = useState(false);
  const [editandoTelefone, setEditandoTelefone] = useState(false);
  const [editandoSenha, setEditandoSenha] = useState(false);
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [salvandoEmail, setSalvandoEmail] = useState(false);
  const [salvandoTelefone, setSalvandoTelefone] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});

  // Notificações — GET/PUT /usuarios/{id}/preferencias-notificacao
  const [preferencias, setPreferencias] = useState<PreferenciasNotificacaoDTO>({
    notificarNovoPedido: true,
    notificarMensagens: true,
    notificarAvaliacoes: false,
    notificarNovidades: false,
  });
  const [carregandoPreferencias, setCarregandoPreferencias] = useState(true);
  const [salvandoPreferencias, setSalvandoPreferencias] = useState(false);

  useEffect(() => {
    if (!usuarioId) {
      setCarregandoPreferencias(false);
      return;
    }

    let ativo = true;
    (async () => {
      try {
        const dados = await buscarPreferenciasNotificacao(usuarioId);
        if (ativo) setPreferencias(dados);
      } catch {
        // Sem preferências salvas ainda (ou serviço indisponível): mantém os
        // padrões da tela; o usuário ainda pode alternar e salvar.
      } finally {
        if (ativo) setCarregandoPreferencias(false);
      }
    })();

    return () => {
      ativo = false;
    };
  }, [usuarioId]);

  /**
   * O PUT substitui as 4 preferências de uma vez (todos obrigatórios no DTO),
   * então sempre enviamos o objeto completo.
   */
  const alternarPreferencia = async (campo: keyof PreferenciasNotificacaoDTO, valor: boolean) => {
    if (!usuarioId) return;

    const anterior = preferencias;
    const novas = { ...preferencias, [campo]: valor };
    setPreferencias(novas);
    setSalvandoPreferencias(true);
    try {
      const salvas = await atualizarPreferenciasNotificacao(usuarioId, novas);
      setPreferencias(salvas);
    } catch (err) {
      // Reverte para não mentir sobre o que está gravado no servidor.
      setPreferencias(anterior);
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? "Erro ao salvar preferências.");
    } finally {
      setSalvandoPreferencias(false);
    }
  };

  /** Sincroniza a sessão local (localStorage) com o retorno do backend. */
  const sincronizarSessao = (dados: { email?: string; telefone?: string }, tokenNovo?: string) => {
    const token = tokenNovo || localStorage.getItem("@nhac:token") || "";
    definirSessao(token, {
      id: usuarioId,
      nomeCompleto: usuario?.nomeCompleto ?? "",
      email: dados.email ?? usuario?.email ?? "",
      telefone: dados.telefone ?? usuario?.telefone ?? "",
      cargo: usuario?.cargo ?? "administrador",
      lojaId: usuario?.lojaId ?? "",
      fotoUrl: usuario?.fotoUrl,
    });
  };

  /**
   * PUT /usuarios/{id} — atualização parcial; devolve um token novo
   * (LoginResponseDTO), então renovamos a sessão após salvar.
   */
  const handleSalvarEmail = async () => {
    const erro = validarEmail(email);
    setErros(erro ? { email: erro } : {});
    if (erro) return;
    if (!usuarioId) return;

    const emailNormalizado = email.trim().toLowerCase();
    if (emailNormalizado === (usuario?.email ?? "").toLowerCase()) {
      setEditandoEmail(false);
      return;
    }

    setSalvandoEmail(true);
    try {
      const resposta = await atualizarUsuario(usuarioId, { email: emailNormalizado });
      const emailSalvo = resposta.email ?? emailNormalizado;
      setEmail(emailSalvo);
      sincronizarSessao({ email: emailSalvo }, resposta.accessToken);
      setEditandoEmail(false);
      setErros({});
      mostrarToast("E-mail atualizado com sucesso.");
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.errosCampos) {
        setErros(tratado.errosCampos);
      } else if (tratado.sugerirLogin) {
        setErros({ email: tratado.mensagemGeral ?? "E-mail já cadastrado." });
      } else {
        setErros({ email: tratado.mensagemGeral ?? "Erro ao salvar e-mail." });
      }
    } finally {
      setSalvandoEmail(false);
    }
  };

  const handleSalvarTelefone = async () => {
    const erro = validarTelefone(telefone);
    setErros(erro ? { telefone: erro } : {});
    if (erro) return;
    if (!usuarioId) return;

    // Cadastro/login gravam o telefone só com dígitos — mantemos o padrão.
    const telefoneDigitos = soDigitos(telefone);
    if (telefoneDigitos === (usuario?.telefone ?? "")) {
      setEditandoTelefone(false);
      return;
    }

    setSalvandoTelefone(true);
    try {
      const resposta = await atualizarUsuario(usuarioId, { telefone: telefoneDigitos });
      // LoginResponseDTO (retorno do PUT /usuarios/{id}) não devolve
      // `telefone`, então confirmamos com o valor que enviamos.
      const telefoneSalvo = telefoneDigitos;
      setTelefone(telefoneSalvo);
      sincronizarSessao({ telefone: telefoneSalvo }, resposta.accessToken);
      setEditandoTelefone(false);
      setErros({});
      mostrarToast("Telefone atualizado com sucesso.");
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.errosCampos) {
        setErros(tratado.errosCampos);
      } else {
        setErros({ telefone: tratado.mensagemGeral ?? "Erro ao salvar telefone." });
      }
    } finally {
      setSalvandoTelefone(false);
    }
  };

  /**
   * Altera a senha via PUT /auth/alterar-senha.
   * Backend: novaSenha @Size(min=6); 401 se a senha atual estiver incorreta.
   */
  const handleSalvarSenha = async () => {
    const novosErros = validarFormulario(
      { senha, confirmarSenha },
      {
        senha: validarSenhaRedefinicao,
        confirmarSenha: validarConfirmarSenha(senha),
      }
    );
    setErros(novosErros);
    if (Object.keys(novosErros).length > 0) return;

    setSalvandoSenha(true);
    try {
      await alterarSenha(senha, senha);
      setSenha("");
      setConfirmarSenha("");
      setErros({});
      setEditandoSenha(false);
      mostrarToast("Senha alterada com sucesso.");
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErros({ senha: tratado.mensagemGeral ?? "Erro ao alterar senha." });
    } finally {
      setSalvandoSenha(false);
    }
  };

  return (
    <LayoutPagina titulo="Configurações da conta">
      <div className={estilos.container}>
        {/* Dados de acesso */}
        <Cartao className={estilos.secao}>
          <h3 className={estilos.tituloSecao}>Dados de acesso</h3>

          {/* E-mail */}
          <div className={estilos.itemConta}>
            <div className={estilos.itemInfo}>
              <Mail size={18} className={estilos.icone} />
              <div className={estilos.itemTextos}>
                <span className={estilos.itemRotulo}>E-mail</span>
                {editandoEmail ? (
                  <InputTexto
                    rotulo=""
                    valor={email}
                    aoMudar={setEmail}
                    tipo="email"
                    erro={erros.email}
                  />
                ) : (
                  <span className={estilos.itemValor}>{email}</span>
                )}
              </div>
            </div>
            <div className={estilos.itemAcoes}>
              {editandoEmail ? (
                <>
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    onClick={() => setEditandoEmail(false)}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    variante="primario"
                    tamanho="pequeno"
                    carregando={salvandoEmail}
                    onClick={handleSalvarEmail}
                  >
                    Salvar
                  </Botao>
                </>
              ) : (
                <Botao
                  variante="secundario"
                  tamanho="pequeno"
                  onClick={() => setEditandoEmail(true)}
                >
                  Editar
                </Botao>
              )}
            </div>
          </div>

          <div className={estilos.divisor} />

          {/* Telefone */}
          <div className={estilos.itemConta}>
            <div className={estilos.itemInfo}>
              <Phone size={18} className={estilos.icone} />
              <div className={estilos.itemTextos}>
                <span className={estilos.itemRotulo}>Telefone</span>
                {editandoTelefone ? (
                  <InputTexto
                    rotulo=""
                    valor={telefone}
                    aoMudar={(v) => setTelefone(mascaraTelefone(v))}
                    placeholder="(11) 99999-0000"
                    erro={erros.telefone}
                  />
                ) : (
                  <span className={estilos.itemValor}>
                    {telefone ? mascaraTelefone(telefone) : "Não informado"}
                  </span>
                )}
              </div>
            </div>
            <div className={estilos.itemAcoes}>
              {editandoTelefone ? (
                <>
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    onClick={() => setEditandoTelefone(false)}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    variante="primario"
                    tamanho="pequeno"
                    carregando={salvandoTelefone}
                    onClick={handleSalvarTelefone}
                  >
                    Salvar
                  </Botao>
                </>
              ) : (
                <Botao
                  variante="secundario"
                  tamanho="pequeno"
                  onClick={() => setEditandoTelefone(true)}
                >
                  Editar
                </Botao>
              )}
            </div>
          </div>

          <div className={estilos.divisor} />

          {/* Senha */}
          <div className={estilos.itemConta}>
            <div className={estilos.itemInfo}>
              <Lock size={18} className={estilos.icone} />
              <div className={estilos.itemTextos}>
                <span className={estilos.itemRotulo}>Senha</span>
                {editandoSenha ? (
                  <div>
                    <InputTexto
                      rotulo=""
                      tipo={mostrarSenha ? "text" : "password"}
                      valor={senha}
                      aoMudar={setSenha}
                      placeholder="Nova senha (mínimo 6 caracteres)"
                      erro={erros.senha}
                      sufixo={
                        <button
                          type="button"
                          onClick={() => setMostrarSenha(!mostrarSenha)}
                          aria-label={mostrarSenha ? "Ocultar senhas" : "Mostrar senhas"}
                          aria-pressed={mostrarSenha}
                        >
                          {mostrarSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      }
                    />
                    <InputTexto
                      rotulo=""
                      tipo={mostrarSenha ? "text" : "password"}
                      valor={confirmarSenha}
                      aoMudar={setConfirmarSenha}
                      placeholder="Confirmar nova senha"
                      erro={erros.confirmarSenha}
                    />
                  </div>
                ) : (
                  <span className={estilos.itemValor}>••••••••</span>
                )}
              </div>
            </div>
            <div className={estilos.itemAcoes}>
              {editandoSenha ? (
                <>
                  <Botao
                    variante="fantasma"
                    tamanho="pequeno"
                    onClick={() => setEditandoSenha(false)}
                  >
                    Cancelar
                  </Botao>
                  <Botao
                    variante="primario"
                    tamanho="pequeno"
                    carregando={salvandoSenha}
                    onClick={handleSalvarSenha}
                  >
                    Salvar
                  </Botao>
                </>
              ) : (
                <Botao
                  variante="secundario"
                  tamanho="pequeno"
                  onClick={() => setEditandoSenha(true)}
                >
                  Alterar
                </Botao>
              )}
            </div>
          </div>
        </Cartao>

        {/* Notificações */}
        <Cartao className={estilos.secao}>
          <div className={estilos.secaoTitulo}>
            <Bell size={18} className={estilos.icone} />
            <h3 className={estilos.tituloSecao}>Notificações</h3>
          </div>

          <div className={estilos.listaToggles}>
            <Toggle
              rotulo="Novos pedidos"
              ativo={preferencias.notificarNovoPedido}
              aoMudar={(v) => alternarPreferencia("notificarNovoPedido", v)}
              desabilitado={carregandoPreferencias || salvandoPreferencias}
            />
            <div className={estilos.divisor} />
            <Toggle
              rotulo="Mensagens de clientes"
              ativo={preferencias.notificarMensagens}
              aoMudar={(v) => alternarPreferencia("notificarMensagens", v)}
              desabilitado={carregandoPreferencias || salvandoPreferencias}
            />
            <div className={estilos.divisor} />
            <Toggle
              rotulo="Avaliações"
              ativo={preferencias.notificarAvaliacoes}
              aoMudar={(v) => alternarPreferencia("notificarAvaliacoes", v)}
              desabilitado={carregandoPreferencias || salvandoPreferencias}
            />
            <div className={estilos.divisor} />
            <Toggle
              rotulo="Novidades e promoções da Nhac"
              ativo={preferencias.notificarNovidades}
              aoMudar={(v) => alternarPreferencia("notificarNovidades", v)}
              desabilitado={carregandoPreferencias || salvandoPreferencias}
            />
          </div>
        </Cartao>

        <div className={estilos.acoesRodape}>
          <Botao variante="fantasma" onClick={() => navigate("/configuracoes")}>
            Voltar
          </Botao>
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaConfiguracoesConta;