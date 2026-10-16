import { prepararImagemProduto } from '../../utils/imagemProduto';
import { AvisoModelo } from '../../utils/feedback';
import AvisoFormulario from '../../components/ui/AvisoFormulario';
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LayoutPagina from "../../components/layout/LayoutPagina";
import InputTexto from "../../components/ui/InputTexto";
import Seletor from "../../components/ui/Seletor";
import Botao from "../../components/ui/Botao";
import Cartao from "../../components/ui/Cartao";
import Toggle from "../../components/ui/Toggle";
import ModalConfirmacao from "../../components/ui/ModalConfirmacao";
import { CATEGORIAS_PRODUTO } from "../../dados/categorias";
import { Upload, Trash2, Plus } from "lucide-react";
import {
  buscarProduto,
  criarProduto,
  atualizarProduto,
  desativarProduto,
  enviarImagem,
  ProdutoLojistaDTO,
  GrupoAdicionalDTO,
} from "../../services/api";
import { useToast } from "../../contexts/ToastContext";
import {
  validarNomeProduto,
  validarDescricaoProduto,
  validarPreco,
  validarCategoria,
  validarFormulario,
  parsePreco,
  limparTexto,
  validarEstoque,
  validarArquivoImagem,
} from "../../validators";
import { tratarErroApi } from "../../utils/errosApi";
import estilos from "./PaginaFormularioProduto.module.css";

