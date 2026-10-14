# Nhac Lojas interaction contract

The app uses `src/styles/tema.css`, shared UI controls, the toast context, and Brazilian Portuguese. Staff roles and server authorization remain defined by `src/App.tsx` and the backend.

Select/Listbox uses the existing native `<select>` owner in `src/components/ui/Seletor.tsx`; the operating system popup is acceptable. Date and time input in the registration form remains native and follows the device's Brazilian Portuguese locale. These ownership choices are recorded in `premium-ui.json`.

## Canonical UI Map

| Capability     | Canonical owner                             | Source of truth          | Allowed variants    | Verification       |
| -------------- | ------------------------------------------- | ------------------------ | ------------------- | ------------------ |
| Select/Listbox | `src/components/ui/Seletor.tsx`             | Native browser select    | Native              | Keyboard and popup |
| Date           | `src/pages/autenticacao/PaginaCadastro.tsx` | Native browser date/time | Native              | Device locale      |
| Form           | Shared `InputTexto` and form validators     | `src/validators`         | Create, edit        | Form tests         |
| Scrollbar      | `src/styles/global.css`                     | `src/styles/tema.css`    | Geometry exceptions | Static audit       |
| Toast          | `src/contexts/ToastContext`                 | This contract            | Success, error      | Screen feedback    |
| CRUD           | `src/services/api.ts` with owning routes    | Backend API              | Create, edit        | Integration tests  |

| Operation                          | Pending                                                               | Success                                             | Failure and recovery                                                |
| ---------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------- |
| Change password                    | Require current, new, and confirmation; block repeated save           | Clear secrets and acknowledge after server response | Preserve values and show the server error near current password     |
| Save store address and coordinates | Save address and coordinates together                                 | Reload store and navigate back                      | Keep the form and show the error; retry the atomic location request |
| Send chat                          | Keep draft until the server broadcast with matching client message ID | Clear draft and deduplicate messages by ID          | Mark uncertain and retry using the same ID                          |
| Browse orders                      | Server pagination and status counts                                   | Keep each status and page available                 | Preserve current content and retry                                  |
| Browse products                    | Explicit load more                                                    | Append unique products                              | Keep already loaded items and retry                                 |
| Change financial period            | Ignore earlier responses                                              | Show values for selected period                     | Inline error with retry; manual refresh available                   |

The product form exposes additions and stock supported by the current backend. Existing values are preserved on product edits. Production API and WebSocket default to the current origin if deploy configuration is absent; deployments on separate origins must set both URLs.

## Backend atual e verificação dos fluxos

A referência desta revisão é a `main` de `NhacDelivery/backend-nhac`, commit `f2b6f6e06e99ec4bc12641742e297655b1135e79`. O CI executa a suíte contra a `main` para detectar futuras mudanças de contrato.

| Regra observável                                                                 | Fonte no backend                                                                          | Evidência no painel                                                                                         |
| -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Gestão da equipe depende do papel do dono, não do rótulo do cargo do funcionário | `domain/usuario/FuncionarioService.java`, `exigirDono`                                    | Menu e rotas da equipe ocultos/bloqueados para funcionário, incluindo cargo Administrador; API responde 403 |
| Novo telefone só é persistido após confirmar SMS, em E.164                       | `domain/usuario/TelefoneContaController.java`, `domain/auth/dto/ValidarCodigoSmsDTO.java` | Enviar código, rejeição sem mudança da conta, confirmação e recarga                                         |
| Senha atual incorreta é uma falha de validação da ação                           | `domain/auth/AuthController.java`, `alterarSenha`                                         | Sessão e campos preservados para corrigir a senha                                                           |
| Produto inativo permanece editável no painel e pode ser reativado                | `domain/produto/ProdutoController.java`, `domain/lojista/LojistaController.java`          | Confirmação descreve desativação; catálogo público omite o produto                                          |
| Estoque e adicionais pertencem ao cadastro atual de produto                      | `domain/produto/dto/ProdutoLojistaDTO.java`                                               | Campos visíveis, limites validados, valores mantidos ao editar                                              |
| Lojista inicia preparo; a coleta e entrega dependem do entregador                | `domain/pedido/PedidoService.java` e rotas de entregas                                    | Botões de avanço e cancelamento ausentes após iniciar preparo                                               |

Os campos compartilhados associam rótulo, erro e controle; reservam espaço para a mensagem de validação para que uma validação no blur não mova o botão durante um clique. Formas de pagamento podem ser alteradas com teclado pelo checkbox nomeado.

