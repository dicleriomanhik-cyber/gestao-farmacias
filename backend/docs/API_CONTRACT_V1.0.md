# CONTRATO OFICIAL DA API â€” FRONT-END (VERSÃƒO 1.0)
**Sistema Profissional de GestÃ£o de FarmÃ¡cias para MoÃ§ambique**
**Data de Congelamento:** 21 de Outubro de 2026
**Estado:** Congelado para desenvolvimento do Front-end.
**Nota:** O congelamento documental nÃ£o equivale a certificaÃ§Ã£o de prontidÃ£o para produÃ§Ã£o.

---

## 1. Envelopes e Formatos Comuns
- **Sucesso:** `{ success: true, data: {...}, timestamp: "ISO" }`
- **Erro:** `{ success: false, error: { statusCode, code, message, path, timestamp } }`
- **IDs:** UUID v4.
- **Datas:** ISO 8601 UTC.
- **Valores MonetÃ¡rios:** String decimal com 2 casas (ex: `"1500.00"`).
- **PaginaÃ§Ã£o:** `page` (default 1), `limit` (default 20, mÃ¡x 100). Resposta: `{ data: [...], meta: { total, page, limit, totalPages } }`.

## 2. AutenticaÃ§Ã£o
- **Login (`POST /auth/login`):** Retorna `accessToken` (15m) e `refreshToken` (7d).
- **Refresh (`POST /auth/refresh`):** O `refreshToken` Ã© enviado no **corpo JSON**. Realiza rotaÃ§Ã£o (revoga o antigo) e devolve um novo par.
- **Logout (`POST /auth/logout`):** Requer Bearer Token. O `refreshToken` vai no corpo JSON. Revoga a famÃ­lia de tokens.
- **Armazenamento:** O `accessToken` deve ser mantido em memÃ³ria. O `refreshToken` deve ser guardado em `localStorage` ou BFF. O Back-end nÃ£o implementa cookies HttpOnly.

## 3. Matriz de PermissÃµes Oficial
*(ExtraÃ­da do cÃ³digo fonte e do seed. Os papÃ©is sÃ£o: ADMIN, PHARMACIST, CASHIER, STOCK_MANAGER).*

