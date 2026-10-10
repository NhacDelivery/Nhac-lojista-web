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
