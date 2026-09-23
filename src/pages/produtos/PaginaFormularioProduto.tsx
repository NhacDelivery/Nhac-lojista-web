import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import InputTexto from '../../components/ui/InputTexto';
import Seletor from '../../components/ui/Seletor';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import Toggle from '../../components/ui/Toggle';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import { CATEGORIAS_PRODUTO } from '../../dados/categorias';
import { Upload, Trash2, Plus } from 'lucide-react';
import {
  buscarProduto,
  criarProduto,
  atualizarProduto,
  desativarProduto,
  enviarImagem,
  ProdutoLojistaDTO,
  GrupoAdicionalDTO,
} from '../../services/api';
import { useToast } from '../../contexts/ToastContext';
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
} from '../../validators';
import { tratarErroApi } from '../../utils/errosApi';
import estilos from './PaginaFormularioProduto.module.css';

const PaginaFormularioProduto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const ehEdicao = !!id && id !== 'novo';

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [preco, setPreco] = useState('');
  const [categoria, setCategoria] = useState('');
  const [ativo, setAtivo] = useState(true);
  const [fotoUrl, setFotoUrl] = useState('');
  const [adicionais, setAdicionais] = useState<GrupoAdicionalDTO[]>([]);
  // Campos que não têm input nesta tela, mas fazem parte do ProdutoLojistaDTO.
  // Precisam ser preservados no PUT — se ficassem de fora do payload, o
  // backend sobrescreveria peso/desconto/estoque com null.
  const [peso, setPeso] = useState<string>('');
  const [percentualDesconto, setPercentualDesconto] = useState<string>('');
  const [estoque, setEstoque] = useState<string>('');
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [enviandoImagem, setEnviandoImagem] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [errosTocados, setErrosTocados] = useState<Record<string, boolean>>({});
  const arquivoInputRef = useRef<HTMLInputElement>(null);

  // Erro exibido por campo: on blur ou on submit — nunca on change
  const erroCampo = (campo: string): string | undefined =>
    errosTocados[campo] ? erros[campo] : undefined;

  const tocarCampo = (campo: string, valor: string, validar: (v: string) => string | null) => {
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
      { nome, descricao, preco, categoria },
      {
        nome: validarNomeProduto,
        descricao: validarDescricaoProduto,
        preco: validarPreco,
        categoria: validarCategoria,
      }
    );
    const erroEstoque = validarEstoque(estoque);
    if (erroEstoque) novosErros.estoque = erroEstoque;
    if (percentualDesconto && (!Number.isInteger(Number(percentualDesconto)) || Number(percentualDesconto) < 0 || Number(percentualDesconto) > 100)) novosErros.percentualDesconto = 'Informe um desconto inteiro entre 0 e 100.';
    setErros(novosErros);
    setErrosTocados({ nome: true, descricao: true, preco: true, categoria: true, estoque: true, percentualDesconto: true });
    return Object.keys(novosErros).length === 0;
  };

  const carregarProduto = useCallback(async () => {
    try {
      setCarregando(true);
      setErro(null);
      if (!id) return;
      const produto = await buscarProduto(id);
      setNome(produto.nome);
      setDescricao(produto.descricao || '');
      setPreco(produto.preco.toString());
      setCategoria(produto.categoriaMenu);
      setAtivo(produto.ativo);
      setFotoUrl(produto.imagemUrl || '');
      setAdicionais(produto.adicionais || []);
      setPeso(produto.peso != null ? String(produto.peso) : '');
      setPercentualDesconto(
        produto.percentualDesconto != null ? String(produto.percentualDesconto) : ''
      );
      setEstoque(produto.estoque != null ? String(produto.estoque) : '');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Erro ao carregar produto');
    } finally {
      setCarregando(false);
    }
  }, [id]);

  /**
   * Sobe a imagem para o Firebase Storage via POST /uploads/imagem e guarda a
   * URL persistente devolvida pelo backend. Antes desta integração nenhuma
   * imagem era enviada (só existia a área visual de upload).
   */
  const handleSelecionarImagem = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    // Permite reselecionar o mesmo arquivo depois de um erro
    e.target.value = '';
    if (!arquivo) return;

    // Mesmas regras do backend: JPG/PNG/WEBP até 5 MB (evita request inútil).
    const erroArquivo = validarArquivoImagem(arquivo);
    if (erroArquivo) {
      setErro(erroArquivo);
      return;
    }

    setErro(null);
    setEnviandoImagem(true);
    try {
      const url = await enviarImagem(arquivo, 'produtos');
      setFotoUrl(url);
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? 'Não foi possível enviar a imagem.');
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
    { valor: '', rotulo: 'Selecione uma categoria' },
    ...CATEGORIAS_PRODUTO.map(c => ({ valor: c, rotulo: c }))
  ];

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErro(null);
    if (salvando || enviandoImagem || !validarTudo()) return;

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
        percentualDesconto: percentualDesconto ? Number(percentualDesconto) : undefined,
        estoque: estoque !== '' ? Number(estoque) : undefined,
      };

      if (ehEdicao && id) {
        await atualizarProduto(id, dadosProduto);
        mostrarToast('Produto atualizado com sucesso!');
      } else {
        await criarProduto(dadosProduto);
        mostrarToast('Produto criado com sucesso!');
      }
      navigate('/produtos');
    } catch (err) {
      const tratado = tratarErroApi(err);
      setErro(tratado.mensagemGeral ?? 'Erro ao salvar produto.');
    } finally {
      // Após erro de rede/backend, reabilitar o botão para permitir retry
      setSalvando(false);
    }
  };

  const handleExcluir = async () => {
    try {
      if (!id) return;
      await desativarProduto(id);
      navigate('/produtos');
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Erro ao excluir produto.');
    }
  };

  return (
    <LayoutPagina titulo={ehEdicao ? 'Editar Produto' : 'Novo Produto'}>
      <form noValidate onSubmit={handleSalvar} className={estilos.form}>
        {carregando && <p className={estilos.status}>Carregando produto...</p>}
        {erro && <p className={estilos.erro} role="alert">{erro}</p>}
        <div className={estilos.container}>
          <Cartao className={estilos.secao}>
            <h3 className={estilos.tituloSecao}>Informações Básicas</h3>
            <div className={estilos.gridCampos}>
              <InputTexto
                rotulo="Nome do Produto"
                valor={nome}
                aoMudar={setNome}
                erro={erroCampo('nome')}
                onBlur={() => tocarCampo('nome', nome, validarNomeProduto)}
                obrigatorio
              />
              <Seletor rotulo="Categoria" valor={categoria} aoMudar={setCategoria} opcoes={opcoesCategorias} erro={erros.categoria} obrigatorio />
              <InputTexto
                rotulo="Preço"
                valor={preco}
                aoMudar={setPreco}
                erro={erroCampo('preco')}
                onBlur={() => tocarCampo('preco', preco, validarPreco)}
                obrigatorio
              />
              <InputTexto rotulo="Descrição" valor={descricao} aoMudar={setDescricao} erro={erroCampo('descricao')} />

              <div className={estilos.uploadWrapper}>
                <span className={estilos.rotulo}>Foto do Produto</span>
                <div
                  className={estilos.areaUpload}
                  role="button"
                  tabIndex={0}
                  onClick={() => arquivoInputRef.current?.click()}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') arquivoInputRef.current?.click();
                  }}
                >
                  {fotoUrl ? (
                    <img src={fotoUrl} alt={nome || 'Imagem do produto'} style={{ maxWidth: '100%', maxHeight: 160, borderRadius: 8 }} />
                  ) : (
                    <>
                      <Upload size={32} color="var(--nhac-primaria)" />
                      <p>{enviandoImagem ? 'Enviando imagem...' : 'Clique para enviar uma imagem'}</p>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    ref={arquivoInputRef}
                    onChange={handleSelecionarImagem}
                    style={{ display: 'none' }}
                  />
                </div>
                {fotoUrl && (
                  <button
                    type="button"
                    onClick={() => setFotoUrl('')}
                    style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--nhac-erro, #e53935)', cursor: 'pointer', fontSize: '0.8125rem' }}
                  >
                    Remover imagem
                  </button>
                )}
              </div>

              <div className={estilos.toggleWrapper}>
                <Toggle ativo={ativo} aoMudar={setAtivo} rotulo="Produto Ativo" />
              </div>

              <InputTexto
                rotulo="Estoque (unidades)"
                valor={estoque}
                aoMudar={(v) => setEstoque(v.replace(/\D/g, ''))}
                placeholder="Ex.: 100"
                erro={erroCampo('estoque')}
                onBlur={() => tocarCampo('estoque', estoque, validarEstoque)}
              />
            </div>
          </Cartao>

          <Cartao className={estilos.secao}>
            <div className={estilos.cabecalhoSecao}>
              <h3 className={estilos.tituloSecao}>Adicionais</h3>
              <Botao type="button" variante="secundario" icone={<Plus size={16} />} onClick={() => setAdicionais([...adicionais, { nome: '', obrigatorio: false, itens: [] }])}>
                Novo Grupo
              </Botao>
            </div>

            {adicionais.length === 0 ? (
              <p className={estilos.vazio}>Nenhum grupo de adicional configurado.</p>
            ) : (
              <div className={estilos.listaAdicionais}>
                {adicionais.map((grupo, idx) => (
                  <div key={idx} className={estilos.grupoAdicional}>
                    <div className={estilos.linhaGrupo}>
                      <InputTexto rotulo="" valor={grupo.nome} aoMudar={(v) => {
                        const novos = [...adicionais];
                        novos[idx].nome = v;
                        setAdicionais(novos);
                      }} placeholder="Nome do grupo (ex: Escolha seu molho)" />
                      <Toggle ativo={grupo.obrigatorio} aoMudar={(v) => {
                        const novos = [...adicionais];
                        novos[idx].obrigatorio = v;
                        setAdicionais(novos);
                      }} rotulo="Obrigatório" />
                      <Botao type="button" variante="perigo" icone={<Trash2 size={16} />} onClick={() => {
                        const novos = [...adicionais];
                        novos.splice(idx, 1);
                        setAdicionais(novos);
                      }} />
                    </div>
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
            <Botao type="button" variante="fantasma" onClick={() => navigate('/produtos')}>Cancelar</Botao>
            <Botao type="submit" variante="primario" carregando={salvando}>Salvar Produto</Botao>
          </div>
        </div>
      </form>

      <ModalConfirmacao
        aberto={modalExcluirAberto}
        titulo="Excluir produto"
        mensagem={`Tem certeza que deseja excluir "${nome}"? Essa ação não pode ser desfeita.`}
        textoBotaoConfirmar="Excluir"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={handleExcluir}
        aoCancelar={() => setModalExcluirAberto(false)}
      />
    </LayoutPagina>
  );
};

export default PaginaFormularioProduto;