| MÃ©todo | Rota | PermissÃ£o | ADMIN | PHARMACIST | CASHIER | STOCK_MANAGER |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | PÃºblico | âœ“ | âœ“ | âœ“ | âœ“ |
| POST | `/auth/refresh` | PÃºblico | âœ“ | âœ“ | âœ“ | âœ“ |
| POST | `/auth/logout` | Bearer | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/users` | `users:read` | âœ“ | âœ— | âœ— | âœ— |
| GET | `/users/:id` | `users:read` | âœ“ | âœ— | âœ— | âœ— |
| POST | `/users` | `users:write` | âœ“ | âœ— | âœ— | âœ— |
| PATCH | `/users/:id` | `users:write` | âœ“ | âœ— | âœ— | âœ— |
| PATCH | `/users/me/password` | Bearer | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/pharmacy` | `pharmacy:config:read` | âœ“ | âœ— | âœ— | âœ— |
| PATCH | `/pharmacy` | `pharmacy:config:write` | âœ“ | âœ— | âœ— | âœ— |
| GET | `/categories` | `products:read` | âœ“ | âœ“ | âœ— | âœ“ |
| POST | `/categories` | `products:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/categories/:id` | `products:write` | âœ“ | âœ— | âœ— | âœ“ |
| GET | `/products` | `products:read` | âœ“ | âœ“ | âœ— | âœ“ |
| GET | `/products/:id` | `products:read` | âœ“ | âœ“ | âœ— | âœ“ |
| POST | `/products` | `products:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/products/:id` | `products:write` | âœ“ | âœ— | âœ— | âœ“ |
| GET | `/suppliers` | `suppliers:read` | âœ“ | âœ“ | âœ— | âœ“ |
| GET | `/suppliers/:id` | `suppliers:read` | âœ“ | âœ“ | âœ— | âœ“ |
| POST | `/suppliers` | `suppliers:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/suppliers/:id` | `suppliers:write` | âœ“ | âœ— | âœ— | âœ“ |
| GET | `/purchases` | `purchases:read` | âœ“ | âœ“ | âœ— | âœ“ |
| GET | `/purchases/:id` | `purchases:read` | âœ“ | âœ“ | âœ— | âœ“ |
| POST | `/purchases` | `purchases:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/purchases/:id` | `purchases:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/purchases/:id/confirm` | `purchases:write` | âœ“ | âœ— | âœ— | âœ“ |
| PATCH | `/purchases/:id/cancel` | `purchases:write` | âœ“ | âœ— | âœ— | âœ“ |
| GET | `/stock/lots` | `stock:read` | âœ“ | âœ“ | âœ— | âœ“ |
| GET | `/stock/movements` | `stock:read` | âœ“ | âœ“ | âœ— | âœ“ |
| POST | `/stock/receive` | `stock:write` | âœ“ | âœ— | âœ— | âœ“ |
| POST | `/stock/adjust` | `stock:adjust` | âœ“ | âœ— | âœ— | âœ“ |
| GET | `/sales` | `sales:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/sales/:id` | `sales:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| POST | `/sales` | `sales:create` | âœ“ | âœ“ | âœ“ | âœ— |
| PATCH | `/sales/:id` | `sales:create` | âœ“ | âœ“ | âœ“ | âœ— |
| PATCH | `/sales/:id/confirm` | `sales:create` | âœ“ | âœ“ | âœ“ | âœ— |
| GET | `/cash/active` | `cash:open` | âœ“ | âœ— | âœ“ | âœ— |
| POST | `/cash/open` | `cash:open` | âœ“ | âœ— | âœ“ | âœ— |
| PATCH | `/cash/:id/close` | `cash:close` | âœ“ | âœ— | âœ“ | âœ— |
| POST | `/cash/payments` | `cash:open` | âœ“ | âœ— | âœ“ | âœ— |
| POST | `/cash/movements` | `cash:open` | âœ“ | âœ— | âœ“ | âœ— |
| GET | `/returns` | `returns:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/returns/:id` | `returns:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| POST | `/returns` | `returns:create` | âœ“ | âœ“ | âœ— | âœ— |
| PATCH | `/returns/:id` | `returns:create` | âœ“ | âœ“ | âœ— | âœ— |
| PATCH | `/returns/:id/cancel` | `returns:create` | âœ“ | âœ“ | âœ— | âœ— |
| PATCH | `/returns/:id/confirm` | `returns:confirm` | âœ“ | âœ“ | âœ— | âœ— |
| GET | `/returns/quarantine` | `returns:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| PATCH | `/returns/:id/lines/:lineId/inspect` | `returns:inspect` | âœ“ | âœ“ | âœ— | âœ— |
| POST | `/returns/:id/refund` | `returns:refund` | âœ“ | âœ— | âœ“ | âœ— |
| PATCH | `/returns/refunds/:refundId/confirm` | `returns:refund` | âœ“ | âœ— | âœ“ | âœ— |
| GET | `/expenses` | `expenses:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/expenses/:id` | `expenses:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| POST | `/expenses` | `expenses:create` | âœ“ | âœ“ | âœ“ | âœ— |
| PATCH | `/expenses/:id` | `expenses:create` | âœ“ | âœ“ | âœ“ | âœ— |
| PATCH | `/expenses/:id/cancel` | `expenses:cancel` | âœ“ | âœ— | âœ— | âœ— |
| PATCH | `/expenses/:id/confirm` | `expenses:confirm` | âœ“ | âœ“ | âœ“ | âœ— |
| GET | `/reports/summary` | `reports:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/reports/sales` | `reports:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/reports/expenses` | `reports:financial` | âœ“ | âœ— | âœ— | âœ— |
| GET | `/reports/cash` | `reports:read` | âœ“ | âœ“ | âœ“ | âœ“ |
| GET | `/reports/stock` | `reports:read` | âœ“ | âœ“ | âœ“ | âœ“ |

