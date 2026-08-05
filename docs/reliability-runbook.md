# Reliability runbook (z.improvement #1, #2)

Manual verification for the durability features added in PHASE 1-3.

## Prerequisites (local stack)
| Service   | How to start                                      | Default port |
|-----------|---------------------------------------------------|--------------|
| NATS      | `nats-server -js`  (JetStream REQUIRED)           | 4222         |
| Redis     | `redis-server`                                    | 6379         |
| Postgres  | Neon (already configured in `backend/.env` / `poller/.env` / engine `DATABASE_URL`) | - |
| Backpack  | WS feed, set `BACKPACK_URL` in `poller/.env`      | - |

## Startup order
1. `nats-server -js`
2. `redis-server`
3. backend  (`cd backend && npm run dev`)
4. poller    (`cd poller && npm run dev`)
5. engine    (`cd engine && npm run dev`)

Engine requires `DATABASE_URL` (put it in `engine/.env`; `dotenv` is wired in `src/main/index.ts`).

## 4.1 Retry + DLQ (JetStream)
Stream `ORDERS` (subjects `backend.order.>`, file storage) and durable consumer
`backend-orders` (max_deliver=3, ack_wait=30s) are created idempotently on boot.

Useful nats-cli checks:
```
nats stream ls
nats stream info ORDERS
nats consumer info ORDERS backend-orders
```

DLQ: when a message exhausts max_deliver, the server publishes an advisory to
`$JS.EVENT.ADVISORY.CONSUMER.MAX_DELIVERIES.ORDERS.>` which is captured by the
`DLQ` stream.

## 4.2 Notification queue contract (stub, NOT built yet)
Offline toasts are buffered in Redis:
- Key: `notifications:<userId>`  (Redis list)
- Entry: `{ "id": number, "event": "orderExecuted" | "orderCompleted", "data": {...} }`
- Bounded to the last 50 entries (`ltrim` in `sse.ts`).
- Per-user monotonic id is persisted at `sse:lastEventId:<userId>` for replay.

The future notification service consumes these lists; current consumers are only
the SSE replay path (`sse.ts` `replayMissed`) which runs on reconnect using
`Last-Event-ID`.

## 4.3 Crash tests

### Test A - order book rehydrate (PHASE 1)
1. Start stack; place 2-3 PENDING limit orders + 1 RUNNING (TP/SL) order.
2. Kill the engine (Ctrl+C).
3. Restart engine; verify logs:
   `> [INFO] (rehydrate.ts) : rehydrated N order(s) into book`
4. Feed a price that should fill a limit order -> order fills. PASS if it does.

### Test B - durable fill / TP-SL delivery (PHASE 2)
1. Start stack; place an order likely to be filled.
2. Kill the backend.
3. Trigger fills (or wait for TP/SL). Engine publishes to JetStream; the
   `ORDERS` stream buffers them (backend-down case).
4. Restart backend; the durable consumer delivers buffered messages and the DB
   rows go PENDING -> RUNNING / COMPLETED. PASS if rows update + SSE toast fires.

### Test C - DLQ capture (PHASE 2/4)
1. Temporarily make the consumer fail (e.g. stop Postgres so the DB update throws).
2. Trigger a fill; the consumer naks; after 3 deliveries the message stops.
3. Verify advisory landed:
   `nats stream ls` -> `DLQ` has messages.
   PASS if `DLQ` stream message count > 0.

### Test D - offline toast replay (PHASE 3)
1. Do NOT open the frontend (user offline).
2. Trigger an order completion while backend is up -> buffered in
   `notifications:<userId>`.
3. Open the app / connect SSE; the missed toast replays. PASS if shown.
