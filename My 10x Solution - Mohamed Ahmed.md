# My 10x Solution - Mohamed Ahmed

**Project Name:** SaaS CostGuard (LLM & API Token Metering, Anomaly Detection & Financial Reporting Engine)  
**Author:** Mohamed Ahmed  
**Track:** FlyRank Internship · Backend Track Capstone  
**Target Repository:** Public GitHub Repository  

---

## 1. What is the problem you are solving?
Engineering teams deploying LLM-powered features and cloud microservices frequently face catastrophic billing surprises caused by rogue prompt loops, unmonitored traffic spikes, and un-cached repetitive queries. Because existing telemetry is scattered across fragmented vendor dashboards that update with multi-hour delays, developers only discover cost blowouts when the monthly credit card invoice arrives. Manually querying raw server logs to attribute runaway expenses to specific tenants, endpoints, or developers is agonizingly slow, leaving infrastructure vulnerable to uncontained financial drain.

### Who has this problem?
1. **Backend & Fullstack Engineers** integrating AI models (OpenAI, Anthropic, Gemini, Groq) who need granular, per-request cost attribution without building bespoke monitoring from scratch.
2. **Engineering Leads & CTOs** at fast-growing startups who need hard budget limits, sudden spend-spike alerts, and executive financial summaries without paying for bloated enterprise SaaS tools.
3. **Multi-tenant SaaS Platforms** needing accurate per-customer usage metering to prevent free-tier abuse and charge customers fairly based on consumed tokens and API calls.

### The 10x Claim
> **SaaS CostGuard transforms LLM and API cost management from a days-long, retroactive forensic post-mortem into a real-time, 15-second automated defense system.**

* **Before (1x):** Developers spend 4–8 hours auditing vendor invoices, cross-referencing logs, and manually writing incident summaries.
* **After (10x):** Ingestion occurs sub-millisecond, real-time token tracking flags runaway loops within 60 seconds, scheduled background anomaly detection triggers instant alerts, and one-click executive PDF financial reports detail tenant spend and AI prompt optimization suggestions instantly.

---

## 2. How did you implement your solution?

### System Overview & Architecture in Plain Words
SaaS CostGuard is built as a modular, lightweight Node.js/TypeScript backend running on an entirely free, local-first stack with zero credit cards or paid cloud dependencies:
1. **High-Speed Ingestion Pipeline:** Whenever an application executes an LLM prompt or API call, it sends a payload to `POST /api/v1/telemetry` authenticated with a tenant API key (`x-api-key`). The pricing service calculates exact per-token costs across models (OpenAI, Anthropic, Gemini, Groq) and commits the record to SQLite in Write-Ahead-Logging (WAL) mode.
2. **In-Memory Caching:** Heavy analytical aggregations (computing 24-hour spend, token breakdown by model, and budget utilization) are cached in memory with a 60-second TTL. The cache is automatically invalidated whenever fresh telemetry arrives for that tenant, ensuring sub-millisecond dashboard queries without stale data.
3. **Background Worker & Cron Anomaly Detection:** An automated scheduler (`node-cron`) coupled with an async in-memory worker queue continuously sweeps telemetry data to detect single-request cost spikes ($0.50+), runaway retry loops (10+ requests in 60s), and budget threshold overruns, inserting incident records into the `anomalies` table.
4. **Executive PDF Financial Reporting:** Using PDFKit, the system renders downloadable, print-ready PDF financial reports complete with KPI cards, model cost distribution tables, and detected anomaly logs.
5. **Narrow AI Job (AI Cost Advisor):** Behind `POST /api/v1/advisor/optimize`, an AI engine evaluates the tenant's highest-cost models and prompt patterns, returning structured advice (model right-sizing, prompt compression, and caching strategies) while logging its own token consumption and cost back to the database.

---

### Program Concepts Implemented (7 of 7)

SaaS CostGuard implements **all 7 core concepts** from the program specification (0 swaps needed):

