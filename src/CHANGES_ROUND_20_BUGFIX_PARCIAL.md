# Round 20 — correções após QA real (parcial, ainda faltam itens)

Foram encontrados testando o fluxo de verdade (registro → criar loja → usar o
painel → criar funcionário → logar como funcionário). Lista completa dos bugs
reportados está no histórico da conversa; aqui só o que foi corrigido nesta
entrega.

## Corrigido nesta entrega

1. **Rota de editar funcionário não existia** (`App.tsx`) — só havia
   `/funcionarios` e `/funcionarios/novo`. `/funcionarios/:id` estava
   faltando, então clicar em "editar" caía no catch-all → login. Adicionada.

2. **401 de negócio forçava logout** (`services/api.ts`, `requisicao()`) —
   qualquer 401 disparava `tratar401SessaoExpirada()`, mesmo quando o 401 era
   `CREDENCIAIS_INVALIDAS` (ex: senha atual errada ao trocar senha). Agora só
   força logout se o código de erro não for `CREDENCIAIS_INVALIDAS`.

3. **Upload de imagem real** — vocês criaram `POST /uploads/imagem`
   (Firebase). Adicionado `enviarImagem()` em `api.ts` + componente novo
   `components/ui/SeletorImagem.tsx` (abre o seletor de arquivo do SO de
   verdade, valida tipo/tamanho no cliente, mostra preview e loading). Ligado
   em:
   - `PaginaFormularioProduto.tsx` (foto do produto)
   - `PaginaEditarInfoLoja.tsx` (foto/logo da loja)

4. **`PaginaEditarInfoLoja.tsx` nunca mostrava os dados reais** — o
   `useState(loja?.nome ?? '')` só lê `loja` uma vez, no primeiro render;
   como `loja` chega assíncrono do contexto, o formulário sempre iniciava
   vazio. Trocado por `useEffect` que sincroniza quando `loja` muda. Mesma
   causa afetava a foto (nunca aparecia) e o botão "Alterar foto" (não tinha
   nem `onClick`).

5. **`PaginaInformacaoLoja.tsx`, `PaginaEnderecoLoja.tsx`,
   `PaginaFormasPagamento.tsx`** — usavam `lojaMock` fixo. Reescritas pra ler
   de `useLoja()` e salvar de verdade via `atualizarLoja()` (payload
   completo, mesma regra de sempre). Endereço agora também usa o CEP real
   (ViaCEP, função `buscarCep` que já existia em `api.ts` mas não era usada
   aqui) em vez de um `setTimeout` com endereço fake.

## Backend (arquivo à parte, não incluso neste zip — é do outro repo)

`LojaService.obterMinhaLoja()` e `atualizarLoja()` só verificavam
`loja.usuarioId` direto — um funcionário (que não é o dono) sempre caía em
`LOJA_NAO_ENCONTRADA`, e o frontend interpretava isso como "ainda não tem
loja", mandando pro onboarding. Trocado pra usar `LojaAccessService` (resolve
dono OU funcionário), igual já era feito em Produto/Pedido/Painel/Financeiro.

## Ainda NÃO corrigido (fica pra próxima entrega)

- `PaginaConfiguracoesConta.tsx`: e-mail/telefone continuam mock fixo, falta
  o campo "senha atual" (por isso trocar senha nunca funcionava — mandava a
  senha nova duas vezes), e as 4 notificações continuam só estado local
  (vocês já criaram `GET/PUT /usuarios/{id}/preferencias-notificacao`, só
  falta ligar).
- Toggle "loja aberta/fechada" no painel ainda usa meu workaround antigo
  (manda a loja inteira via `PUT /lojas/{id}`) em vez da rota dedicada
  `PATCH /lojas/{id}/abertura` que vocês criaram — funciona, mas vale trocar.
- Reposição de estoque (`PATCH /produtos/{id}/estoque`, `AtualizarEstoqueDTO`)
  que vocês criaram — nenhuma tela usa ainda, não estava na lista de bugs
  reportados.
