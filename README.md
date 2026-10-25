# SaaS CostGuard

> **FlyRank Backend Track Capstone — Your 10x Solution**  
> **Author:** Mohamed Ahmed  
> **Submission Document:** [`My 10x Solution - Mohamed Ahmed.md`](./My%2010x%20Solution%20-%20Mohamed%20Ahmed.md)  
> **Stack:** TypeScript, Node.js, Express, SQLite (`better-sqlite3`), PDFKit, Vitest, Zod  
> **Cost:** $0 stack, 100% free-tier and local, zero external paid dependencies.

---

## 1. What Problem Does It Solve?

Engineering teams deploying LLM-powered features and cloud microservices frequently face catastrophic billing surprises caused by rogue prompt loops, unmonitored traffic spikes, and un-cached repetitive queries. Because existing telemetry is scattered across fragmented vendor dashboards that update with multi-hour delays, developers only discover cost blowouts when the monthly credit card invoice arrives. Manually querying raw server logs to attribute runaway expenses to specific tenants, endpoints, or developers is agonizingly slow, leaving infrastructure vulnerable to uncontained financial drain.

### The 10x Claim
**SaaS CostGuard transforms LLM and API cost management from a days-long, retroactive forensic post-mortem into a real-time, 15-second automated defense system.**
- **Before (1x):** Developers spend 4–8 hours auditing vendor invoices, cross-referencing logs, and manually writing incident summaries.
- **After (10x):** Ingestion occurs sub-millisecond, real-time token tracking flags runaway loops within 60 seconds, scheduled background anomaly detection triggers instant alerts, and one-click executive PDF financial reports detail tenant spend and AI prompt optimization suggestions instantly.

### Scope Guard & Explicit Non-Goals
* **No Live Payment Processing:** We do not handle credit card billing or Stripe checkouts. SaaS CostGuard is strictly an observability, metering, anomaly alerting, and financial reporting engine.
* **No Bloated Frontend SPA:** No complex React frontend to maintain; includes a clean REST API and automated PDF report generation.
* **No Paid Cloud Infrastructure:** Everything runs with 100% zero-cost dependencies locally (Node.js, SQLite WAL mode, in-memory caching and worker queues).

---

## 2. Program Concepts Implemented (7 of 7)

SaaS CostGuard implements **all 7 core concepts** from the program specification (0 swaps required):

| # | Program Concept | Implementation in SaaS CostGuard | Code Location |
|---|---|---|---|
| **1** | **API Endpoints** | REST HTTP API with input validation (Zod), structured responses, and HTTP status codes (`200`, `201`, `400`, `401`, `404`, `429`, `500`). | [`src/routes/`](./src/routes/), [`src/middleware/validation.ts`](./src/middleware/validation.ts) |
| **2** | **Database** | Persistent relational storage with SQLite via `better-sqlite3` in WAL mode, foreign keys, schema migrations, and indexing. | [`src/db/database.ts`](./src/db/database.ts) |
| **3** | **Authentication** | Multi-tenant JWT auth with bcrypt password hashing + SHA-256 hashed API keys (`x-api-key`) with revocation. | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/middleware/auth.middleware.ts`](./src/middleware/auth.middleware.ts) |
| **4** | **Background Jobs / Cron** | `node-cron` scheduled sweeps + async in-memory worker queue running anomaly detection off the HTTP request path. | [`src/jobs/cron.ts`](./src/jobs/cron.ts), [`src/jobs/worker.ts`](./src/jobs/worker.ts), [`src/services/anomaly.service.ts`](./src/services/anomaly.service.ts) |
| **5** | **Reporting (PDF)** | High-fidelity executive financial PDF report generator displaying KPI cards, model cost tables, and anomaly logs. | [`src/services/report.service.ts`](./src/services/report.service.ts), [`src/routes/reports.routes.ts`](./src/routes/reports.routes.ts) |
| **6** | **Caching Logic** | In-memory TTL cache (60s) for expensive 24h spending aggregations with automated cache invalidation on new writes. | [`src/services/cache.service.ts`](./src/services/cache.service.ts), [`src/services/analytics.service.ts`](./src/services/analytics.service.ts) |
| **7** | **LLM Integration** | "AI Cost Advisor" endpoint analyzing prompt spend patterns to recommend caching/compression, with full token/cost logging. | [`src/services/llm.service.ts`](./src/services/llm.service.ts), [`src/routes/advisor.routes.ts`](./src/routes/advisor.routes.ts) |

---

## 3. Quickstart (Clean Machine Setup)

### Prerequisites
- Node.js >= 20.0
- npm >= 10.0

### Setup in 2 Commands
```bash
# 1. Install dependencies
npm install

# 2. Seed database with demo tenants, API keys, and 35+ realistic telemetry events
npm run seed
```

### Run Tests (Deterministic Vitest Suite)
```bash
npm test
```
*Runs 25 automated tests across 6 suites covering every concept in ~2 seconds.*

### Start Server
```bash
npm run dev
# Server boots at: http://localhost:4000
```

---

## 4. The 5-Minute Demo Path

Follow these steps to experience every program concept running end-to-end:

### Step 1: Check System Health (Database & Server)
```bash
curl -X GET http://localhost:4000/health
```
**Expected Response:** `200 OK` with `status: "ok"` and `database: "connected"`.

---

### Step 2: Authenticate (Login & Obtain JWT)
```bash
curl -X POST http://localhost:4000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@acme.com","password":"Password123!"}'
```
**Expected Response:** `200 OK` with a signed JWT Bearer `token` and tenant profile (`Acme AI Platform`).

---

### Step 3: Ingest High-Speed Telemetry using API Key
Use the seeded API key to record an LLM call:
```bash
curl -X POST http://localhost:4000/api/v1/telemetry \
  -H "Content-Type: application/json" \
  -H "x-api-key: cg_live_04183de085997f51065ad802ecf147f2f947ada0eb0a026a" \
  -d '{
    "provider": "anthropic",
    "model": "claude-3-5-sonnet",
    "prompt_tokens": 4500,
    "completion_tokens": 1200,
    "endpoint": "/v1/messages",
    "latency_ms": 780
  }'
