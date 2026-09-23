import React, { useState, useEffect, useRef, useCallback } from 'react';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Avatar from '../../components/ui/Avatar';
import Botao from '../../components/ui/Botao';
import {
  listarConversasPagina,
  listarMensagensPagina,
  marcarConversaComoLida,
  ConversaResumoDTO,
  MensagemDTO,
} from '../../services/api';
import { conectarChatSocket, ChatSocket } from '../../services/chatSocket';
import { tratarErroApi } from '../../utils/errosApi';
import { formatarData, formatarHora } from '../../utils/formatacao';
import { Send, ArrowLeft, MessageSquare } from 'lucide-react';
import estilos from './PaginaChat.module.css';

const MENSAGENS_PRE_PRONTAS = [
  'Pedido confirmado! ✅',
  'Seu pedido está sendo preparado 🍳',
  'Seu pedido saiu para entrega 🚗',
  'Infelizmente não temos esse item disponível',
  'Obrigado pela preferência! ⭐',
];

const PaginaChat = () => {
  const [conversas, setConversas] = useState<ConversaResumoDTO[]>([]);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | null>(null);
  const [mensagens, setMensagens] = useState<MensagemDTO[]>([]);
  const [novaMensagem, setNovaMensagem] = useState('');
  const [carregandoConversas, setCarregandoConversas] = useState(true);
  const [carregandoMensagens, setCarregandoMensagens] = useState(false);

  const [conectado, setConectado] = useState(false);
  const [erroChat, setErroChat] = useState('');
  const [paginaConversas, setPaginaConversas] = useState(0);
  const [maisConversas, setMaisConversas] = useState(false);
  const [paginaMensagens, setPaginaMensagens] = useState(0);
  const [maisMensagens, setMaisMensagens] = useState(false);
  const ativaRef = useRef<string | null>(null);
  const versaoRef = useRef(0);
  const socketRef = useRef<ChatSocket | null>(null);
  const desinscreverRef = useRef<(() => void) | null>(null);

  const conversaAtiva = conversas.find((c) => c.id === conversaAtivaId) ?? null;

  const carregarConversas = useCallback(async (pagina = 0) => {
    try {
      setCarregandoConversas(true);
      const dados = await listarConversasPagina(pagina);
      setConversas(atual => pagina === 0 ? dados.content : [...atual, ...dados.content.filter(c => !atual.some(a => a.id === c.id))]);
      setPaginaConversas(pagina);
      setMaisConversas(pagina + 1 < dados.totalPages);
      setErroChat('');
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErroChat(tratado.mensagemGeral ?? 'Não foi possível carregar as conversas.');
    } finally {
      setCarregandoConversas(false);
    }
  }, []);

  useEffect(() => {
    const socket = conectarChatSocket();
    socket.aoErro(setErroChat);
    socket.aoConectar(() => { setConectado(true); setErroChat(''); if (ativaRef.current) void carregarHistorico(ativaRef.current, 0); });
    socket.aoDesconectar(() => setConectado(false));
    socketRef.current = socket;

    carregarConversas();

    const versao = versaoRef;
    return () => {
      ativaRef.current = null;
      versao.current++;
      desinscreverRef.current?.();
      socket.desconectar();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const combinar = (atual: MensagemDTO[], novas: MensagemDTO[]) =>
    Array.from(new Map([...atual, ...novas].map(m => [m.id, m])).values())
      .sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));

  async function carregarHistorico(id: string, pagina: number) {
    const versao = ++versaoRef.current;
    setCarregandoMensagens(true);
    try {
      const historico = await listarMensagensPagina(id, pagina);
      if (ativaRef.current !== id || versao !== versaoRef.current) return;
      setMensagens(atual => combinar(atual, historico.content));
      setPaginaMensagens(pagina);
      setMaisMensagens(pagina + 1 < historico.totalPages);
      setErroChat('');
      await marcarConversaComoLida(id);
      if (ativaRef.current === id) setConversas(atual => atual.map(c => c.id === id ? { ...c, naoLidas: 0 } : c));
    } catch (err) {
      if (ativaRef.current === id && versao === versaoRef.current) setErroChat(tratarErroApi(err).mensagemGeral ?? 'Não foi possível carregar o histórico.');
    } finally {
      if (ativaRef.current === id && versao === versaoRef.current) setCarregandoMensagens(false);
    }
  }

  const handleSelecionarConversa = (id: string) => {
    desinscreverRef.current?.();
    ativaRef.current = id;
    setConversaAtivaId(id);
    setNovaMensagem('');
    setMensagens([]);
    setMaisMensagens(false);
    desinscreverRef.current = socketRef.current?.assinarConversa(id, mensagem => {
      if (ativaRef.current !== id) return;
      setMensagens(atual => combinar(atual, [mensagem]));
      setConversas(atual => atual.map(c => c.id === id ? { ...c, ultimaMensagemPreview: mensagem.conteudo, ultimaMensagemEm: mensagem.enviadaEm } : c));
      void marcarConversaComoLida(id).catch(() => {});
    }) ?? null;
    void carregarHistorico(id, 0);
  };

  const handleEnviar = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!novaMensagem.trim() || !conversaAtiva || !socketRef.current) return;

    // Não adiciona a mensagem localmente aqui — o backend faz o broadcast de
    // volta pro remetente também (a assinatura em /topic/conversas/{id} já
    // está ativa pra essa conversa), então ela chega pelo mesmo caminho que
    // a mensagem do cliente chegaria.
    if (socketRef.current.enviarMensagem(conversaAtiva.id, novaMensagem.trim())) setNovaMensagem('');
    else setErroChat('Mensagem não enviada. Aguarde a reconexão e tente novamente.');
  };

  const usarMensagemRapida = (texto: string) => {
    setNovaMensagem(texto);
  };

  return (
    <LayoutPagina titulo="Chat">
      <p role="status">{conectado ? 'Chat conectado' : 'Reconectando ao chat…'}</p>
      {erroChat && <div role="alert">{erroChat} <button onClick={() => conversaAtivaId ? carregarHistorico(conversaAtivaId, 0) : carregarConversas()}>Tentar novamente</button></div>}
      <div className={estilos.container}>
        <div className={`${estilos.listaConversas} ${conversaAtivaId ? estilos.esconderMobile : ''}`}>
          {carregandoConversas ? (
            <p style={{ padding: '1rem', color: 'var(--nhac-texto-claro)' }}>Carregando conversas...</p>
          ) : conversas.length === 0 ? (
            <p style={{ padding: '1rem', color: 'var(--nhac-texto-claro)' }}>Nenhuma conversa ainda.</p>
          ) : (
            conversas.map((conversa) => (
              <button type="button"
                key={conversa.id}
                className={`${estilos.itemConversa} ${conversaAtivaId === conversa.id ? estilos.ativo : ''}`}
                onClick={() => handleSelecionarConversa(conversa.id)}
              >
                <Avatar nome={conversa.clienteNome} tamanho="medio" />
                <div className={estilos.infoConversa}>
                  <div className={estilos.linhaTopo}>
                    <span className={estilos.nomeCliente}>{conversa.clienteNome} {conversa.participanteTipo === 'ENTREGADOR' ? '· Entregador' : ''}</span>
                    <span className={estilos.tempo}>{formatarData(conversa.ultimaMensagemEm).split(' ')[0]}</span>
                  </div>
                  <div className={estilos.linhaBase}>
                    <span className={estilos.previa}>{conversa.ultimaMensagemPreview ?? 'Sem mensagens ainda'}</span>
                  </div>
                </div>
                {conversa.naoLidas > 0 && <div className={estilos.badge}>{conversa.naoLidas}</div>}
              </button>
            ))
          )}
          {maisConversas && <Botao onClick={() => carregarConversas(paginaConversas + 1)} carregando={carregandoConversas}>Mais conversas</Botao>}
          <Botao variante="fantasma" onClick={() => carregarConversas()} disabled={carregandoConversas}>Atualizar conversas</Botao>
        </div>

        <div className={`${estilos.areaChat} ${!conversaAtivaId ? estilos.esconderMobile : ''}`}>
          {conversaAtiva ? (
            <>
              <header className={estilos.cabecalhoChat}>
                <button className={estilos.voltarMobile} aria-label="Voltar para conversas" onClick={() => { ativaRef.current = null; versaoRef.current++; desinscreverRef.current?.(); setConversaAtivaId(null); }}>
                  <ArrowLeft size={24} />
                </button>
                <Avatar nome={conversaAtiva.clienteNome} tamanho="pequeno" />
                <div className={estilos.cabecalhoInfo}>
                  <h3 className={estilos.chatNome}>{conversaAtiva.clienteNome}</h3>
                </div>
              </header>

              <div className={estilos.mensagensContainer}>
                <div className={estilos.mensagens}>
                  {maisMensagens && <Botao variante="secundario" carregando={carregandoMensagens} onClick={() => carregarHistorico(conversaAtiva.id, paginaMensagens + 1)}>Mensagens anteriores</Botao>}
                  {carregandoMensagens ? (
                    <p style={{ color: 'var(--nhac-texto-claro)', textAlign: 'center' }}>Carregando mensagens...</p>
                  ) : (
                    mensagens.map((msg) => (
                      <div
                        key={msg.id}
                        className={`${estilos.mensagemWrapper} ${msg.remetenteTipo === 'LOJA' ? estilos.minhaMensagem : estilos.mensagemCliente}`}
                      >
                        <div className={estilos.balao}>{msg.conteudo}</div>
                        <span className={estilos.hora}>{formatarHora(msg.enviadaEm)}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className={estilos.areaEnvio}>
                <div className={estilos.mensagensRapidas}>
                  {MENSAGENS_PRE_PRONTAS.map((msg, idx) => (
                    <button key={idx} className={estilos.btnMensagemRapida} onClick={() => usarMensagemRapida(msg)}>
                      {msg}
                    </button>
                  ))}
                </div>
                <form noValidate className={estilos.formEnvio} onSubmit={handleEnviar}>
                  <input
                    type="text"
                    aria-label="Mensagem"
                    maxLength={4000}
                    className={estilos.inputMensagem}
                    value={novaMensagem}
                    onChange={(e) => setNovaMensagem(e.target.value)}
                    placeholder="Digite sua mensagem..."
                  />
                  <Botao type="submit" icone={<Send size={20} />} aria-label="Enviar mensagem" disabled={!novaMensagem.trim() || !conectado} />
                </form>
              </div>
            </>
          ) : (
            <div className={estilos.estadoVazio}>
              <MessageSquare size={48} color="var(--nhac-borda)" />
              <p>Selecione uma conversa para começar a falar</p>
            </div>
          )}
        </div>
      </div>
    </LayoutPagina>
  );
};

export default PaginaChat;
