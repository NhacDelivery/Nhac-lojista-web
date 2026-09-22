import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import LayoutPagina from "../../components/layout/LayoutPagina";
import Cartao from "../../components/ui/Cartao";
import Botao from "../../components/ui/Botao";
import Emblema from "../../components/ui/Emblema";
import ModalConfirmacao from "../../components/ui/ModalConfirmacao";
import { StatusPedido } from "../../types";
import {
  formatarMoeda,
  formatarDataHora,
  STATUS_PEDIDO_INFO,
  FLUXO_STATUS_PEDIDO,
} from "../../utils/formatacao";
import {
  ehStatusFinal,
  podeCancelar,
  podeTransicionarComoLojista,
  proximoStatusPermitidoParaLojista,
} from "../../validators/statusPedido";
import { atualizarStatusPedido, buscarPedido, despacharPedido, PedidoDetalheLojistaDTO } from "../../services/api";
import { tratarErroApi } from "../../utils/errosApi";
import { useToast } from "../../contexts/ToastContext";
import {
  ArrowLeft,
  User,
  Phone,
  MapPin,
  CreditCard,
  Check,
  Ban,
  Bike,
} from "lucide-react";
import estilos from "./PaginaDetalhePedido.module.css";

const ROTULOS_ETAPA: Record<string, string> = {
  PENDENTE: "Recebido",
  PAGO: "Pago",
  PREPARANDO: "Em preparo",
  SAIU_ENTREGA: "A caminho",
  ENTREGUE: "Entregue",
};

function formatarEndereco(endereco: PedidoDetalheLojistaDTO["enderecoEntrega"]): string {
  if (!endereco) return "Endereço não informado";
  const linha1 = `${endereco.rua}, ${endereco.numero}${endereco.complemento ? ` - ${endereco.complemento}` : ""}`;
  const linha2 = `${endereco.bairro} - ${endereco.cidade}/${endereco.estado}`;
  return `${linha1} · ${linha2} · CEP ${endereco.cep}`;
}

