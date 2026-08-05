# Architecture

This document describes the components of the CFD trading app, how they
communicate, and the conventions used across the codebase.

## High-level data flow

```
                 +------------+   NATS request/reply    +-----------------+
                 |  backend   | ----------------------->|     engine      |
                 | (REST :5000)|<-----------------------| (order book)    |
                 +-----+------+                         +--------+--------+
                       |   ^                                     |
        SSE /api/events|   | JetStream events                    | prices
                       v   | (ORDER_EXECUTED,                     v
                 +-----+------+                       +------------+--------+
                 |  frontend  |                       |       poller        |
                 | (Next :3000)|                       | (WS feed + gRPC)   |
                 +------------+                       +---------------------+
```

All backend ↔ engine communication happens over NATS. The poller ingests the
exchange WS feed and publishes live prices; the engine consumes them to match
orders and evaluate TP/SL. The backend persists state to Postgres (Prisma) and
caches hot data in Redis. The frontend talks to the backend over REST + SSE and
subscribes to the exchange WS feed directly in the browser.

## Components

### packages/contracts (`@cfd/contracts`)

Single source of truth shared by backend, engine and poller:

- `src/subjects.ts` — NATS subject names (`SUBJECTS`).
- `src/types.ts` — domain enums and payload interfaces (order, side, tp/sl, close).
- `src/schemas.ts` — zod request schemas (`marketOrderSchema`, `limitOrderSchema`,
  `depositSchema`, `withdrawSchema`, `closeOrderSchema`, `modifySchema`,
  `candlesParamsSchema`) plus inferred payload types.

The backend's `validateBody`/`validateParams` middleware (in
`backend/src/main/validation/validate.ts`) runs these schemas and returns
`400` with the zod `flatten()` errors on failure.

### backend (Express REST API)

- **Port** 5000. Health checks: `/healthz`, `/readyz` (via `@godaddy/terminus`).
- **Auth** — JWT in an httpOnly cookie; `authMiddleware` verifies the token,
  checks the Redis blacklist (`jwt:blacklist:<jti>`) and sets `req.userId`.
- **Idempotency** — mutating routes require an `ikey` (UUID). The
  `idempotency` middleware short-circuits duplicates (409) and replays stored
  responses (200) so client retries never double-apply.
- **Balance** — cached in Redis (`balance:<userId>`, 1h TTL); DB is the source
  of truth. Deposits/withdrawals/orders settle in a single Prisma transaction
  through `balanceService.ts`.
- **Orders** — market/limit/create, modify TP/SL, close, close-all, list, plus
  get balance and get candles (via gRPC to the poller).
- **Events** — `GET /api/events` is an SSE stream (`sse.ts`). Online users get
  pushed `orderExecuted`/`orderCompleted` events; offline events are buffered in
  Redis (`notifications:<userId>`, capped at 50) and replayed on reconnect using
  `Last-Event-ID`.
- **Engine events** — a JetStream durable consumer (`backend-orders`) on
  `backend.order.>` applies engine outcomes to the DB and notifies via SSE.
- **Logging** — structured JSON via pino + pino-http. Every request gets a
  `req.id`, echoed back in the `X-Request-Id` response header, and requests are
  correlated with `userId`. Health checks and the SSE stream are excluded from
  request auto-logging. (Deviation: pino emits JSON; the human-readable
  `console.log` convention in AGENTS.md is still used for handler-level logs.)

### engine (order matching)

- In-memory order book (`orderBook.ts`) per symbol with a matcher (`matcher.ts`).
- On boot it rehydrates open orders from Postgres (`boot/rehydrate.ts`).
- Subscribes to `price.<symbol>` NATS subjects published by the poller and keeps
  `livePrices`.
- Request handlers (`handlers.ts`):
  - `engine.limitOrder.submit` — add a limit order to the book, reply `{success}`.
  - `engine.order.cancel` — remove an order, reply `{success}`.
  - `engine.order.tpSl` — register/update TP/SL for a running order.
  - `engine.order.close` — reply `{success, id, closePrice}` from the latest
    live price; the backend settles PnL.
  - `engine.user.closeOrders` — remove all of a user's open orders.
- Publishes `backend.order.executed` and `backend.order.completed` as JetStream
  events for the backend to persist and notify.

### poller (market data)

- Subscribes to the exchange WS feed (`BACKPACK_URL`), persists candles to
  Postgres, and publishes live prices to NATS on `price.<symbol>`.
- Exposes a gRPC `GetCandles` server (default :50051) that the backend calls
  for chart data; the backend caches candle responses in Redis (`symbol:<...>`).

### frontend (Next.js)

- Standalone app (not an npm workspace). Trading UI with live tickers/klines
  straight from the exchange WS (`NEXT_PUBLIC_BACKPACK_URL`), REST mutations,
  and SSE for position updates. Retries timed-out order placements with a fresh
  `ikey` (each ikey is applied at most once).

## NATS subjects (`packages/contracts/src/subjects.ts`)

| Subject                    | Direction          | Purpose                              |
|----------------------------|--------------------|--------------------------------------|
| `engine.limitOrder.submit` | backend → engine   | add limit order (request/reply)      |
| `engine.order.cancel`      | backend → engine   | cancel an order                      |
| `engine.order.tpSl`        | backend → engine   | set/update TP and SL                 |
| `engine.order.close`       | backend → engine   | get close price for an order         |
| `engine.user.closeOrders`  | backend → engine   | drop all of a user's open orders     |
| `backend.order.executed`   | engine → backend   | order filled (JetStream event)       |
| `backend.order.completed`  | engine → backend   | order closed by TP/SL (JetStream event) |
| `price.<symbol>`           | poller → engine    | live price feed                      |

## Redis keys

| Key                          | Purpose                                              | TTL    |
|------------------------------|------------------------------------------------------|--------|
| `balance:<userId>`           | cached user balance                                  | 1h     |
| `LIVE-PRICE-<WS_SYMBOL>`     | cached live price (e.g. `BTC_USDC`)                  | —      |
| `jwt:blacklist:<jti>`        | logged-out token ids                                 | —      |
| `sse:lastEventId:<userId>`   | last SSE event id                                    | —      |
| `notifications:<userId>`     | offline SSE event buffer                             | capped |
| candle cache keys            | gRPC candle responses keyed by symbol/timeframe      | 60s    |

## Idempotency

Every mutating endpoint (`/market`, `/limit`, `/close`, `/modify`, `/deposit`,
`/withdraw`) requires an `ikey`. Flow:

1. `idempotency` middleware runs `IdempotencyCheck`.
2. `firstRequest` → proceed to the handler.
3. `alreadyHaveResponse` → replay the stored success response (200).
4. `duplicateRequest` → `409 Duplicate request.` (a second concurrent request
   with the same ikey before the first finished).
5. On failure the handler stores the error so a retry with the same ikey is not
   re-executed.

## Error conventions

- `400` — missing/invalid fields, insufficient balance.
- `401` — unauthenticated, expired/tampered/logged-out token.
- `404` — genuinely not found (order/user does not exist).
- `409` — duplicate idempotency key.
- `500` — internal failures (balance/order persistence).
- `503` — upstream data unavailable (live price/close price not cached).

All error bodies are `{ success: false, message: string }`; validation failures
additionally include `errors` from zod `flatten()`.
