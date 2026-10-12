# Painel lojista na Vercel

Backend: https://backend-nhac.onrender.com

Configuração do projeto `nhac-lojista-web`:

- Framework: Create React App; Node.js 24.
- Instalação: `npm ci --legacy-peer-deps`.
- Build: `npm run build`; saída: `build`.
- `REACT_APP_API_URL=/api/v1`.
- `REACT_APP_WS_URL=/ws`.
- `REACT_APP_WS_TRANSPORTS=xhr-polling`.

`vercel.json` encaminha API e SockJS ao Render e mantém as rotas do React
funcionando após recarregar a página. O middleware retira o Origin do salto
servidor a servidor, preserva o Authorization e impede cache das respostas.
O backend continua responsável por autenticação e autorização.

Na Vercel, SockJS usa HTTP polling para manter eventos STOMP sem depender
de upgrade WebSocket no proxy. Nos demais ambientes, os transportes padrão
continuam disponíveis se `REACT_APP_WS_TRANSPORTS` não for configurada.

A publicação inicial usa arquivos do commit validado. O deploy automático
por Git depende de conectar a conta GitHub à Vercel e importar o repositório.