const PaginaDetalhePedido = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();

  const [pedido, setPedido] = useState<PedidoDetalheLojistaDTO | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [status, setStatus] = useState<StatusPedido | undefined>(undefined);
  const [salvandoStatus, setSalvandoStatus] = useState(false);
  const [confirmacaoCancelamento, setConfirmacaoCancelamento] = useState(false);
  const [confirmacaoAvanco, setConfirmacaoAvanco] = useState<StatusPedido | null>(null);
  const [despachando, setDespachando] = useState(false);

  const carregarPedido = useCallback(async () => {
    if (!id) return;
    try {
      setCarregando(true);
      setErro(null);
      const dados = await buscarPedido(id);
      setPedido(dados);
      setStatus(dados.status as StatusPedido);
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? "Não foi possível carregar este pedido.");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  useEffect(() => {
    carregarPedido();
  }, [carregarPedido]);

  if (carregando) {
    return (
      <LayoutPagina titulo="Pedido">
        <div className={estilos.naoEncontrado}>
          <p>Carregando pedido...</p>
        </div>
      </LayoutPagina>
    );
  }

  if (erro || !pedido) {
    return (
      <LayoutPagina titulo="Pedido">
        <div className={estilos.naoEncontrado}>
          <p>{erro ?? "Pedido não encontrado."}</p>
          <Botao variante="secundario" onClick={() => navigate("/pedidos")}>
            Voltar para pedidos
          </Botao>
        </div>
      </LayoutPagina>
    );
  }

  const statusAtual = (status ?? pedido.status) as StatusPedido;
  const statusInfo = STATUS_PEDIDO_INFO[statusAtual] ?? {
    rotulo: statusAtual,
    variante: "neutro" as const,
  };
  const indiceAtual = FLUXO_STATUS_PEDIDO.indexOf(
    statusAtual as (typeof FLUXO_STATUS_PEDIDO)[number],
  );
  const cancelado = statusAtual === "CANCELADO";
  const podeCancelarAgora = podeCancelar(statusAtual);
  const statusFinal = ehStatusFinal(statusAtual);
  const proximoStatusLojista = proximoStatusPermitidoParaLojista(statusAtual);
  const codigoPedido = pedido.id.slice(0, 8);

  const avancarFluxo = () => {
    if (!proximoStatusLojista) return;
    setConfirmacaoAvanco(proximoStatusLojista);
  };

  const aplicarTransicao = async (novoStatus: StatusPedido) => {
    const ehCancelamentoPermitido = novoStatus === "CANCELADO" && podeCancelar(statusAtual);
    if (!ehCancelamentoPermitido && !podeTransicionarComoLojista(statusAtual, novoStatus)) {
      mostrarToast("Transição de status inválida.");
      return;
    }
    setSalvandoStatus(true);
    try {
      await atualizarStatusPedido(pedido.id, novoStatus);
      setStatus(novoStatus);
      mostrarToast(`Pedido atualizado para "${ROTULOS_ETAPA[novoStatus] ?? novoStatus}".`);
    } catch (err) {
      const tratado = tratarErroApi(err);
      if (tratado.transicaoInvalida) {
        mostrarToast(tratado.mensagemGeral ?? "Transição de status inválida.");
        setStatus(pedido.status as StatusPedido);
      } else {
        mostrarToast(tratado.mensagemGeral ?? "Erro ao atualizar status.");
      }
    } finally {
      setSalvandoStatus(false);
      setConfirmacaoAvanco(null);
      setConfirmacaoCancelamento(false);
    }
  };

  const reenviarOferta = async () => {
    setDespachando(true);
    try {
      const ofertas = await despacharPedido(pedido.id);
      mostrarToast(
        ofertas.length > 0
          ? `Oferta reenviada para ${ofertas.length} entregador(es).`
          : "Nenhum entregador disponível neste momento.",
      );
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? "Não foi possível buscar entregadores.");
    } finally {
      setDespachando(false);
    }
  };

  return (
    <LayoutPagina titulo={`Pedido #${codigoPedido}`}>
      <div className={estilos.container} data-testid="e2e.order.detail">
        <header className={estilos.cabecalho}>
          <button className={estilos.botaoVoltar} onClick={() => navigate("/pedidos")} aria-label="Voltar">
            <ArrowLeft size={20} />
          </button>
          <h2 className={estilos.titulo}>Pedido #{codigoPedido}</h2>
          <Emblema variante={statusInfo.variante} className={estilos.emblemaTopo} data-testid="e2e.order.status">
            {statusInfo.rotulo}
          </Emblema>
        </header>

        <div className={estilos.colunas}>
          <div className={estilos.colunaPrincipal}>
            <section>
              <h3 className={estilos.tituloSecao}>Informações do cliente</h3>
              <Cartao className={estilos.cartaoInfo}>
                <div className={estilos.linhaInfo}>
                  <User size={18} className={estilos.iconeInfo} />
                  <span>{pedido.clienteNome}</span>
                </div>
                <div className={estilos.divisor} />
                <div className={estilos.linhaInfo}>
                  <Phone size={18} className={estilos.iconeInfo} />
                  <span>{pedido.clienteTelefone ?? "Telefone não informado"}</span>
                </div>
                <div className={estilos.divisor} />
                <div className={estilos.linhaInfo}>
                  <MapPin size={18} className={estilos.iconeInfo} />
                  <span>{formatarEndereco(pedido.enderecoEntrega)}</span>
                </div>
              </Cartao>
            </section>

            <section>
              <h3 className={estilos.tituloSecao}>Itens do pedido</h3>
              <Cartao className={estilos.cartaoInfo}>
                {pedido.itens.map((item) => (
                  <React.Fragment key={item.id}>
                    <div className={estilos.linhaItem}>
                      <div className={estilos.infoItem}>
                        <span className={estilos.nomeItem}>
                          {item.quantidade}x {item.nome}
                        </span>
                      </div>
                      <span className={estilos.precoItem}>
                        {formatarMoeda(item.preco * item.quantidade)}
                      </span>
                    </div>
                    <div className={estilos.divisor} />
                  </React.Fragment>
                ))}
                {pedido.observacao && (
                  <>
                    <p className={estilos.observacoes}>Obs: {pedido.observacao}</p>
                    <div className={estilos.divisor} />
                  </>
                )}
                {pedido.taxaFrete > 0 && (
                  <>
                    <div className={estilos.linhaItem}>
                      <span>Taxa de entrega</span>
                      <span>{formatarMoeda(pedido.taxaFrete)}</span>
                    </div>
                    <div className={estilos.divisor} />
                  </>
                )}
                <div className={estilos.linhaTotal}>
                  <span>Total</span>
                  <span>{formatarMoeda(pedido.valorTotal)}</span>
                </div>
              </Cartao>
            </section>

            <section>
              <h3 className={estilos.tituloSecao}>Pagamento</h3>
              <Cartao className={estilos.cartaoInfo}>
                <div className={estilos.linhaInfo}>
                  <CreditCard size={18} className={estilos.iconeInfo} />
                  <span>
                    {pedido.formaPagamento} · {formatarDataHora(pedido.criadoEm)}
                  </span>
                </div>
                {pedido.trocoPara != null && (
                  <>
                    <div className={estilos.divisor} />
                    <div className={estilos.linhaInfo}>
                      <span>Troco para {formatarMoeda(pedido.trocoPara)}</span>
                    </div>
                  </>
                )}
              </Cartao>
            </section>
          </div>

          <div className={estilos.colunaLateral}>
            <h3 className={estilos.tituloSecao}>Andamento do pedido</h3>
            <Cartao className={estilos.cartaoAndamento}>
              {cancelado ? (
                <p className={estilos.mensagemCancelado}>Este pedido foi cancelado.</p>
              ) : (
                <div className={estilos.etapas}>
                  {FLUXO_STATUS_PEDIDO.map((etapa, idx) => {
                    const completa = idx < indiceAtual;
                    const ativa = idx === indiceAtual;
                    return (
                      <div key={etapa} className={estilos.etapa}>
                        <div
                          className={`${estilos.marcador} ${completa ? estilos.marcadorCompleto : ""} ${ativa ? estilos.marcadorAtivo : ""}`}
                        >
                          {completa ? <Check size={14} strokeWidth={3} /> : idx + 1}
                        </div>
                        <span className={`${estilos.rotuloEtapa} ${ativa ? estilos.rotuloEtapaAtivo : ""}`}>
                          {ROTULOS_ETAPA[etapa]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              {statusFinal ? (
                <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--nhac-texto-claro)" }}>
                  Este pedido está em status final — não aceita mais alterações.
                </p>
              ) : proximoStatusLojista ? (
                <>
                  <Botao
                    data-testid="e2e.order.advance"
                    larguraTotal
                    carregando={salvandoStatus}
                    onClick={avancarFluxo}
                  >
                    {statusAtual === "PENDENTE" ? "Confirmar pagamento" : "Iniciar preparo"}
                  </Botao>

                  {podeCancelarAgora && (
                    <Botao
                      larguraTotal
                      variante="perigo"
                      disabled={salvandoStatus}
                      icone={<Ban size={16} />}
                      onClick={() => setConfirmacaoCancelamento(true)}
                    >
                      Cancelar pedido
                    </Botao>
                  )}
                </>
              ) : (
                <div data-testid="e2e.order.delivery-state">
                  <p style={{ marginTop: 0, fontSize: "0.875rem", color: "var(--nhac-texto-claro)" }}>
                    {statusAtual === "PREPARANDO"
                      ? "Pedido em preparo. Aguardando um entregador aceitar e coletar."
                      : "Pedido coletado. A entrega agora é conduzida pelo entregador."}
                  </p>
                  {statusAtual === "PREPARANDO" && (
                    <Botao
                      data-testid="e2e.order.redispatch"
                      larguraTotal
                      variante="secundario"
                      carregando={despachando}
                      icone={<Bike size={16} />}
                      onClick={reenviarOferta}
                    >
                      Buscar entregador novamente
                    </Botao>
                  )}
                </div>
              )}
            </Cartao>
          </div>
        </div>
      </div>

      <ModalConfirmacao
        aberto={confirmacaoAvanco !== null}
        titulo="Alterar status"
        mensagem={`Confirmar alteração do pedido para "${ROTULOS_ETAPA[confirmacaoAvanco ?? ""] ?? confirmacaoAvanco}"?`}
        textoBotaoConfirmar="Confirmar"
        aoConfirmar={() => confirmacaoAvanco && aplicarTransicao(confirmacaoAvanco)}
        aoCancelar={() => setConfirmacaoAvanco(null)}
      />

      <ModalConfirmacao
        aberto={confirmacaoCancelamento}
        titulo="Cancelar pedido"
        mensagem="Tem certeza que deseja cancelar este pedido? Essa ação não pode ser desfeita."
        textoBotaoConfirmar="Cancelar pedido"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={() => aplicarTransicao("CANCELADO")}
        aoCancelar={() => setConfirmacaoCancelamento(false)}
      />
    </LayoutPagina>
  );
};

export default PaginaDetalhePedido;
