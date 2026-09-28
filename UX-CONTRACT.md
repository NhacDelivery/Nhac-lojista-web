# Nhac Lojas interaction contract

The app uses `src/styles/tema.css`, shared UI controls, the toast context, and Brazilian Portuguese. Staff roles and server authorization remain defined by `src/App.tsx` and the backend.

Select/Listbox uses the existing native `<select>` owner in `src/components/ui/Seletor.tsx`; the operating system popup is acceptable. Date and time input in the registration form remains native and follows the device's Brazilian Portuguese locale. These ownership choices are recorded in `premium-ui.json`.

## Canonical UI Map

| Capability | Canonical owner | Source of truth | Allowed variants | Verification |
| --- | --- | --- | --- | --- |
| Select/Listbox | `src/components/ui/Seletor.tsx` | Native browser select | Native | Keyboard and popup |
| Date | `src/pages/autenticacao/PaginaCadastro.tsx` | Native browser date/time | Native | Device locale |
| Form | Shared `InputTexto` and form validators | `src/validators` | Create, edit | Form tests |
| Scrollbar | `src/styles/global.css` | `src/styles/tema.css` | Geometry exceptions | Static audit |
| Toast | `src/contexts/ToastContext` | This contract | Success, error | Screen feedback |
| CRUD | `src/services/api.ts` with owning routes | Backend API | Create, edit | Integration tests |

| Operation | Pending | Success | Failure and recovery |
| --- | --- | --- | --- |
| Change password | Require current, new, and confirmation; block repeated save | Clear secrets and acknowledge after server response | Preserve values and show the server error near current password |
| Save store address and coordinates | Save full address, then location | Reload store and navigate back | If coordinates fail, state that address was saved; retain coordinates for retry |
| Send chat | Keep draft until the server broadcast with matching client message ID | Clear draft and deduplicate messages by ID | Mark uncertain and retry using the same ID |
| Browse orders | Server pagination and status counts | Keep each status and page available | Preserve current content and retry |
| Browse products | Explicit load more | Append unique products | Keep already loaded items and retry |
| Change financial period | Ignore earlier responses | Show values for selected period | Inline error with retry; manual refresh available |

The product form hides additions and stock entry until the corresponding customer order experience exists. Existing values are preserved on product edits. Production API and WebSocket default to the current origin if deploy configuration is absent; deployments on separate origins must set both URLs.