## 4. Fluxos de NegÃ³cio Principais
1. **Compra â†’ Stock:** `POST /purchases` (DRAFT) â†’ `PATCH /purchases/:id/confirm` â†’ `POST /stock/receive` (Cria Lote e Movimento).
2. **Venda -> Caixa:** `POST /cash/open` (obrigatorio para CASH) -> `POST /sales` (DRAFT) -> `PATCH /sales/:id/confirm` (reduz stock via FEFO) -> `POST /cash/payments`. Em modo offline, a venda pode ser sincronizada primeiro (`POST /sync/push` com `operationType=SALE`) e o pagamento posteriormente (`operationType=PAYMENT`, com a mesma `idempotencyKey`). Uma venda pode receber varios pagamentos; o estado financeiro e derivado de `Sum(SalePayment.amount)` vs `Sale.total`. `PAYMENT` exige `CashSession` OPEN.
3. **DevoluÃ§Ã£o:** `POST /returns` (DRAFT) â†’ `PATCH /returns/:id/confirm` (Entra na Quarentena) â†’ `PATCH /returns/:id/lines/:lineId/inspect` (Decide se volta ao stock) â†’ `POST /returns/:id/refund` (Reembolso).
4. **Despesa:** `POST /expenses` (DRAFT) â†’ `PATCH /expenses/:id/confirm` (Se CASH, cria CashMovement OUT automaticamente).

## 5. SemÃ¢ntica de Reembolsos Digitais
- Reembolsos CASH sÃ£o concluÃ­dos imediatamente (status `COMPLETED`) e afetam o saldo fÃ­sico.
- Reembolsos Digitais sÃ£o criados com status `PENDING`.
- O endpoint `PATCH /returns/refunds/:refundId/confirm` permite transitar de `PENDING` para `COMPLETED` (confirmado manualmente), `FAILED` (falhou) ou `CANCELLED` (cancelado). TransiÃ§Ãµes a partir de estados finais sÃ£o bloqueadas.

## 6. LimitaÃ§Ãµes Conhecidas e DÃ­vida TÃ©cnica
- **Rota sem paginaÃ§Ã£o:** `GET /categories` devolve todos os registos de uma vez (recomenda-se cache local no Front-end).
- **Filtros em relatÃ³rios:** `GET /reports/sales` nÃ£o aceita filtro por mÃ©todo de pagamento na query (a agregaÃ§Ã£o Ã© devolvida na resposta).
- **Lacunas de testes E2E:** As rotas `GET /users/:id`, `PATCH /categories/:id`, `GET /suppliers/:id`, `GET /sales/:id`, `PATCH /sales/:id`, `GET /expenses/:id`, `PATCH /expenses/:id/cancel`, `GET /returns/:id` e `PATCH /returns/:id` nÃ£o possuem testes E2E dedicados (embora estejam implementadas e protegidas).
- **DÃ­vida TÃ©cnica:** Uso de `@ts-nocheck` nos mÃ³dulos de negÃ³cio (nÃ£o afeta o runtime, mas reduz a seguranÃ§a de tipagem).
- **IntegraÃ§Ãµes:** M-Pesa/e-Mola sÃ£o registados manualmente (sem integraÃ§Ã£o real com as APIs das operadoras).

## 7. EvidÃªncia de Testes (Registo HistÃ³rico)
- **Data:** 21 de Outubro de 2026.
- **Comando:** `npm run test:e2e -- --runInBand --forceExit`
- **Resultado:** 18 suites aprovadas, 94 testes aprovados, 0 falhados.
- **ObservaÃ§Ãµes:** Aviso `--forceExit` e mensagem de conflito de chave `expenseId` (esperada no teste de rollback de despesas) nÃ£o invalidam o resultado.

## 8. SincronizaÃ§Ã£o Offline (ExtensÃ£o)
*ExtensÃ£o do contrato aprovada nas etapas OFF-01 a OFF-03.*

- **AutenticaÃ§Ã£o:** Requer Bearer Token. O isolamento Ã© estrito via pharmacyId extraÃ­do do JWT (nunca do body).
- **PermissÃµes:** sync:push e sync:pull.

