import React, { useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import LayoutPagina from '../../components/layout/LayoutPagina';
import Botao from '../../components/ui/Botao';
import Cartao from '../../components/ui/Cartao';
import Avatar from '../../components/ui/Avatar';
import Emblema from '../../components/ui/Emblema';
import ModalConfirmacao from '../../components/ui/ModalConfirmacao';
import { listarFuncionariosPagina, desativarFuncionario, reativarFuncionario } from '../../services/api';
import { tratarErroApi } from '../../utils/errosApi';
import { useToast } from '../../contexts/ToastContext';
import { formatarData } from '../../utils/formatacao';
import { Plus, Edit2, Trash2, RotateCcw } from 'lucide-react';
import { usePagina } from '../../hooks/usePagina';
import Paginacao from '../../components/ui/Paginacao';
import estilos from './PaginaListaFuncionarios.module.css';

const PaginaListaFuncionarios = () => {
  const navigate = useNavigate();
  const { mostrarToast } = useToast();
  const [params, setParams] = useSearchParams();
  const pagina = Math.max(0, Number(params.get('page')) || 0);
  const buscar = useCallback(() => listarFuncionariosPagina(pagina), [pagina]);
  const { dados: funcionarios, setDados: setFuncionarios, carregando, erro, total, totalPaginas, recarregar: carregar } = usePagina(buscar);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [alterando, setAlterando] = useState(false);

  const getCorCargo = (cargo: string): 'info' | 'aviso' | 'neutro' => {
    switch (cargo.toLowerCase()) {
      case 'administrador': return 'info';
      case 'gerente': return 'aviso';
      default: return 'neutro';
    }
  };

  const handleExcluir = async (id: string) => {
    if (alterando) return;
    setAlterando(true);
    try {
      await desativarFuncionario(id);
      setFuncionarios(atual => atual.map(f => f.id === id ? { ...f, ativo: false } : f));
      mostrarToast('Funcionário desativado.');
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Não foi possível desativar o funcionário.');
    } finally {
      setAlterando(false);
      setConfirmandoExclusao(null);
    }
  };

  const handleReativar = async (id: string) => {
    if (alterando) return;
    setAlterando(true);
    try {
      await reativarFuncionario(id);
      setFuncionarios(atual => atual.map(f => f.id === id ? { ...f, ativo: true } : f));
      mostrarToast('Funcionário reativado.');
    } catch (err) {
      const tratado = tratarErroApi(err);
      mostrarToast(tratado.mensagemGeral ?? 'Não foi possível reativar o funcionário.');
    } finally { setAlterando(false); }
  };

  return (
    <LayoutPagina titulo="Funcionários">
      <div className={estilos.container}>
        <header className={estilos.cabecalho}>
          <h2 className={estilos.titulo}>Equipe</h2>
          <Botao onClick={() => navigate('/funcionarios/novo')} icone={<Plus size={20} />}>
            Novo funcionário
          </Botao>
        </header>

        {carregando ? (
          <p style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>Carregando...</p>
        ) : erro ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--nhac-texto-claro)' }}>
            <p>{erro}</p>
            <Botao variante="secundario" onClick={() => carregar()}>Tentar novamente</Botao>
          </div>
        ) : (
          <Cartao className={estilos.tabelaCartao}>
            <div className={estilos.responsivoTabela}>
              <table className={estilos.tabela}>
                <thead>
                  <tr>
                    <th>Funcionário</th>
                    <th>Contato</th>
                    <th>Cargo</th>
                    <th>Status</th>
                    <th>Data de Cadastro</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {funcionarios.length === 0 ? (
                    <tr><td colSpan={6}>Nenhum funcionário cadastrado ainda.</td></tr>
                  ) : funcionarios.map(func => (
                    <tr key={func.id}>
                      <td>
                        <div className={estilos.infoUsuario}>
                          <Avatar nome={func.nomeCompleto} fotoUrl={func.fotoUrl} tamanho="pequeno" />
                          <span className={estilos.nome}>{func.nomeCompleto}</span>
                        </div>
                      </td>
                      <td>
                        <div className={estilos.contato}>
                          <span className={estilos.email}>{func.email}</span>
                          <span className={estilos.telefone}>{func.telefone}</span>
                        </div>
                      </td>
                      <td>
                        <Emblema variante={getCorCargo(func.cargo)}>{func.cargo}</Emblema>
                      </td>
                      <td>
                        <Emblema variante={func.ativo ? 'sucesso' : 'erro'}>
                          {func.ativo ? 'Ativo' : 'Inativo'}
                        </Emblema>
                      </td>
                      <td>{formatarData(func.dataCadastro)}</td>
                      <td>
                        <div className={estilos.acoes}>
                          <Botao variante="fantasma" aria-label={`Editar ${func.nomeCompleto}`} icone={<Edit2 size={18} />} onClick={() => navigate(`/funcionarios/${func.id}`)} />
                          {func.ativo ? (
                            <Botao variante="perigo" aria-label={`Desativar ${func.nomeCompleto}`} disabled={alterando} icone={<Trash2 size={18} />} onClick={() => setConfirmandoExclusao(func.id)} />
                          ) : (
                            <Botao variante="secundario" aria-label={`Reativar ${func.nomeCompleto}`} disabled={alterando} icone={<RotateCcw size={18} />} onClick={() => handleReativar(func.id)} />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className={estilos.listaMobile}>
              {funcionarios.map(func => (
                <div key={func.id} className={estilos.cartaoMobile}>
                  <div className={estilos.cabecalhoMobile}>
                    <div className={estilos.infoUsuario}>
                      <Avatar nome={func.nomeCompleto} fotoUrl={func.fotoUrl} tamanho="medio" />
                      <div>
                        <div className={estilos.nome}>{func.nomeCompleto}</div>
                        <div className={estilos.email}>{func.email}</div>
                      </div>
                    </div>
                  </div>
                  <div className={estilos.corpoMobile}>
                    <div className={estilos.detalheMobile}>
                      <span className={estilos.rotulo}>Cargo:</span>
                      <Emblema variante={getCorCargo(func.cargo)}>{func.cargo}</Emblema>
                    </div>
                    <div className={estilos.detalheMobile}>
                      <span className={estilos.rotulo}>Status:</span>
                      <Emblema variante={func.ativo ? 'sucesso' : 'erro'}>{func.ativo ? 'Ativo' : 'Inativo'}</Emblema>
                    </div>
                    <div className={estilos.acoesMobile}>
                      <Botao variante="secundario" onClick={() => navigate(`/funcionarios/${func.id}`)}>Editar</Botao>
                      {func.ativo ? (
                        <Botao variante="perigo" onClick={() => setConfirmandoExclusao(func.id)}>Desativar</Botao>
                      ) : (
                        <Botao variante="secundario" onClick={() => handleReativar(func.id)}>Reativar</Botao>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Cartao>
        )}
        <Paginacao pagina={pagina} totalPaginas={totalPaginas} total={total} carregando={carregando}
          aoMudar={page => setParams({ page: String(page) })} />
      </div>

      <ModalConfirmacao
        aberto={confirmandoExclusao !== null}
        titulo="Desativar funcionário"
        mensagem="Isso bloqueia o login desse funcionário imediatamente. Tem certeza?"
        textoBotaoConfirmar="Desativar"
        varianteBotaoConfirmar="perigo"
        aoConfirmar={() => confirmandoExclusao && handleExcluir(confirmandoExclusao)}
        aoCancelar={() => setConfirmandoExclusao(null)}
      />
    </LayoutPagina>
  );
};

export default PaginaListaFuncionarios;
