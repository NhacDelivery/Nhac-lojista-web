# Testes de integração do painel lojista

A suíte Playwright usa o painel completo e o backend da main, com MariaDB exclusivo para E2E. Não substitui serviços de domínio por mocks de componentes. As mutações são verificadas pela tela, por consultas REST independentes e/ou após recarregar a página.

## Cobertura

| Área               | Cenários verificados                                                                                                                                                          |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sessão             | Rotas anônimas, login inválido, cadastro inválido sem criar conta, recuperação com código rejeitado                                                                           |
| Pedidos            | Pedido criado pelo cliente, recebimento, detalhes, preparo persistido, busca de entregador sem disponibilidade, cancelamento confirmado, estado final e pedido inexistente    |
| Catálogo           | Validação que impede POST, estoque/adicional persistidos, edição, desativação e reativação, catálogo público, upload inválido, edição inexistente, paginação e busca vazia    |
| Equipe             | Cadastro/edição, e-mail imutável, senha inicial ausente na edição, bloqueio de login e reativação, permissões de Atendente e Administrador em desktop/mobile                  |
| Loja/conta         | Abertura via teclado, preservação do cadastro, endereço/coordenadas, preferências, senha incorreta sem logout, telefone com confirmação SMS, pagamentos e informações da loja |
| Chat               | Mensagem enviada pelo cliente, leitura persistida, envio STOMP confirmado, ausência de duplicata e recuperação do histórico após recarregar                                   |
| Financeiro         | Consultas por período e valores correspondentes ao retorno da API                                                                                                             |
| Recuperação/layout | Falha 503 seguida de retry real, formulário estreito sem corte horizontal e ação salvar alcançável                                                                            |

## Execução

1. Use Node 22, Java 25 e MariaDB. Crie somente o banco descartável `nhac_e2e`, na porta 3307, com usuário/senha locais `nhac_e2e` (ou configure `E2E_DB_*`). O perfil E2E limpa as tabelas desse banco na inicialização.
2. Defina a mesma `E2E_PASSWORD` temporária de pelo menos 12 caracteres no backend e no runner. As contas são geradas por `E2EDataLoader`; não utilize contas de produção.
3. No backend: `./mvnw spring-boot:run -Dspring-boot.run.profiles=e2e > backend-e2e.log 2>&1`.
4. No painel: `npm ci`, `npx playwright install --with-deps chromium`, depois `REACT_APP_API_URL=http://127.0.0.1:8080/api/v1 BROWSER=none npm start`.
5. Com ambos prontos: `RUN_E2E=true E2E_WEB_BASE_URL=http://localhost:3000 npm run test:e2e`.

O runner recusa URLs de API fora de localhost/127.0.0.1. Por padrão, o código SMS de teste é lido de `../backend-nhac/backend-e2e.log`, a saída do provedor mock. Caso os diretórios sejam diferentes, configure `E2E_BACKEND_LOG`. O backend continua validando, limitando tentativas e persistindo o código pela API real; não há endpoint de teste adicional.

Também execute `npm run lint`, `CI=true npm test -- --watchAll=false --runInBand` e `CI=true npm run build`. O workflow `.github/workflows/e2e.yml` executa essas verificações e os cenários de navegador, publica traces/screenshots em caso de falha e usa senha temporária a cada execução.

## Limites

Não são exercitados envios reais de SMS/e-mail, pagamento real, Firebase ou coleta por um entregador real. O perfil E2E usa os mocks oficiais do backend para esses provedores. O cadastro completo com e-mail verificado e a recuperação bem-sucedida de senha ainda não estão cobertos; os cenários de validação e rejeição estão. Os testes não efetuam mudanças em produção.