| # | Program Concept | Implementation in SaaS CostGuard | Code Location |
|---|---|---|---|
| **1** | **API Endpoints** | REST API with Zod validation, HTTP status codes (`200`, `201`, `400`, `401`, `404`, `500`), and structured JSON error responses. | [`src/routes/`](./src/routes/), [`src/middleware/validation.ts`](./src/middleware/validation.ts) |
| **2** | **Database** | Persistent relational storage using SQLite via `better-sqlite3` in WAL mode, foreign keys, schema migrations, and indexing. | [`src/db/database.ts`](./src/db/database.ts) |
| **3** | **Authentication** | Multi-tenant JWT auth with bcrypt password hashing + SHA-256 hashed API keys (`x-api-key`) with revocation. | [`src/services/auth.service.ts`](./src/services/auth.service.ts), [`src/middleware/auth.middleware.ts`](./src/middleware/auth.middleware.ts) |
| **4** | **Background Jobs / Cron** | `node-cron` scheduled sweeps + async in-memory worker queue running anomaly detection off the HTTP request path. | [`src/jobs/cron.ts`](./src/jobs/cron.ts), [`src/jobs/worker.ts`](./src/jobs/worker.ts), [`src/services/anomaly.service.ts`](./src/services/anomaly.service.ts) |
| **5** | **Reporting (PDF)** | High-fidelity executive financial PDF report generator displaying KPI cards, model cost tables, and anomaly logs. | [`src/services/report.service.ts`](./src/services/report.service.ts), [`src/routes/reports.routes.ts`](./src/routes/reports.routes.ts) |
| **6** | **Caching Logic** | In-memory TTL cache (60s) for expensive 24h spending aggregations with automated cache invalidation on new writes. | [`src/services/cache.service.ts`](./src/services/cache.service.ts), [`src/services/analytics.service.ts`](./src/services/analytics.service.ts) |
| **7** | **LLM Integration** | "AI Cost Advisor" endpoint analyzing prompt spend patterns to recommend caching/compression, with full token/cost logging. | [`src/services/llm.service.ts`](./src/services/llm.service.ts), [`src/routes/advisor.routes.ts`](./src/routes/advisor.routes.ts) |

*Note on Swaps:* **0 swaps used.** All 7 original program concepts are implemented natively.

---

### Scope Guard & Explicit Non-Goals
* **NO Live Payment Processing:** We will not integrate Stripe/credit card checkout. SaaS CostGuard is strictly an observability, metering, anomaly alerting, and financial reporting platform.
* **NO Complex Frontend SPA:** No heavy React/Angular UI; includes a clean REST API, seed CLI, and automated PDF export.
* **NO Paid Cloud Infrastructure:** Everything runs with 100% zero-cost dependencies locally (Node.js, SQLite, in-memory caching/queues).

---

### Steps to Run the Project (On Any Clean Machine)

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Seed database with demo tenants, users, API keys, and 35+ realistic telemetry events
npm run seed

# 3. Run full automated test suite (25 deterministic tests across 6 suites)
npm test

# 4. Start the server
npm run dev
# The server is live at http://localhost:4000
```

### 5-Minute Verification Walkthrough
1. **Health Check:** `curl http://localhost:4000/health` $\rightarrow$ verifies server and SQLite database connection.
2. **Login:** `POST /api/v1/auth/login` with `{"email":"admin@acme.com","password":"Password123!"}` $\rightarrow$ returns JWT Bearer token.
3. **Ingest Telemetry:** `POST /api/v1/telemetry` with header `x-api-key: <seeded_key>` $\rightarrow$ returns 201 Created with exact per-token dollar cost.
4. **Test Caching:** Call `GET /api/v1/analytics/summary` twice $\rightarrow$ first call returns `X-Cache: MISS`, second call returns `X-Cache: HIT` with sub-millisecond latency.
5. **Inspect Anomalies:** `GET /api/v1/anomalies` $\rightarrow$ shows detected cost spikes and runaway loops.
6. **Download PDF Report:** `GET /api/v1/reports/pdf` $\rightarrow$ generates and streams print-ready financial spend PDF.
7. **AI Cost Advisor:** `POST /api/v1/advisor/optimize` $\rightarrow$ returns structured model right-sizing and caching advice, and logs its own token cost into the database audit trail.
