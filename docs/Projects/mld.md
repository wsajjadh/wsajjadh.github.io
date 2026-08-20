# My Local Depositor — FX Deposit & Payout Gateway

**A production payments platform for the Sri Lankan corridor: live FX quoting, rate-locked orders, an append-only money ledger, manual reconciliation, and signed merchant webhooks.**

| | |
|---|---|
| **Type** | Full-stack financial web platform (production) |
| **Role** | Sole architect & engineer — product shaping, architecture, backend, frontend, tests, deployment |
| **Duration** | Jun 2026 – present (actively maintained) |
| **Stack** | PHP 8.4 · Laravel 13 · PostgreSQL · Redis/Horizon · Inertia v3 + React 19 · TypeScript · Tailwind v4 · Blade · Docker |

---

## The problem

Merchants selling into Sri Lanka need to collect payments from local customers who pay in **LKR by bank transfer**, and settle in **USD**. Card and wallet rails either don't reach these customers or price them out. The existing process was manual and error-prone: rates quoted over chat, bank slips emailed around, balances tracked in spreadsheets, and no reliable way for a merchant's own system to learn that a payment had landed.

The platform turns that into a product:

1. A merchant's system calls an API to create an order at a **locked FX rate**.
2. The customer lands on a hosted, trilingual checkout, sees exactly what to transfer and to which reference, pays from their bank app, and uploads the slip.
3. An operator reconciles the incoming bank credit against the order.
4. Confirmation posts money to an **immutable ledger**, and a **signed webhook** tells the merchant's system the payment is confirmed.
5. Merchants and referral partners draw their balances down through self-service payout requests.

## What I built

Four distinct surfaces over one domain, each with its own auth model:

- **Public REST API** (`/v1/*`) — API-key authenticated, HMAC request signing, idempotent order creation, versioned, documented with an OpenAPI spec.
- **Customer checkout** — server-rendered Blade, deliberately *not* React: perf-budgeted for low-end Android on 4G, reload-safe, and trilingual (English / Sinhala / Tamil) with per-script `lang` attributes and conditionally-loaded Noto fonts.
- **Operator back office** — Inertia + React panel for reconciliation, merchant management, rate control, settlements, payout queues, branding and audit.
- **Merchant & partner portals** — self-service order history, balances, API key issuance, withdrawals, and notification preferences, hard-isolated to their own data.

---

## Architecture

### Domain-driven Laravel, not fat controllers

Business logic lives in `app/Domain/{Ledger,Orders,Rates,Reconciliation,Webhooks,Payouts,Partners,Notifications,…}` as **final, single-purpose invokable action classes**. Controllers validate, call one action, and return a Resource or an Inertia response. Sixteen domain namespaces, each owning one concern.

### Single-writer invariants

The most important design decision in the system: for every piece of state that money depends on, exactly **one** class is allowed to write it, and everything else must route through it.

| State | Sole writer | Guarantee |
|---|---|---|
| `ledger_entries` | `PostLedgerTransaction` | Every money movement is journaled identically |
| `transactions.status` | `TransactionStateMachine` | Illegal transitions throw, they don't silently corrupt |
| `audit_logs` | `RecordAuditLog` | Every operator decision is recorded and secrets are redacted |
| Notification preferences | `ShouldSendNotification` / `UpdateNotificationPreferences` | No job can quietly bypass a merchant's opt-out |

These aren't conventions in a README — they're enforced in the models, the database, and the test suite.

### The ledger is append-only, and balances are derived

```php
// app/Domain/Ledger/PostLedgerTransaction.php — the SOLE writer to the journal
final class PostLedgerTransaction
{
    public function __invoke(TransactionType $type, Money $amount, array $context = []): LedgerEntry
    {
        if (! $amount->isPositive()) {
            throw new \InvalidArgumentException('Pass a positive Money value.');
        }

        $storedAmount = $amount->getAmount()->toScale(4, RoundingMode::HALF_UP)->__toString();
        // ...
    }
}
```

`LedgerEntry` has `$timestamps = false` and throws a `DomainException` on update or delete; the database guards it independently. **A mistake is corrected by posting a `Reversal` or `Adjustment` row, never by editing history.** There is no cached `balance` column anywhere in the schema — every balance and cash position is a `SUM` query. That's slower on paper and completely non-negotiable in practice: a counter column is a number that can silently disagree with the journal.

### Money never touches a float

All amounts are `NUMERIC(20,4)` in Postgres, carried in PHP as `Brick\Money\Money` or as decimal strings, with explicit `RoundingMode::HALF_UP`. Money crosses the wire as a **string** (`"12500.0000"`) always paired with a currency code, and is never re-parsed into a JavaScript `Number`. The same discipline extends to the LKR→USD derivation on withdrawals, where rounding direction is a spec'd, tested decision rather than an accident of the last cast.

### Atomic confirmation

Confirming a payment is the moment the system is most exposed to double-spend and partial-write bugs. It runs inside a single `DB::transaction()` with `lockForUpdate()` on the order; a double-confirm is a status-guarded no-op; ledger posting happens inside the lock. Webhooks and emails are dispatched **after commit** — never inside the transaction, so a worker can never observe data that hasn't durably landed.

### Three guards, zero shared controllers

