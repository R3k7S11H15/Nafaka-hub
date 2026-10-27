# nTZS payments — collections, disbursements, bills, treasury

Capability scope for this integration:

| Capability | Used for | nTZS endpoints |
| --- | --- | --- |
| `collections` | money in from a payer | `POST /v1/deposits`, `GET /v1/deposits/{id}` |
| `disbursements` | payouts to a phone or bank | `POST /v1/withdrawals/quote`, `POST /v1/withdrawals`, `GET /v1/withdrawals/{id}` |
| spend | bills and tills | `GET /v1/spend/billers`, `POST /v1/spend/quote`, `POST /v1/spend`, `GET /v1/spend/{id}` |
| `treasury` | balances, sub-wallets, holds | local ledger (`services/ntzsTreasury.js`) + `GET /v1/supply` |
| lookups | destination confirmation | `POST /v1/lookup/recipient-name`, `/merchant-name`, `/qr` |

**No `wallets` capability.** Nothing here provisions or references an end-user
wallet: collections omit `userId` so they land in the partner treasury, and every
outbound movement names a funding source (`NTZS_FUNDING_USER_ID`, or a
sub-wallet's own `funding_source_id`).

Contract: <https://www.ntzs.co.tz/openapi.json> (OpenAPI 3.1).

## Layout

```
backend-node/
  services/ntzs/index.js      transport, auth, idempotency, endpoints, webhook HMAC
  services/ntzs/errors.js     the three error shapes + retry policy per code
  services/ntzs/validate.js   whole-TZS amounts, phone numbers, destinations
  services/ntzsTreasury.js    treasury accounts, sub-wallets, ledger, holds
  services/ntzsPayments.js    collections, payouts, bills, webhook, reconcile
  routes/ntzs.js              REST surface, mounted at /api/ntzs
  database/ntzs_payments_schema.sql
src/services/ntzs.js          frontend client (web + mobile, platform-agnostic)
```

Apply the schema once:

```bash
mysql -u root jumla_rice_trading < backend-node/database/ntzs_payments_schema.sql
```

## Environment

```
NTZS_API_BASE=https://www.ntzs.co.tz/api/v1
NTZS_API_KEY=ntzs_test_…          # ntzs_live_… in production
NTZS_COLLECTION_USER_ID=           # optional override only — see below
NTZS_FUNDING_USER_ID=              # optional override only
NTZS_WEBHOOK_SECRET=whsec_…       # HMAC secret for inbound events
NTZS_TIMEOUT_MS=20000
```

`NTZS_FUNDING_USER_ID` is required for any outbound movement; without it the
request is refused locally with `missing_required_fields` rather than sent.

## Verified against the live API

Probed with the configured key (`ntzs_live_…`, `livemode: true`):

| Probe | Result |
| --- | --- |
| `GET /v1/testmode` | `livemode: true` — the key in `.env` is production, every call moves real money |
| `POST /v1/users` | 403 `wallets` capability not enabled — confirms the no-wallets scope |
| `POST /v1/deposits` without `userId` and without `endUser` | 400 `userId and amountTzs are required` — a static "required fields" sentence. Adding `endUser` returns **201** |
| `POST /v1/deposits` with `endUser` | **201**, `collectToTreasury: true`, M-Pesa prompt issued — the working path |
| `GET /v1/users/{id}` with the API key as `{id}` | 500, empty body — the key is not a user id either |
| `POST /v1/deposits` with `userId` = the API key | 500 — the bearer token does not act as the account owner's id |

## How a platform-wallet transaction is identified (API v1.28.0)

**There is no holder id to look up, and none is needed.** The partner treasury
is tied to the API key. What every platform-wallet transaction carries instead
is `endUser` — *our* stable customer id — which is how nTZS meets regulatory
traceability and how it hands the same reference back so we can match webhooks.

| Call | What it carries |
| --- | --- |
| `POST /v1/deposits` | `endUser: { reference, name?, phone? }`; **no** `userId` |
| `POST /v1/withdrawals/quote` | `fromTreasury: true` (or a `userId`); no `endUser` needed |
| `POST /v1/withdrawals` | `fromTreasury: true` **and** `endUser.reference` |
| `POST /v1/spend/quote` | `fromTreasury: true` (or a `userId`); no `endUser` needed |
| `POST /v1/spend` | `fromTreasury: true` **and** `endUser.reference` |

`endUser.reference` must be 1–128 characters and stable — we use our customer id.
`validate.toEndUser()` enforces both and refuses locally, so a transaction never
leaves the process untraceable.

`NTZS_COLLECTION_USER_ID` and `NTZS_FUNDING_USER_ID` remain supported only as
optional overrides for a deployment that insists on naming a holder. Leave both
empty on this account.

### What that 400 was

`POST /v1/deposits` without `endUser` answers `400 "userId and amountTzs are
required"`. That sentence is a **static** list of what this endpoint has
historically required — the same words come back for a missing amount, a string
amount, or a missing phone number — and it is emitted whether or not an amount
was actually sent. Adding `endUser` returns 201 with
`collectToTreasury: true`. Nothing was wrong with the amounts this integration
sent.

## Verified live on this account

| Capability | Result |
| --- | --- |
| collections | **201** — `POST /v1/deposits` with `endUser` creates a real deposit, `collectToTreasury: true`, M-Pesa prompt issued |
| disbursements | **200** — `/withdrawals/quote` prices with `fromTreasury: true`, phone and bank destinations |
| bills / spend | **200** — `/spend/quote` prices with `fromTreasury: true` (`kind: lipa`); `kind: bill` also needs `utilityRef` |
| treasury | local ledger over the API key's platform wallet; no public treasury API exists (nine candidate paths all 404) |
| ramp | **200** both directions |
| swap | reachable |

A quote returning `quoteId: null` is the documented "insufficient balance"
answer, not an error: it means the treasury float has nothing in it yet.

**Checkout, live:** `POST /api/payments/checkout` → 200, deposit
`add2ef59-…` created for 7,060 TZS with the M-Pesa prompt sent, stored locally
with a matching `provider_ref`, and readable back via `GET /v1/deposits/{id}`.

### Earlier probes, and why they all failed

These were tried before `endUser` was documented for this deployment, and all
were correctly rejected: `userId` set to a non-existent UUID → 404 `User not
found`; `userId` set to the provider's `contractAddress`, our settlement
address, our ramp settlement address, the USDC token address, or the API key →
500. None of them were ever a valid holder. `POST /v1/users` (which would mint
one) needs the `wallets` capability, which this account does not hold — and was
never needed.

## Rules the code enforces

1. **Whole shillings only.** `toTzsAmount` rejects decimals before the request
   leaves the process. Minimums: 500 TZS to collect, 5,000 TZS net to pay out.
2. **Quotes are never recomputed.** `quotePayout` / `quoteBill` return nTZS's fee
   verbatim. Execution without a quote is refused (`quote_required`); changed
   terms are `quote_mismatch`; a moved price is `quote_stale` → new quote, not a
   retry.
3. **Idempotency everywhere money moves.** Every endpoint stores the
   `Idempotency-Key` before the call, so a replay returns the original outcome.
   A bulk payout run seeds one key per item from the run key.
4. **Unknown outcomes are never auto-retried.** `initiation_uncertain`,
   `till_network_required` and transport failures come back as
   `retry: 'verify'`; the answer is to read the resource (`/sync`) first.
5. **Errors branch on `code ?? error`.** Identity/KYC paths invert the fields
   and 401s carry prose only, so the HTTP status is always kept.
6. **Lookups are fail-soft.** `name: null` means "no confirmation available" —
   show the raw number and continue.
7. **The treasury only moves on terminal success.** Collections credit on
   completion; payouts and bills hold funds while in flight, debit on success and
   release on failure or reversion. Every movement is keyed, so a duplicate
   webhook cannot double-count.

## Endpoints (`/api/ntzs`)

### Collections
```
POST /collections            { amountTzs, phoneNumber, paymentMethod? }   + Idempotency-Key
GET  /collections?status=&limit=
GET  /collections/:id
POST /collections/:id/sync   read back from the rail (the answer to 202/502)
```

### Lookups
```
POST /lookup/recipient-name  { phoneNumber }
POST /lookup/merchant-name   { kind, payNumber | utilityCode, amountTzs? }
POST /lookup/qr              { payload }
```

### Disbursements
```
POST /payouts/quote          { amountTzs, phoneNumber | bankCode + accountNumber }
POST /payouts                { quoteId, amountTzs, destination }           + Idempotency-Key
POST /payouts/bulk           { items: [...] }                             + Idempotency-Key
GET  /payouts?status=&limit=
GET  /payouts/:id
POST /payouts/:id/sync
```
Payout routes require a finance role (`superadmin`, `finance_admin`,
`marketplace_admin`).

### Bills
```
GET  /billers                cached catalogue (refresh=1 to bypass)
POST /bills/quote            { kind, amountTzs, payNumber | utilityCode, utilityRef? }
POST /bills                  { quoteId, network? }                         + Idempotency-Key
GET  /bills?status=&limit=
GET  /bills/:id
POST /bills/:id/sync
```
Persist `bill.reference` — it is what the biller recognises when the customer
queries the payment.

### Treasury
```
GET  /treasury               balances per account (balance / reserved / available)
GET  /treasury/ledger?accountId=&entryType=
POST /treasury/sub-wallets   { label, fundingSourceId?, openingBalanceTzs? }
GET  /treasury/supply        platform supply context (not a statement)
```

### Operations
```
GET  /config                 live vs test key, missing holder ids, webhook secret
POST /reconcile              read every in-flight movement back and settle it
POST /testmode/:action       state | advance | reset | approve (test keys only)
POST /webhooks/ntzs          inbound events, HMAC-SHA256 over `timestamp.body`
```

Checkout (`POST /api/payments/checkout`) uses the same treasury collection path.
A 502 `initiation_uncertain` there comes back as a **202** with
`retry: 'verify'` and the payment id — the client should poll
`GET /api/payments/:id/poll`, never resend the checkout.

## Web screens

| Route | Audience | What it does |
| --- | --- | --- |
| `/finance/ntzs` | finance / marketplace admin | the nTZS console: treasury balances and holds, configuration issues, collections, payouts (price → confirm fee → pay), bills, ledger, reconcile and sandbox controls |
| `/bills/pay` | any signed-in user | pay a utility bill or till: confirm the recipient, see the fee, pay, keep the reference |

The console shows `verify` outcomes in an amber banner with a "Read from rail"
action instead of a retry button, and renders an unconfirmed recipient as
*not confirmed* rather than blocking the payment.

## Building and testing against the sandbox

A test key simulates the whole lifecycle with no money and no chain:

```bash
# 1. collect
curl -X POST localhost:3000/api/ntzs/collections \
  -H "Authorization: Bearer $JWT" -H 'Content-Type: application/json' \
  -H "X-CSRF-Token: $CSRF" -H 'Idempotency-Key: demo-1' \
  -d '{"amountTzs":5000,"phoneNumber":"0712345678"}'

# 2. settle everything pending, no waiting on a rail
curl -X POST localhost:3000/api/ntzs/testmode/advance -H "Authorization: Bearer $JWT"

# 3. read the webhook, or read the record back
curl -X POST localhost:3000/api/ntzs/collections/1/sync -H "Authorization: Bearer $JWT"

# 4. price a payout, then execute it against that quote
curl -X POST localhost:3000/api/ntzs/payouts/quote -H "Authorization: Bearer $JWT" \
  -H 'Content-Type: application/json' -d '{"amountTzs":20000,"phoneNumber":"0712345678"}'

curl -X POST localhost:3000/api/ntzs/payouts \
  -H "Authorization: Bearer $JWT" -H "X-CSRF-Token: $CSRF" -H 'Idempotency-Key: payout-1' \
  -d '{"quoteId":"<quoteId>","amountTzs":20000,"phoneNumber":"0712345678"}'
```

Reset with `POST /api/ntzs/testmode/reset`. A NIDA ending `0000` forces a manual
KYC review upstream; this integration does not issue wallets, so that branch is
only relevant if you also hold `wallets`.

## Tests

```bash
cd backend-node
npx vitest run test/ntzsClient.test.js test/ntzsPayments.test.js test/ntzsConfig.test.js
```

`test/helpers/fakePool.js` is a small in-memory MySQL stand-in that models the
queries these services issue, so the full lifecycle — including duplicate
webhooks, reverted payouts and ledger idempotency — runs without a database.
`test/ntzsConfig.test.js` covers the boot-time configuration guard, which is what
stops a live key reaching development unnoticed.