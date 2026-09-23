# Nhac Lojas

Painel React/TypeScript integrado ao [backend Nhac](https://github.com/NhacDelivery/backend-nhac). Login e cadastro com verificação, operação da loja, pedidos, produtos e adicionais, equipe, chat com clientes/entregadores, financeiro e configurações.

## Executar

Requisitos: Node 22, npm e backend acessível. Para subir o backend local, siga as instruções do repositório Java (Java 25 e MariaDB).

```bash
npm ci
cp .env.example .env.local
npm start
```

Configure `REACT_APP_API_URL` com a URL terminada em `/api/v1`. `REACT_APP_WS_URL` é opcional e deriva da API quando omitida. Em produção, ambos precisam usar HTTPS e o backend deve aceitar a origem do painel. A hospedagem precisa redirecionar rotas do frontend para `index.html`.

## Validação

```bash
npm run lint
CI=true npm test -- --watchAll=false --runInBand
npm run build
npx playwright install --with-deps chromium
npm start
# Em outro terminal:
npx playwright test e2e/operacao-ui.spec.ts
```

`operacao-ui.spec.ts` testa no navegador com respostas controladas: edição da equipe, paginação/filtros, confirmação sem duplicação, horários em celular e recuperação de erro. Não comprova integração com o backend.

O teste `lojista-pedido.spec.ts` usa o backend real com perfil `e2e`, MariaDB isolado e fixtures. Rode com `RUN_E2E=true npm run test:e2e`. Nunca aponte para produção. O workflow `.github/workflows/e2e.yml` prepara esse ambiente e publica logs e traces.

## Contratos e limitações

- Pedidos, produtos e equipe usam páginas do servidor. Pedidos e painel atualizam a cada 15 segundos na aba visível.
- Chat restaura assinaturas ao reconectar, carrega histórico em páginas e distingue cliente/entregador. Enviar ao WebSocket não equivale a confirmar persistência: o backend precisa estar conectado e autorizar a conversa.
- Horários, taxa, tempos, raio, entrega própria e retirada são editáveis em Configurações → Horários e entrega.
- Imagens, e-mail e pagamentos precisam dos serviços configurados no backend. Dados de demonstração não substituem a API em produção.
- O backend atual trata cargo de funcionário como rótulo, sem RBAC por cargo. A gestão de equipe é protegida pelo servidor e restrita ao dono, mas não há garantia de separação gerente/atendente. O seletor local de cargo foi removido.
- O painel segue o fluxo existente de iniciar preparo; coleta/conclusão pertencem ao entregador. Estorno de pagamentos exige fluxo próprio no backend.

Veja [DESIGN.md](DESIGN.md), [UX-CONTRACT.md](UX-CONTRACT.md) e [specs/003-auditoria-operacao.md](specs/003-auditoria-operacao.md) para contexto, evidências e limites da validação.