### 8.1 POST /sync/push
Envia operaÃ§Ãµes offline para processamento.
- **Limites:** MÃ¡ximo 50 operaÃ§Ãµes por pedido. MÃ¡ximo 64 KiB por payload individual.
- **VersÃ£o:** A ppVersion deve ser >= MIN_CLIENT_VERSION (default 1.0.0). Caso contrÃ¡rio, devolve 422.
- **ValidaÃ§Ã£o:** O clientId deve pertencer Ã  farmÃ¡cia e estar ACTIVE.
- **IdempotÃªncia:** A idempotencyKey (UUID v4) reserva a operaÃ§Ã£o. RepetiÃ§Ãµes com o mesmo payload devolvem o resultado original (PROCESSED ou REJECTED). ReutilizaÃ§Ã£o com payload diferente devolve REJECTED com cÃ³digo IDEMPOTENCY_KEY_CONFLICT.
- **Estados:** PROCESSED (venda confirmada), REJECTED (erro de negÃ³cio/validaÃ§Ã£o) e PENDING (reservado, aguarda processamento). O HTTP Ã© 201 mesmo para rejeiÃ§Ãµes no array de resultados.

### 8.2 GET /sync/pull
ObtÃ©m alteraÃ§Ãµes do servidor para actualizar o cliente offline.
- **Query Params:** clientId (obrigatÃ³rio), cursor (opcional), limit (opcional, 1-100, default 50).
- **Cursor:** Opaco (Base64 do `sequence`; ver §9.2). Define a fronteira estrita de onde a página seguinte começa.
- **Resposta:** Devolve um array changes (com 	ype: PRODUCT, STOCK_LOT ou SALE), o 
extCursor e hasMore (boolean).

### 8.3 LimitaÃ§Ãµes Conhecidas do Sync
- **DetecÃ§Ã£o de actualizaÃ§Ãµes:** O cursor baseia-se em createdAt. ActualizaÃ§Ãµes a produtos ou stock existentes (que nÃ£o alteram createdAt) nÃ£o sÃ£o devolvidas. O Pull actual destina-se primariamente a sincronizaÃ§Ã£o inicial ou de novos registos.
- **PaginaÃ§Ã£o Multi-tabela:** O limite (	ake) Ã© aplicado individualmente Ã s 3 tabelas antes da junÃ§Ã£o em memÃ³ria. Em cenÃ¡rios de elevada densidade de dados (ex.: muitos produtos e poucas vendas), o corte em memÃ³ria pode omitir registos entre pÃ¡ginas. Para uma sincronizaÃ§Ã£o sem perdas absolutas de registos massivos, serÃ¡ necessÃ¡ria uma tabela de *outbox/eventos* (requer autorizaÃ§Ã£o e migraÃ§Ã£o futura).
- **OperaÃ§Ãµes PENDING:** Se o processo falhar durante a venda, a operaÃ§Ã£o fica PENDING no servidor. O cliente deve reenviar a operaÃ§Ã£o com a mesma chave para obter o resultado final.

## 9. Outbox Transaccional (OFF-04)

O Pull consome agora uma tabela outbox_events transaccional. Cada alteraÃ§Ã£o de negÃ³cio relevante (Produto, Lote, Venda) gera um evento na mesma transacÃ§Ã£o da alteraÃ§Ã£o. Sem rollback, nÃ£o hÃ¡ evento.

### 9.1 Modelo
- sequence (BigInt, auto-increment, chave primÃ¡ria) â€” cursor estÃ¡vel e ordenÃ¡vel.
- pharmacyId, entityType (PRODUCT, STOCK_LOT, SALE), entityId, ction (CREATED, UPDATED, CONFIRMED), payload (JSON), createdAt.
- Ãndice composto (pharmacyId, sequence).

### 9.2 Pull sobre Outbox
- GET /sync/pull?clientId=...&cursor=...&limit=... devolve eventos com sequence > cursor.
- Cursor opaco Base64 do sequence (BigInt como string decimal).
- Cada alteraÃ§Ã£o Ã© detectada, incluindo **actualizaÃ§Ãµes** (nÃ£o apenas criaÃ§Ã£o).
- OrdenaÃ§Ã£o determinÃ­stica por sequence. Sem perdas entre pÃ¡ginas.
- Resposta: { changes: [{ type, action, data }], nextCursor, hasMore }.
- AlteraÃ§Ã£o de formato: changes[].action foi adicionado (nÃ£o quebra clientes antigos que ignoravam campo extra).

