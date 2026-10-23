# CONTRATO OFICIAL DA API — FRONT-END (VERSÃO 1.0)
**Sistema Profissional de Gestão de Farmácias para Moçambique**
**Data de Congelamento:** 21 de Outubro de 2026
**Estado:** Congelado para desenvolvimento do Front-end.
**Nota:** O congelamento documental não equivale a certificação de prontidão para produção.

---

## 1. Envelopes e Formatos Comuns
- **Sucesso:** `{ success: true, data: {...}, timestamp: "ISO" }`
- **Erro:** `{ success: false, error: { statusCode, code, message, path, timestamp } }`
- **IDs:** UUID v4.
- **Datas:** ISO 8601 UTC.
- **Valores Monetários:** String decimal com 2 casas (ex: `"1500.00"`).
- **Paginação:** `page` (default 1), `limit` (default 20, máx 100). Resposta: `{ data: [...], meta: { total, page, limit, totalPages } }`.

## 2. Autenticação
- **Login (`POST /auth/login`):** Retorna `accessToken` (15m) e `refreshToken` (7d).
- **Refresh (`POST /auth/refresh`):** O `refreshToken` é enviado no **corpo JSON**. Realiza rotação (revoga o antigo) e devolve um novo par.
- **Logout (`POST /auth/logout`):** Requer Bearer Token. O `refreshToken` vai no corpo JSON. Revoga a família de tokens.
- **Armazenamento:** O `accessToken` deve ser mantido em memória. O `refreshToken` deve ser guardado em `localStorage` ou BFF. O Back-end não implementa cookies HttpOnly.

## 3. Matriz de Permissões Oficial
*(Extraída do código fonte e do seed. Os papéis são: ADMIN, PHARMACIST, CASHIER, STOCK_MANAGER).*

| Método | Rota | Permissão | ADMIN | PHARMACIST | CASHIER | STOCK_MANAGER |
|---|---|---|---|---|---|---|
| POST | `/auth/login` | Público | ✓ | ✓ | ✓ | ✓ |
| POST | `/auth/refresh` | Público | ✓ | ✓ | ✓ | ✓ |
| POST | `/auth/logout` | Bearer | ✓ | ✓ | ✓ | ✓ |
| GET | `/users` | `users:read` | ✓ | ✗ | ✗ | ✗ |
| GET | `/users/:id` | `users:read` | ✓ | ✗ | ✗ | ✗ |
| POST | `/users` | `users:write` | ✓ | ✗ | ✗ | ✗ |
| PATCH | `/users/:id` | `users:write` | ✓ | ✗ | ✗ | ✗ |
| PATCH | `/users/me/password` | Bearer | ✓ | ✓ | ✓ | ✓ |
| GET | `/pharmacy` | `pharmacy:config:read` | ✓ | ✗ | ✗ | ✗ |
| PATCH | `/pharmacy` | `pharmacy:config:write` | ✓ | ✗ | ✗ | ✗ |
| GET | `/categories` | `products:read` | ✓ | ✓ | ✗ | ✓ |
| POST | `/categories` | `products:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/categories/:id` | `products:write` | ✓ | ✗ | ✗ | ✓ |
| GET | `/products` | `products:read` | ✓ | ✓ | ✗ | ✓ |
| GET | `/products/:id` | `products:read` | ✓ | ✓ | ✗ | ✓ |
| POST | `/products` | `products:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/products/:id` | `products:write` | ✓ | ✗ | ✗ | ✓ |
| GET | `/suppliers` | `suppliers:read` | ✓ | ✓ | ✗ | ✓ |
| GET | `/suppliers/:id` | `suppliers:read` | ✓ | ✓ | ✗ | ✓ |
| POST | `/suppliers` | `suppliers:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/suppliers/:id` | `suppliers:write` | ✓ | ✗ | ✗ | ✓ |
| GET | `/purchases` | `purchases:read` | ✓ | ✓ | ✗ | ✓ |
| GET | `/purchases/:id` | `purchases:read` | ✓ | ✓ | ✗ | ✓ |
| POST | `/purchases` | `purchases:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/purchases/:id` | `purchases:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/purchases/:id/confirm` | `purchases:write` | ✓ | ✗ | ✗ | ✓ |
| PATCH | `/purchases/:id/cancel` | `purchases:write` | ✓ | ✗ | ✗ | ✓ |
| GET | `/stock/lots` | `stock:read` | ✓ | ✓ | ✗ | ✓ |
| GET | `/stock/movements` | `stock:read` | ✓ | ✓ | ✗ | ✓ |
| POST | `/stock/receive` | `stock:write` | ✓ | ✗ | ✗ | ✓ |
| POST | `/stock/adjust` | `stock:adjust` | ✓ | ✗ | ✗ | ✓ |
| GET | `/sales` | `sales:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/sales/:id` | `sales:read` | ✓ | ✓ | ✓ | ✓ |
| POST | `/sales` | `sales:create` | ✓ | ✓ | ✓ | ✗ |
| PATCH | `/sales/:id` | `sales:create` | ✓ | ✓ | ✓ | ✗ |
| PATCH | `/sales/:id/confirm` | `sales:create` | ✓ | ✓ | ✓ | ✗ |
| GET | `/cash/active` | `cash:open` | ✓ | ✗ | ✓ | ✗ |
| POST | `/cash/open` | `cash:open` | ✓ | ✗ | ✓ | ✗ |
| PATCH | `/cash/:id/close` | `cash:close` | ✓ | ✗ | ✓ | ✗ |
| POST | `/cash/payments` | `cash:open` | ✓ | ✗ | ✓ | ✗ |
| POST | `/cash/movements` | `cash:open` | ✓ | ✗ | ✓ | ✗ |
| GET | `/returns` | `returns:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/returns/:id` | `returns:read` | ✓ | ✓ | ✓ | ✓ |
| POST | `/returns` | `returns:create` | ✓ | ✓ | ✗ | ✗ |
| PATCH | `/returns/:id` | `returns:create` | ✓ | ✓ | ✗ | ✗ |
| PATCH | `/returns/:id/cancel` | `returns:create` | ✓ | ✓ | ✗ | ✗ |
| PATCH | `/returns/:id/confirm` | `returns:confirm` | ✓ | ✓ | ✗ | ✗ |
| GET | `/returns/quarantine` | `returns:read` | ✓ | ✓ | ✓ | ✓ |
| PATCH | `/returns/:id/lines/:lineId/inspect` | `returns:inspect` | ✓ | ✓ | ✗ | ✗ |
| POST | `/returns/:id/refund` | `returns:refund` | ✓ | ✗ | ✓ | ✗ |
| PATCH | `/returns/refunds/:refundId/confirm` | `returns:refund` | ✓ | ✗ | ✓ | ✗ |
| GET | `/expenses` | `expenses:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/expenses/:id` | `expenses:read` | ✓ | ✓ | ✓ | ✓ |
| POST | `/expenses` | `expenses:create` | ✓ | ✓ | ✓ | ✗ |
| PATCH | `/expenses/:id` | `expenses:create` | ✓ | ✓ | ✓ | ✗ |
| PATCH | `/expenses/:id/cancel` | `expenses:cancel` | ✓ | ✗ | ✗ | ✗ |
| PATCH | `/expenses/:id/confirm` | `expenses:confirm` | ✓ | ✓ | ✓ | ✗ |
| GET | `/reports/summary` | `reports:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/reports/sales` | `reports:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/reports/expenses` | `reports:financial` | ✓ | ✗ | ✗ | ✗ |
| GET | `/reports/cash` | `reports:read` | ✓ | ✓ | ✓ | ✓ |
| GET | `/reports/stock` | `reports:read` | ✓ | ✓ | ✓ | ✓ |

