# Referência de produto no chat

Branch preservada: `fix/lojista-review-20260928`, base `52ce6e7`.

O backend armazena `conteudo` textual com `Produto: nome`, `ID: id`, `Preço: valor`, `Imagem: URL` opcional, linha vazia e mensagem do cliente. O componente interpreta esse contrato já existente ao receber mensagens REST e WebSocket, incluindo histórico. Exibe nome, preço e foto HTTPS, com a mensagem abaixo; metadados não aparecem como texto bruto. Mensagens comuns permanecem comuns.

Não há migração de mensagens nem novo envio automático. Flutter só cria a referência quando o cliente entra pelo produto. Conversas abertas por pedidos não anexam resumo. O backend preserva idempotência por `clientMessageId`; este painel continua usando os identificadores persistidos.

Testes: histórico no formato legado, mensagem comum, suíte do chat e build de produção. Não houve validação em conversa real de produção.