const PaginaFormularioProduto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const ehEdicao = !!id && id !== "novo";

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [preco, setPreco] = useState("");
  const [categoria, setCategoria] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [fotoUrl, setFotoUrl] = useState("");
  const [adicionais, setAdicionais] = useState<GrupoAdicionalDTO[]>([]);
  // Campos que não têm input nesta tela, mas fazem parte do ProdutoLojistaDTO.
  // Precisam ser preservados no PUT — se ficassem de fora do payload, o
  // backend sobrescreveria peso/desconto/estoque com null.
  const [peso, setPeso] = useState<string>("");
  const [percentualDesconto, setPercentualDesconto] = useState<string>("");
  const [estoque, setEstoque] = useState<string>("100");
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [produtoCarregado, setProdutoCarregado] = useState(!ehEdicao);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [aviso, setAviso] = useState<AvisoModelo | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosTocados, setErrosTocados] = useState<Record<string, boolean>>({});
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  // Erro exibido por campo: on blur ou on submit — nunca on change
  const erroCampo = (campo: string): string | undefined =>
    errosTocados[campo] ? erros[campo] : undefined;

  const tocarCampo = (
    campo: string,
    valor: string,
    validar: (v: string) => string | null,
  ) => {
    setErrosTocados((prev) => ({ ...prev, [campo]: true }));
    const erroValidacao = validar(valor);
    setErros((prev) => {
      const novos = { ...prev };
      if (erroValidacao) novos[campo] = erroValidacao;
      else delete novos[campo];
      return novos;
    });
  };

  const validarTudo = (): boolean => {
    const novosErros = validarFormulario(
      { nome, descricao, preco, categoria, estoque },
      {
        nome: validarNomeProduto,
        descricao: validarDescricaoProduto,
        preco: validarPreco,
        categoria: validarCategoria,
        estoque: validarEstoque,
      },
    );
    adicionais.forEach((grupo, indice) => {
      if (!grupo.nome.trim())
        novosErros[`grupo-${indice}`] = "Informe o nome do grupo.";
      if (grupo.itens.length === 0)
        novosErros[`itens-${indice}`] = "Adicione ao menos uma opção.";
      if (grupo.obrigatorio && (grupo.minimo ?? 0) < 1)
        novosErros[`minimo-${indice}`] =
          "Grupo obrigatório exige ao menos uma escolha.";
      if (
        (grupo.maximo ?? 1) < (grupo.minimo ?? 0) ||
        (grupo.maximo ?? 1) > grupo.itens.length
      ) {
        novosErros[`maximo-${indice}`] =
          "O máximo deve ficar entre o mínimo e o número de opções.";
      }
      grupo.itens.forEach((item, itemIndice) => {
        if (
          !item.nome.trim() ||
          !Number.isFinite(item.preco) ||
          item.preco < 0
        ) {
          novosErros[`item-${indice}-${itemIndice}`] =
            "Informe o nome e um preço válido.";
        }
      });
    });
    setErros(novosErros);
    setErrosTocados({
      nome: true,
      descricao: true,
      preco: true,
      categoria: true,
      estoque: true,
    });
    return Object.keys(novosErros).length === 0;
  };

  const carregarProduto = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
    setAviso(null);
      if (!id) return;
      const produto = await buscarProduto(id);
      setProdutoCarregado(true);
      setNome(produto.nome);
      setDescricao(produto.descricao || "");
      setPreco(produto.preco.toString());
      setCategoria(produto.categoriaMenu);
      setAtivo(produto.ativo);
      setFotoUrl(produto.imagemUrl || "");
      setAdicionais(produto.adicionais || []);
      setPeso(produto.peso != null ? String(produto.peso) : "");
      setPercentualDesconto(
        produto.percentualDesconto != null
          ? String(produto.percentualDesconto)
          : "",
      );
      setEstoque(produto.estoque != null ? String(produto.estoque) : "");
    } catch (err) {
      setErro(err instanceof Error ? err.message : "Erro ao carregar produto");
    } finally {
      setCarregando(false);
    }
  }, [id]);

  /** Envia a imagem para POST /uploads/imagem e guarda a URL persistente. */
  const handleSelecionarImagem = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const arquivo = e.target.files?.[0];
    // Permite reselecionar o mesmo arquivo depois de um erro
    e.target.value = "";
    if (!arquivo || enviandoImagem) return;

    // Mesmas regras do backend: JPG/PNG/WEBP até 5 MB (evita request inútil).
    const erroArquivo = validarArquivoImagem(arquivo);
    if (erroArquivo) {
      setAviso(null);
      setErro(erroArquivo);
      return;
    }

    setErro(null);
    setAviso(null);
    setEnviandoImagem(true);
    try {
      const url = await enviarImagem(await prepararImagemProduto(arquivo), "produtos");
      setFotoUrl(url);
    } catch (err) {
      const tratado = tratarErroApi(err);
      setAviso(tratado.aviso || null);
      if (tratado.errosCampos) setErros(tratado.errosCampos);
      setErro(tratado.mensagemGeral ?? "Não foi possível enviar a imagem.");
    } finally {
      setEnviandoImagem(false);
    }
  };

  useEffect(() => {
    if (ehEdicao) {
      carregarProduto();
    }
  }, [ehEdicao, carregarProduto]);

  const opcoesCategorias = [
    { valor: "", rotulo: "Selecione uma categoria" },
    ...(categoria && !CATEGORIAS_PRODUTO.some((item) => item === categoria)
      ? [{ valor: categoria, rotulo: categoria }]
      : []),
    ...CATEGORIAS_PRODUTO.map((c) => ({ valor: c, rotulo: c })),
  ];

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (salvando || !produtoCarregado) return;
    if (enviandoImagem) {
      setErro("Aguarde o envio da imagem antes de salvar.");
      return;
    }
    setErro(null);
    setAviso(null);
    if (!validarTudo()) return;

    setSalvando(true);
    try {
      const dadosProduto: ProdutoLojistaDTO = {
        // Trim em todo texto antes de enviar; preco convertido para number
        nome: limparTexto(nome),
        descricao: descricao.trim(),
        preco: parsePreco(preco),
        categoriaMenu: limparTexto(categoria),
        imagemUrl: fotoUrl || undefined,
        ativo,
        adicionais,
        // Campos sem input nesta tela: reenviados como vieram do backend para
        // o PUT não zerá-los (o DTO aceita `peso` string e estoque absoluto).
        peso: peso || undefined,
        percentualDesconto: percentualDesconto
          ? Number(percentualDesconto)
          : undefined,
        estoque: Number(estoque),
      };

      if (ehEdicao && id) {
        await atualizarProduto(id, dadosProduto);
        mostrarToast("Produto atualizado com sucesso!");
      } else {
        await criarProduto(dadosProduto);
        mostrarToast("Produto criado com sucesso!");
      }
      navigate("/produtos");
    } catch (err) {
      const tratado = tratarErroApi(err);
      setAviso(tratado.aviso || null);
      if (tratado.errosCampos) setErros(tratado.errosCampos);
      setErro(tratado.mensagemGeral ?? "Erro ao salvar produto.");
    } finally {
      // Após erro de rede/backend, reabilitar o botão para permitir retry
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    try {
      if (!id) return;
      await desativarProduto(id);
      navigate("/produtos");
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? "Erro ao excluir produto.", { tipo: 'erro' });
    }
  };

  return (
    <LayoutPagina titulo={ehEdicao ? "Editar Produto" : "Novo Produto"}>
      <form onSubmit={handleSalvar} noValidate className={estilos.form}>
        {carregando && <p className={estilos.status}>Carregando produto...</p>}
        {erro && (
          <AvisoFormulario mensagem={erro} aviso={aviso || undefined} />
        )}
        <div className={estilos.container}>
          <Cartao className={estilos.secao}>
            <h3 className={estilos.tituloSecao}>Informações Básicas</h3>
            <div className={estilos.gridCampos}>
              <InputTexto
                rotulo="Nome do Produto"
                valor={nome}
                aoMudar={setNome}
                erro={erroCampo("nome")}
                onBlur={() => tocarCampo("nome", nome, validarNomeProduto)}
                obrigatorio
              />
              <Seletor
                rotulo="Categoria"
                valor={categoria}
                aoMudar={setCategoria}
                opcoes={opcoesCategorias}
                erro={erros.categoria}
                obrigatorio
              />
              <InputTexto
                rotulo="Preço"
                valor={preco}
                aoMudar={setPreco}
                erro={erroCampo("preco")}
                onBlur={() => tocarCampo("preco", preco, validarPreco)}
                obrigatorio
              />
              <InputTexto
                rotulo="Descrição"
                valor={descricao}
                aoMudar={setDescricao}
                erro={erroCampo("descricao")}
              />

              <div className={estilos.uploadWrapper}>
                <span className={estilos.rotulo}>Foto do Produto</span>
                <div
                  className={estilos.areaUpload}
                  role="button"
                  tabIndex={enviandoImagem ? -1 : 0}
                  aria-label="Selecionar foto do produto"
                  aria-disabled={enviandoImagem}
                  aria-describedby="formato-foto-produto"
                  onClick={() => !enviandoImagem && arquivoInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      if (!enviandoImagem) arquivoInputRef.current?.click();
                    }
                  }}
                >
                  {fotoUrl ? (
                    <img
                      src={fotoUrl}
                      alt={nome || "Imagem do produto"}
                      className={estilos.previewImagem}
                    />
                  ) : (
                    <>
                      <Upload size={32} color="var(--nhac-primaria)" />
                      <p>
                        {enviandoImagem
                          ? "Enviando imagem..."
                          : "Clique para enviar uma imagem"}
                      </p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={enviandoImagem}
                    ref={arquivoInputRef}
                    onChange={handleSelecionarImagem}
                    style={{ display: "none" }}
                  />
                </div>
                <small id="formato-foto-produto" className={estilos.ajudaImagem}>JPG, PNG ou WEBP até 5 MB. A foto será ajustada para 800 × 800 (1:1), sem cortes, com fundo branco.</small>
                {enviandoImagem && <p role="status">Preparando e enviando imagem...</p>}
                {fotoUrl && (
                  <button
                    type="button"
                    disabled={enviandoImagem}
                    onClick={() => setFotoUrl("")}
                    style={{
                      marginTop: 8,
                      background: "none",
                      border: "none",
                      color: "var(--nhac-erro, #e53935)",
                      cursor: "pointer",
                      fontSize: "0.8125rem",
                    }}
                  >
                    Remover imagem
                  </button>
                )}
              </div>

              <div className={estilos.toggleWrapper}>
                <Toggle
                  ativo={ativo}
                  aoMudar={setAtivo}
                  rotulo="Produto Ativo"
                />
              </div>

              {
                <InputTexto
                  rotulo="Estoque (unidades)"
                  valor={estoque}
                  aoMudar={(v) => setEstoque(v.replace(/\D/g, ""))}
                  placeholder="Ex.: 100"
                  erro={erroCampo("estoque")}
                  onBlur={() => tocarCampo("estoque", estoque, validarEstoque)}
                />
              }
            </div>
          </Cartao>

          <Cartao className={estilos.secao}>
            <div className={estilos.cabecalhoSecao}>
              <h3 className={estilos.tituloSecao}>Adicionais</h3>
              <Botao
                type="button"
                variante="secundario"
                icone={<Plus size={16} />}
                onClick={() =>
                  setAdicionais([
                    ...adicionais,
                    {
                      nome: "",
                      obrigatorio: false,
                      minimo: 0,
                      maximo: 1,
                      itens: [],
                    },
                  ])
                }
              >
                Novo Grupo
              </Botao>
            </div>

            {adicionais.length === 0 ? (
              <p className={estilos.vazio}>
                Nenhum grupo de adicional configurado.
              </p>
            ) : (
              <div className={estilos.listaAdicionais}>
                {adicionais.map((grupo, idx) => (
                  <div key={idx} className={estilos.grupoAdicional}>
                    <div className={estilos.linhaGrupo}>
                      <InputTexto
                        rotulo="Nome do grupo"
                        valor={grupo.nome}
                        erro={erros[`grupo-${idx}`]}
                        aoMudar={(v) => {
                          setAdicionais((prev) =>
                            prev.map((g, i) =>
                              i === idx ? { ...g, nome: v } : g,
                            ),
                          );
                        }}
                        placeholder="Ex.: Escolha seu molho"
                      />
                      <Toggle
                        ativo={grupo.obrigatorio}
                        aoMudar={(v) => {
                          setAdicionais((prev) =>
                            prev.map((g, i) =>
                              i === idx
                                ? { ...g, obrigatorio: v, minimo: v ? 1 : 0 }
                                : g,
                            ),
                          );
                        }}
                        rotulo="Obrigatório"
                      />
                      <Botao
                        type="button"
                        variante="perigo"
                        icone={<Trash2 size={16} />}
                        aria-label={`Remover grupo ${grupo.nome || idx + 1}`}
                        onClick={() => {
                          const novos = [...adicionais];
                          novos.splice(idx, 1);
                          setAdicionais(novos);
                        }}
                      />
                    </div>
                    <div className={estilos.linhaItem}>
                      <InputTexto
                        rotulo="Mínimo"
                        type="number"
                        min={grupo.obrigatorio ? 1 : 0}
                        max={grupo.itens.length}
                        valor={String(grupo.minimo ?? 0)}
                        erro={erros[`minimo-${idx}`]}
                        aoMudar={(v) =>
                          setAdicionais((prev) =>
                            prev.map((g, i) =>
                              i === idx ? { ...g, minimo: Number(v) } : g,
                            ),
                          )
                        }
                      />
                      <InputTexto
                        rotulo="Máximo"
                        type="number"
                        min={1}
                        max={grupo.itens.length}
                        valor={String(grupo.maximo ?? 1)}
                        erro={erros[`maximo-${idx}`]}
                        aoMudar={(v) =>
                          setAdicionais((prev) =>
                            prev.map((g, i) =>
                              i === idx ? { ...g, maximo: Number(v) } : g,
                            ),
                          )
                        }
                      />
                    </div>
                    {grupo.itens.map((item, itemIdx) => (
                      <div className={estilos.linhaItem} key={itemIdx}>
                        <InputTexto
                          rotulo="Opção"
                          valor={item.nome}
                          erro={erros[`item-${idx}-${itemIdx}`]}
                          aoMudar={(v) =>
                            setAdicionais((prev) =>
                              prev.map((g, i) =>
                                i === idx
                                  ? {
                                      ...g,
                                      itens: g.itens.map((it, j) =>
                                        j === itemIdx ? { ...it, nome: v } : it,
                                      ),
                                    }
                                  : g,
                              ),
                            )
                          }
                        />
                        <InputTexto
                          rotulo="Preço adicional (R$)"
                          type="number"
                          min={0}
                          step="0.01"
                          valor={String(item.preco)}
                          aoMudar={(v) =>
                            setAdicionais((prev) =>
                              prev.map((g, i) =>
                                i === idx
                                  ? {
                                      ...g,
                                      itens: g.itens.map((it, j) =>
                                        j === itemIdx
                                          ? { ...it, preco: Number(v) }
                                          : it,
                                      ),
                                    }
                                  : g,
                              ),
                            )
                          }
                        />
                        <Botao
                          type="button"
                          variante="perigo"
                          icone={<Trash2 size={16} />}
                          aria-label={`Remover opção ${item.nome || itemIdx + 1}`}
                          onClick={() =>
                            setAdicionais((prev) =>
                              prev.map((g, i) =>
                                i === idx
                                  ? {
                                      ...g,
                                      itens: g.itens.filter(
                                        (_, j) => j !== itemIdx,
                                      ),
                                    }
                                  : g,
                              ),
                            )
                          }
                        />
                      </div>
                    ))}
                    {erros[`itens-${idx}`] && (
                      <p className={estilos.erro}>{erros[`itens-${idx}`]}</p>
                    )}
                    <Botao
                      type="button"
                      variante="secundario"
                      icone={<Plus size={16} />}
                      onClick={() =>
                        setAdicionais((prev) =>
                          prev.map((g, i) =>
                            i === idx
                              ? {
                                  ...g,
                                  itens: [...g.itens, { nome: "", preco: 0 }],
                                }
                              : g,
                          ),
                        )
                      }
                    >
                      Adicionar opção
                    </Botao>
                  </div>
                ))}
              </div>
            )}
          </Cartao>
        </div>

        <div className={estilos.acoes}>
          {ehEdicao && (
            <Botao
              type="button"
              variante="perigo"
              icone={<Trash2 size={16} />}
              onClick={() => setModalExcluirAberto(true)}
            >
              Excluir produto
            </Botao>
          )}
          <div className={estilos.acoesDir}>
            <Botao
              type="button"
              variante="fantasma"
              onClick={() => navigate("/produtos")}
            >
              Cancelar
            </Botao>
            <Botao
              type="submit"
              variante="primario"
              carregando={salvando}
              disabled={enviandoImagem || carregando || !produtoCarregado}
            >
              Salvar Produto
            </Botao>
          </div>
        </div>
      </form>

      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir produto"
        mensagem={`Tem certeza que deseja excluir "${nome}"? O produto ficará inativo e poderá ser reativado na lista.`}
        textoBotaoConfirmar="Excluir"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={handleExcluir}
        aoCancelar={() => setModalExcluirAberto(false)}
      />
    </LayoutPagina>
  );
};

export default PaginaFormularioProduto;