```
**Expected Response:** `201 Created` with automatically calculated cost: `$0.0315` USD and `total_tokens: 5700`.

---

### Step 4: Verify Caching Logic on Spending Summary
Query the analytical summary endpoint:
```bash
# Call 1: Cache MISS (calculates from database)
curl -i -X GET http://localhost:4000/api/v1/analytics/summary

# Call 2: Immediate Cache HIT (served from in-memory cache)
curl -i -X GET http://localhost:4000/api/v1/analytics/summary
```
**Observe:** Header `X-Cache: HIT` and field `"from_cache": true`. Latency drops to sub-millisecond.

---

### Step 5: Inspect Detected Anomalies
```bash
curl -X GET http://localhost:4000/api/v1/anomalies
```
**Observe:** Shows detected `SPIKE_COST` (single expensive request) and `RUNAWAY_LOOP` (rapid loop alert) generated by the background detection engine.

---

### Step 6: Download Executive Financial Spend PDF Report
Open your browser or run:
```bash
curl -X GET http://localhost:4000/api/v1/reports/pdf --output spend_report.pdf
```
**Observe:** Open `spend_report.pdf` in your PDF viewer. It displays KPI cards, model cost distribution table, and anomaly alerts.

---

### Step 7: Run the AI Cost Advisor (LLM Integration with Cost Logging)
```bash
curl -X POST http://localhost:4000/api/v1/advisor/optimize \
  -H "Content-Type: application/json" \
  -d '{}'
```
**Observe:** Returns validated structured JSON with model substitution advice (e.g. `gpt-4o` -> `gpt-4o-mini`), prompt compression tips, and token usage. Automatically logs its own advisory execution cost into the database audit trail!

---

## 5. Project Architecture

```
├── .env.example                      # Documented environment configuration
├── .gitignore                        # Masking secrets, *.db, and *.pdf
├── My 10x Solution - Mohamed Ahmed.md# FlyRank Capstone Overview Document
├── package.json                      # Scripts & dependencies
├── README.md                         # Documentation & 5-minute demo path
├── tsconfig.json                     # TypeScript strict configuration
├── src/
│   ├── app.ts                        # Express application setup
│   ├── index.ts                      # Server entry point & graceful shutdown
│   ├── config/                       # Environment configuration
│   ├── db/
│   │   └── database.ts               # SQLite WAL connection & migrations
│   ├── jobs/
│   │   ├── cron.ts                   # node-cron scheduled background tasks
│   │   └── worker.ts                 # Async in-memory worker queue
│   ├── middleware/
│   │   ├── auth.middleware.ts        # JWT and API Key authentication guards
│   │   └── validation.ts             # Zod payload schema validation
│   ├── repositories/
│   │   ├── apiKey.repository.ts      # API Key persistence & revocation
│   │   ├── telemetry.repository.ts   # High-throughput usage queries & inserts
│   │   ├── tenant.repository.ts      # Tenant organization persistence
│   │   └── user.repository.ts        # User credentials repository
│   ├── routes/
│   │   ├── advisor.routes.ts         # Narrow LLM advisory endpoint
│   │   ├── analytics.routes.ts       # Cached aggregation endpoints
│   │   ├── auth.routes.ts            # Registration, login, and API key routes
│   │   ├── health.routes.ts          # System & database health probe
│   │   ├── jobs.routes.ts            # Background job enqueuing & anomaly list
│   │   ├── reports.routes.ts         # PDF generation and preview routes
│   │   └── telemetry.routes.ts       # Telemetry ingestion endpoint
│   ├── scripts/
│   │   ├── seed.ts                   # Realistic database seeder
│   │   └── verify_skeleton.ts        # End-to-end verification script
│   ├── services/
│   │   ├── analytics.service.ts      # Spending aggregation engine
│   │   ├── anomaly.service.ts        # Spike & runaway loop detection
│   │   ├── auth.service.ts           # JWT, bcrypt & SHA-256 key hashing
│   │   ├── cache.service.ts          # In-memory TTL cache with stats
│   │   ├── llm.service.ts            # AI advisor with cost audit logging
│   │   ├── pricing.service.ts        # Per-token pricing calculator
│   │   └── report.service.ts         # PDFKit visual report builder
│   └── types/
│       └── index.ts                  # Shared TypeScript interfaces
└── tests/
    ├── advisor.test.ts               # Concept 7 tests (LLM & Cost Log)
    ├── auth.test.ts                  # Concept 3 tests (JWT & API Keys)
    ├── caching.test.ts               # Concept 6 tests (TTL & Invalidation)
    ├── jobs.test.ts                  # Concept 4 tests (Worker & Anomalies)
    ├── reporting.test.ts             # Concept 5 tests (PDF Report)
    └── walking_skeleton.test.ts      # Milestone 2 tests (End-to-End slice)
```

---

## 6. License
MIT License. Built for FlyRank Internship Backend Track Capstone.