### 9.3 Push e PENDING
- O Push continua inalterado (idempotÃªncia, conflitos, 422).
- OperaÃ§Ã£o PENDING recupera-se pelo cliente repetindo o mesmo POST /push com a mesma chave; o servidor faz read-back. NÃ£o hÃ¡ promoÃ§Ã£o automÃ¡tica de PENDING para REJECTED por falha transitÃ³ria.
- NÃ£o hÃ¡ worker assÃ­ncrono. Se a operaÃ§Ã£o ficou PENDING por falha do servidor, o cliente deve reenviar.

### 9.4 LimitaÃ§Ãµes
- NÃ£o hÃ¡ retenÃ§Ã£o/limpeza automÃ¡tica de eventos (polÃ­tica manual futura).
- SerializaÃ§Ã£o por farmÃ¡cia nÃ£o Ã© usada; sequence global Ã© atribuÃ­do na transacÃ§Ã£o, mas o commit pode ser out-of-order. O cliente deve sempre tratar hasMore e repetir sem avanÃ§ar se suspeitar de eventos ainda nÃ£o commitados (caso raro em prÃ¡tica).

### 9.5 Consulta de OperaÃ§Ã£o de SincronizaÃ§Ã£o
- **Rota:** GET /api/v1/sync/operations/:idempotencyKey?clientId=...
- **PermissÃ£o:** sync:pull.
- **ValidaÃ§Ã£o:** idempotencyKey no path (UUID v4 via ParseUUIDPipe); clientId obrigatÃ³rio na query.
- **Isolamento:** pharmacyId do JWT + verificaÃ§Ã£o de pertenÃ§a e estado ACTIVE do SyncClient. OperaÃ§Ãµes de outra farmÃ¡cia ou de outro cliente devolvem 404.
- **Efeitos secundÃ¡rios:** nenhum. NÃ£o reivindica operaÃ§Ãµes, nÃ£o executa vendas, nÃ£o toca no ttemptId nem no checkpoint.
- **Resposta 200:** { idempotencyKey, status, result, rejectionCode, rejectionReason, createdAt, processedAt }. O payload **nÃ£o** Ã© devolvido.
- **Erros:** 400 (idempotencyKey malformado ou clientId ausente), 403 (sem sync:pull), 404 (operaÃ§Ã£o ou cliente inexistente), 401 (token invÃ¡lido).


### 9.6 Atomicidade Transaccional e Idempotencia

- A operacao de Sync (SALE ou PAYMENT), o efeito de negocio correspondente (Sale + SaleLine + StockMovement + SaleLineLot, ou SalePayment), o AuditLog, o OutboxEvent e a actualizacao do SyncCheckpoint sao executados **numa unica transaccao de base de dados** quando originados por POST /sync/push. Um erro de infra-estrutura (ex: falha do PostgreSQL, excepcao nao relacionada com regra de negocio) provoca rollback de **todos** os efeitos; nenhum fica persistido isoladamente.
- Erros de negocio conhecidos (BadRequestException, NotFoundException) sao tratados como rejeicoes e a SyncOperation e persistida com status: REJECTED ou CONFLICT, mantendo o contrato HTTP 201 e o resultado no array esults[]. Erros de infra-estrutura propagam como HTTP 500, o SyncOperation fica PENDING e a mesma idempotencyKey pode ser reenviada; o fencing por ttemptId garante que a proxima tentativa reivindica a operacao corretamente.
- A idempotencyKey (SyncOperation.idempotencyKey e SalePayment.idempotencyKey) e unica **por farmacia**, nao por cliente Sync. Dois clientes Sync diferentes da mesma farmacia que enviem a mesma idempotencyKey com payloads identicos recebem o mesmo resultado persistido; com payloads diferentes recebem REJECTED / IDEMPOTENCY_KEY_CONFLICT. O isolamento entre farmacias e garantido pela chave composta (pharmacyId, idempotencyKey).