A suíte usa Chromium, REST, WebSocket e MariaDB isolados. SMS, e-mail, storage e provedores financeiros externos continuam no modo mock do perfil E2E. Uma falha 503 do painel é injetada somente no cenário de recuperação; a tentativa seguinte consulta a API real. Consulte `docs/TESTES-INTEGRACAO.md` para execução e limites de cobertura.

## Permissões e itens do pedido

As escolhas de `itens[].adicionais` são snapshots do backend e aparecem abaixo do item, sem recalcular preços. Pedidos antigos sem adicionais continuam legíveis. A criação de produto envia `isAtivo`; `false` mantém o produto fora do catálogo público desde a criação.

| Área | Dono / ADMIN | Funcionário Administrador | Gerente | Atendente / cargo desconhecido |
| --- | --- | --- | --- | --- |
| Pedidos e chat | Sim | Sim | Sim | Sim |
| Catálogo, painel e abertura | Sim | Sim | Sim | Não |
| Financeiro | Sim | Sim | Não | Não |
| Equipe e configuração da loja | Sim | Não | Não | Não |

A API aplica as restrições com o cargo atualizado do banco, inclusive após rebaixamento com o mesmo token. O vínculo da loja continua obrigatório. Configurações da própria conta preservam a autorização individual já existente.

## Feedback de erro compartilhado

| Capacidade | Dono | Fonte | Comportamento | Evidência |
| --- | --- | --- | --- | --- |
| Aviso de formulário | `src/components/ui/AvisoFormulario.tsx` | `src/utils/feedback.ts` | Título, explicação, orientação, foco no campo e ações de recuperação; persistente | `AvisoFormulario.test.tsx`, `e2e/avisos.spec.ts` |
| Toast | `src/contexts/ToastContext.tsx` | `tema.css`, contrato atual | Sucesso `role=status`, erro persistente, fechar acessível, timer cancelado e pausa por foco/hover | `ToastContext.test.tsx` |

As regras de identidade são as de `domain/auth/AuthController.java:registrar` e `RegistroRequestDTO`: e-mail confirmado, telefone/e-mail únicos e senha válida. O painel explica as rejeições sem alterar essas regras. Depois de um 400 no registro, mantém os dados da loja e retorna à etapa do campo rejeitado. E-mail já existente não provoca navegação automática; oferece login e recuperação de senha.

Bean Validation é traduzida em mensagens de campo em português. 403 explica acesso sem tratar falta de permissão como logout; a sessão inválida identificada pelo cliente HTTP encaminha ao login com um aviso. Conflito pede atualização de dados; rede e indisponibilidade oferecem recuperação; timeout não afirma que uma gravação deixou de acontecer nem repete uma mutação automaticamente. O backend continua responsável pela autorização e pela confirmação das alterações.

## Imagens, equipe e confirmação de telefone

- Logo: variante `logo` do Avatar, superfície branca e imagem inteira. Avatar de pessoa mantém sua apresentação própria.
- Produto: entradas JPG/PNG/WEBP até 5 MB; novos uploads pelo painel saem como JPEG 800 × 800 (1:1), com zoom proporcional e recorte central para preencher o quadrado, sem distorção nem barras brancas. Arquivo ilegível não é enviado. Imagens antigas são contidas em moldura quadrada. Essa normalização é do painel; o backend continua validando MIME e tamanho.
- Equipe: nome e cargo obrigatórios; criação exige e-mail, telefone com DDD e senha de oito caracteres com letra/número. Edição preserva telefone quando vazio. Validar antes de enviar; falha da API mantém valores, mostra resumo persistente e erros por campo. Edição de registro não encontrado bloqueia salvar. O servidor continua responsável por autorização e unicidade.
- Telefone da conta: código SMS só aparece após envio bem-sucedido para o número preenchido. Dois campos vazios nunca significam código enviado.
- Evidência: regressões de equipe, SMS, layout estreito, logo e upload real por canvas em `e2e/avisos.spec.ts`; integração com backend em `e2e/equipe-sessao.spec.ts` e `e2e/configuracoes.spec.ts`.

## CPF e vínculo no cadastro da loja

O CPF do responsável usa `InputTexto`, `mascaraCpfCnpj` limitada a 11 dígitos e `validarCpf` na etapa Dados da Loja, nos dois modos de cadastro. O POST autenticado envia `cpfResponsavel` somente com dígitos. O backend salva CPF, cargo ADMINISTRADOR e vínculo no usuário, com o dono da loja obtido do token. O perfil é recarregado após a criação. Erros de CPF retornam à etapa da loja, preservam o formulário e focam o campo. CPF não é exposto no catálogo nem persistido no armazenamento do navegador.
