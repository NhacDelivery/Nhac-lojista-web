# Avisos do painel lojista

As mensagens seguem `DESIGN.md` e o contrato da API, com um componente compartilhado e preenchimento preservado. Não há novos limites ou permissões definidos pelo frontend.

| Caso | O que o usuário vê | Como continuar |
| --- | --- | --- |
| Telefone já usado | Telefone já utilizado; campo destacado na etapa correta | Corrigir número, entrar ou recuperar senha |
| E-mail existente | E-mail já cadastrado, sem redirecionamento automático | Corrigir e-mail, entrar ou recuperar senha |
| E-mail não confirmado | Confirme seu e-mail | Voltar à verificação e solicitar código válido |
| Código errado/expirado | Confira o código / O código expirou | Usar o último código ou reenviar |
| Campo obrigatório ou fora dos limites | Resumo e mensagem em português por campo | Selecionar o campo para corrigir |
| Credenciais inválidas | E-mail ou senha não conferem | Corrigir ou recuperar senha, sem revelar qual credencial errou |
| Sessão expirada | Entre novamente na sua conta | Login com explicação do redirecionamento |
| Acesso negado | Seu perfil não permite a ação | Pedir revisão ao responsável; não repetir a tentativa |
| Conflito/estado alterado | Os dados mudaram | Atualizar antes de repetir a ação |
| Registro ausente | Não encontramos esse registro | Voltar à lista e atualizar |
| Imagem incompatível ou acima do limite | Formatos aceitos e limite de 5 MB | Selecionar JPG, PNG ou WEBP válido |
| Muitas tentativas | Aguarde para tentar novamente | Respeitar o contador existente |
| Falha de rede | Não conseguimos conectar | Conferir conexão; manter os campos |
| Timeout | Não recebemos a confirmação a tempo | Conferir o resultado antes de enviar novamente |
| Serviço indisponível/erro interno | Explicação sem detalhes técnicos | Aguardar, conferir resultado e usar referência de suporte quando disponível |
| Atualização de pedidos falhou | Dados anteriores preservados | Tentar novamente no próprio painel |
| Financeiro ou preferências não carregam | Aviso persistente com recuperação | Tentar novamente |

Os avisos foram aplicados a cadastro, login, verificação/recuperação, conta, informações/endereço/pagamentos da loja, catálogo, equipe, pedidos e financeiro. Chat e ações do painel usam a notificação compartilhada com tom de erro quando necessário.

## Verificação

```bash
npm ci --legacy-peer-deps
npm run lint
npm test -- --watchAll=false --runInBand
npm run build
npx playwright install chromium
npx playwright test --config=e2e/avisos.config.ts
```

Os testes de avisos usam respostas controladas da API para provocar os estados visuais sem cadastrar usuários ou enviar mensagens em produção. Incluem o fluxo completo até a rejeição do telefone, retorno/foco no campo, dados da loja preservados, e-mail existente sem navegação automática, login em 390 px e falha de rede. Os testes de backend existentes permanecem separados em `playwright.config.ts`.

Após criar a loja, o painel consulta novamente o perfil autenticado: o backend promove CLIENTE para LOJISTA, e a sessão precisa refletir esse papel antes de abrir as configurações. O teste de cadastro concluído cobre a abertura da tela sem novo login. Testes do contexto garantem que funcionários, inclusive administradores, continuam bloqueados nas configurações exclusivas do dono.