**Paginação de `GET /categories`:**
- Parâmetros opcionais de query: `page` (default 1) e `limit` (default 20, máximo 100).
- Resposta: `{ data: [...], meta: { total, page, limit, totalPages } }`.
- Sem os parâmetros, aplicam-se os defaults.

**Filtro por método de pagamento em `GET /reports/sales`:**
- Parâmetro opcional de query: `method`.
- Valores aceites: `CASH`, `CARD`, `MPESA`, `EMOLA`, `TRANSFER`, `OTHER`.
- Comportamento: selecciona apenas as vendas que tenham pelo menos um pagamento com o método indicado.
- Os pagamentos das vendas seleccionadas permanecem completos na resposta.
- O campo `byPaymentMethod` reflecte os pagamentos dessas vendas.
- Sem o parâmetro, o comportamento anterior mantém-se.

## 4. Fluxos de Negócio Principais
1. **Compra → Stock:** `POST /purchases` (DRAFT) → `PATCH /purchases/:id/confirm` → `POST /stock/receive` (Cria Lote e Movimento).
2. **Venda → Caixa:** `POST /cash/open` (obrigatório para CASH) → `POST /sales` (DRAFT) → `PATCH /sales/:id/confirm` (Reduz Stock via FEFO) → `POST /cash/payments`.
3. **Devolução:** `POST /returns` (DRAFT) → `PATCH /returns/:id/confirm` (Entra na Quarentena) → `PATCH /returns/:id/lines/:lineId/inspect` (Decide se volta ao stock) → `POST /returns/:id/refund` (Reembolso).
4. **Despesa:** `POST /expenses` (DRAFT) → `PATCH /expenses/:id/confirm` (Se CASH, cria CashMovement OUT automaticamente).

## 5. Semântica de Reembolsos Digitais
- Reembolsos CASH são concluídos imediatamente (status `COMPLETED`) e afetam o saldo físico.
- Reembolsos Digitais são criados com status `PENDING`.
- O endpoint `PATCH /returns/refunds/:refundId/confirm` permite transitar de `PENDING` para `COMPLETED` (confirmado manualmente), `FAILED` (falhou) ou `CANCELLED` (cancelado). Transições a partir de estados finais são bloqueadas.

## 6. Limitações Conhecidas e Dívida Técnica
- **Lacunas de testes E2E:** As rotas `GET /users/:id`, `PATCH /categories/:id`, `GET /suppliers/:id`, `GET /sales/:id`, `PATCH /sales/:id`, `GET /expenses/:id`, `PATCH /expenses/:id/cancel`, `GET /returns/:id` e `PATCH /returns/:id` não possuem testes E2E dedicados (embora estejam implementadas e protegidas).
- **Dívida Técnica:** Uso de `@ts-nocheck` nos módulos de negócio (não afeta o runtime, mas reduz a segurança de tipagem).
- **Integrações:** M-Pesa/e-Mola são registados manualmente (sem integração real com as APIs das operadoras).

## 7. Evidência de Testes (Registo Histórico)
- **Data:** 21 de Outubro de 2026.
- **Comando:** `npm run test:e2e -- --runInBand --forceExit`
- **Resultado:** 18 suites aprovadas, 94 testes aprovados, 0 falhados.
- **Observações:** Aviso `--forceExit` e mensagem de conflito de chave `expenseId` (esperada no teste de rollback de despesas) não invalidam o resultado.