Operators (`admin_users`), merchant/partner users (`merchant_users`), and customers (no auth at all — addressed by an unguessable `checkout_token`) get separate route files, separate controller namespaces, and separate middleware. Merchant data isolation is enforced by a `MerchantOwnedScope` global scope that activates only under the merchant guard, with policies double-guarding explicit access. The `checkout_token` is treated as a bearer credential: `$hidden` on the model, never returned by the API, never logged. Deposit slips live on a private S3 disk and are only reachable through short-lived signed URLs.

### Integration hardening

- **Idempotency** — `POST /v1/orders` requires an `Idempotency-Key`; keys are persisted per merchant and replays return the original order rather than a second charge.
- **HMAC request signing** — inbound API calls are signature-verified (`VerifyRequestSignature`), shipped through a dual-accept compatibility window and then a hard enforcement cutover, so live merchants were never broken mid-flight.
- **Signed outbound webhooks** — HMAC-SHA256 with logged delivery attempts, backoff retries, operator resend, and merchant-side dedupe support.
- **Locked contracts** — every enum is integer-backed with a frozen int↔case map and a canonical string `label()`. Public API and webhook JSON emit the label. Status strings and webhook event names are versioned contracts; a test fails the build if a new notification job appears without a catalogue entry.

---

## Engineering practice

**Testing is the deliverable, not the afterthought.** 1,460 test cases across 155 PHPUnit files — roughly **30k lines of tests against 26k lines of application PHP**. Feature tests are the default, organised by surface (`tests/Feature/{Api,Portal,BackOffice,Checkout,Ledger,…}`), using factories with money as strings.

**A single `composer ci:check`** runs ESLint, Prettier, PHPStan/Larastan level checks, Pint formatting and the full PHPUnit suite. Nothing merges that hasn't passed it.

**Production migration discipline** — the app is live, so migrations are strictly additive. Existing migration files are never edited; schema changes ship as new migrations.

**Spec-driven delivery** — the work was planned as a PRD → architecture → epics → stories pipeline, with each story implemented, adversarially code-reviewed, and only then marked done. 22 epics and 128 implemented stories are checked into the repo alongside the code, so every decision has a written rationale next to the commit that made it.

**AI-assisted, human-owned** — the project was built with an agentic development workflow (BMAD method + Claude Code), with a maintained `project-context.md` encoding the non-obvious invariants — the single-writer rules, the money rules, the locked enum contracts — so that automated contributions couldn't violate them. The interesting engineering wasn't the code generation; it was designing constraints strong enough that a fast contributor can't break financial correctness.

---

## By the numbers

| | |
|---|---|
| Commits | 380 |
| Application PHP | ~26,000 lines |
| Frontend TypeScript/React | ~32,000 lines |
| Test code | ~30,000 lines · 155 files · **1,460 test cases** |
| Domain namespaces | 16 |
| Eloquent models | 27 |
| Integer-backed enum contracts | 23 |
| Queued jobs (webhooks, expiry, rate feed, mail) | 21 |
| Migrations | 38 |
| Epics / stories delivered | 22 / 128 |
| Languages supported at checkout | 3 (EN / SI / TA) |

---

## Selected problems worth solving

**Rate freshness without a per-request API call.** Quoting can't depend on an external FX call in the request path. A scheduled job refreshes a cached base rate from a primary bank feed with a third-party fallback, staleness is surfaced to operators, and manual override exists for the case where both feeds fail. Every order snapshots the rate it was created at, so the quote a customer sees is the quote they get, for the full one-hour lock.

**"Transaction" meant three different things.** The codebase inherited a naming collision: the order aggregate, the money journal, and the database transaction. Rather than a risky rename mid-production, the domain vocabulary was documented explicitly, the journal was extracted into a distinct `LedgerEntry` model, and the ambiguity was pinned down in the context file every contributor reads first. Knowing when *not* to refactor is part of the job.

**Notification preferences that can't be bypassed.** The naive implementation gates mail at the dispatch site. That's subtly broken: skipping the dispatch leaves the job's `*_sent_at` guard null, so a stale email fires later on a retry or the moment the user re-enables the toggle. The gate lives *inside* the job — it logs a warning, stamps the guard, and returns. Account and security mail (invites, password resets, email-change verification) is deliberately non-suppressible.

**Partner commissions on an immutable ledger.** Referral partners earn a commission on both deposits and withdrawals. With no mutable balance column to increment, accrual is a hook that posts commission rows into the same journal, and partner wallets are derived by the same `SUM` machinery as merchant balances — one source of truth, three audiences.

---

## Deployment

Dockerised (multi-stage build, separate dev/prod compose files), running PostgreSQL with point-in-time recovery, Redis-backed Horizon workers for webhooks, expiry sweeps, rate refresh and transactional mail, and a scheduler for the FX feed. Hosted near the Sri Lankan market for latency. Structured logging with Sentry for error tracking.

---

## What I'd highlight

This project is a study in **making financial correctness structural rather than aspirational**. Anyone can write a payments feature that works on the happy path. The interesting work was building a system where the wrong thing is hard to do: where a balance can't drift from its journal because the balance doesn't exist as stored state; where an order can't skip a status because the state machine owns the only door; where a suppressed email can't resurrect itself three retries later; and where a 1,460-case suite makes each of those claims a fact rather than an intention.

---

*Screenshots, architecture diagrams and a live walkthrough available on request.*
