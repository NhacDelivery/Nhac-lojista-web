import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ProvedorAutenticacao } from './contexts/AutenticacaoContext';
import { ProvedorToast } from './contexts/ToastContext';
import { ProvedorLoja } from './contexts/LojaContext';
import RotaProtegida from './components/compartilhados/RotaProtegida';
import RotaExigeLoja from './components/compartilhados/RotaExigeLoja';

// Páginas de autenticação
import PaginaLogin from './pages/autenticacao/PaginaLogin';
import PaginaCadastro from './pages/autenticacao/PaginaCadastro';

// Páginas do dashboard
import PaginaPainel from './pages/painel/PaginaPainel';
import PaginaListaProdutos from './pages/produtos/PaginaListaProdutos';
import PaginaFormularioProduto from './pages/produtos/PaginaFormularioProduto';
import PaginaListaFuncionarios from './pages/funcionarios/PaginaListaFuncionarios';
import PaginaFormularioFuncionario from './pages/funcionarios/PaginaFormularioFuncionario';
import PaginaChat from './pages/chat/PaginaChat';
import PaginaFinanceiro from './pages/financeiro/PaginaFinanceiro';
import PaginaListaPedidos from './pages/pedidos/PaginaListaPedidos';
import PaginaDetalhePedido from './pages/pedidos/PaginaDetalhePedido';
import PaginaInformacaoLoja from './pages/configuracoes/PaginaInformacaoLoja';
import PaginaEditarInfoLoja from './pages/configuracoes/PaginaEditarInfoLoja';
import PaginaConfiguracoesConta from './pages/configuracoes/PaginaConfiguracoesConta';
import PaginaEnderecoLoja from './pages/configuracoes/PaginaEnderecoLoja';
import PaginaFormasPagamento from './pages/configuracoes/PaginaFormasPagamento';
import PaginaOperacaoLoja from './pages/configuracoes/PaginaOperacaoLoja';
import PaginaRecuperarSenha from './pages/autenticacao/PaginaRecuperarSenha';

function RotaProtegidaComLoja({
  children,
  cargosPermitidos,
}: {
  children: React.ReactNode;
  cargosPermitidos?: ('administrador' | 'gerente' | 'atendente')[];
}) {
  return (
    <RotaProtegida cargosPermitidos={cargosPermitidos}>
      <RotaExigeLoja>{children}</RotaExigeLoja>
    </RotaProtegida>
  );
}

function App() {
  return (
    <ProvedorAutenticacao>
      <ProvedorToast>
        <ProvedorLoja>
          <BrowserRouter>
            <Routes>
              {/* Rotas públicas */}
              <Route path="/login" element={<PaginaLogin />} />
              <Route path="/cadastro" element={<PaginaCadastro />} />
              <Route path="/recuperar-senha" element={<PaginaRecuperarSenha />} />

              {/* Onboarding — exige autenticação, mas não exige loja */}
              <Route
                path="/onboarding-loja"
                element={
                  <RotaProtegida cargosPermitidos={['administrador', 'gerente']}>
                    <PaginaCadastro modo="apenas-loja" />
                  </RotaProtegida>
                }
              />

              {/* Home */}
              <Route path="/home" element={<Navigate to="/" replace />} />

              {/* Rotas protegidas com loja */}
              <Route
                path="/"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente']}>
                    <PaginaPainel />
                  </RotaProtegidaComLoja>
                }
              />

              <Route
                path="/produtos"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente']}>
                    <PaginaListaProdutos />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/produtos/novo"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente']}>
                    <PaginaFormularioProduto />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/produtos/:id"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente']}>
                    <PaginaFormularioProduto />
                  </RotaProtegidaComLoja>
                }
              />

              <Route
                path="/funcionarios"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaListaFuncionarios />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/funcionarios/novo"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaFormularioFuncionario />
                  </RotaProtegidaComLoja>
                }
              />

              <Route path="/funcionarios/:id" element={
                <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                  <PaginaFormularioFuncionario />
                </RotaProtegidaComLoja>
              } />
              <Route
                path="/chat"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente', 'atendente']}>
                    <PaginaChat />
                  </RotaProtegidaComLoja>
                }
              />

              <Route
                path="/pedidos"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente', 'atendente']}>
                    <PaginaListaPedidos />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/pedidos/:id"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador', 'gerente', 'atendente']}>
                    <PaginaDetalhePedido />
                  </RotaProtegidaComLoja>
                }
              />

              <Route
                path="/configuracoes"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaInformacaoLoja />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/configuracoes/editar"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaEditarInfoLoja />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/configuracoes/conta"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaConfiguracoesConta />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/configuracoes/endereco"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaEnderecoLoja />
                  </RotaProtegidaComLoja>
                }
              />
              <Route
                path="/configuracoes/pagamentos"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaFormasPagamento />
                  </RotaProtegidaComLoja>
                }
              />

              <Route path="/configuracoes/operacao" element={
                <RotaProtegidaComLoja cargosPermitidos={['administrador']}><PaginaOperacaoLoja /></RotaProtegidaComLoja>
              } />
              <Route
                path="/financeiro"
                element={
                  <RotaProtegidaComLoja cargosPermitidos={['administrador']}>
                    <PaginaFinanceiro />
                  </RotaProtegidaComLoja>
                }
              />

              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </BrowserRouter>
        </ProvedorLoja>
      </ProvedorToast>
    </ProvedorAutenticacao>
  );
}

export default App;
