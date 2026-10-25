# SaaS CostGuard

> **FlyRank Backend Track Capstone — Your 10x Solution**  
> **Author:** Mohamed Ahmed  
> **Submission Document:** [`My 10x Solution - Mohamed Ahmed.md`](./My%2010x%20Solution%20-%20Mohamed%20Ahmed.md)

---

## 1. What is SaaS CostGuard?
**SaaS CostGuard** is an automated LLM and API token metering, anomaly detection, and financial reporting engine designed for multi-tenant software teams.

* **Problem (3 Sentences):** Engineering teams deploying LLM-powered features and cloud microservices frequently face catastrophic billing surprises caused by rogue prompt loops, unmonitored traffic spikes, and un-cached repetitive queries. Because existing telemetry is scattered across fragmented vendor dashboards that update with multi-hour delays, developers only discover cost blowouts when the monthly credit card invoice arrives. Manually querying raw server logs to attribute runaway expenses to specific tenants, endpoints, or developers is agonizingly slow, leaving infrastructure vulnerable to uncontained financial drain.
* **10x Claim:** Turns cost management and billing post-mortems from a 4-hour manual forensic investigation into an automated, sub-minute real-time protection system.
* **Non-Goal:** No live payment processing (no Stripe/credit cards). Pure usage metering, anomaly alerting, and financial reporting.

---

## 2. Program Concepts Implemented (7 of 7)

| # | Concept | Implementation | Code Location |
|---|---|---|---|
| 1 | **API Endpoints** | REST API with Zod validation, HTTP status codes (`200`, `201`, `400`, `404`, `500`) | `src/routes/` |
| 2 | **Database** | Persistent SQLite (`better-sqlite3`) with WAL mode, schema indexes, foreign keys | `src/db/` |
| 3 | **Authentication** | Dual auth: JWT Bearer tokens + hashed API keys (`x-api-key`) | `src/middleware/auth.ts` |
| 4 | **Background / Cron Jobs** | `node-cron` anomaly detection + asynchronous queue | `src/jobs/` |
| 5 | **Reporting (PDF)** | Downloadable executive financial PDF reports | `src/services/report.service.ts` |
| 6 | **Caching Logic** | In-memory TTL cache for 24h spend metrics | `src/services/cache.service.ts` |
| 7 | **LLM Integration** | "AI Cost Advisor" endpoint analyzing prompt spend with cost/token logging | `src/services/llm.service.ts` |

---

## 3. Quickstart & Verification

### Prerequisites
- Node.js >= 20.0
- npm >= 10.0

### Installation
```bash
npm install
```

### Run Tests (Deterministic Vitest Suite)
```bash
npm test
```

### Run the Walking Skeleton Verification Script
```bash
npx tsx src/scripts/verify_skeleton.ts
```

### Start Development Server
```bash
npm run dev
```
The server will run on `http://localhost:4000`.
- Health check: `GET http://localhost:4000/health`
- Ingest telemetry: `POST http://localhost:4000/api/v1/telemetry`
