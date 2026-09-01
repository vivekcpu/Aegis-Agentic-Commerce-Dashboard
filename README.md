# 🛡️ Aegis — AI Growth & Agentic Commerce

> **Security-first infrastructure for autonomous AI-to-business commerce.**

Aegis is an **agentic commerce platform** that enables autonomous AI buyers to discover products, evaluate offers, and initiate purchases while giving merchants complete control over **inventory, pricing, spending, payment verification, agent trust, accounting, and transaction auditing**.

Traditional e-commerce is designed around a human sitting behind a browser.

Aegis is designed for a world where the buyer itself can be an AI agent.

```text
Traditional Commerce

Human → Website → Cart → Checkout → Payment


Agentic Commerce

AI Agent → Intent → Discovery → Authorization → Payment → Settlement
```

Aegis provides the infrastructure required to make the second workflow safe.

---

# 🚀 What is Aegis?

Aegis separates **AI decision-making** from **transactional authority**.

An AI agent can say:

> "I want to purchase 10 units of this product."

But the AI agent does **not** get direct authority to:

* Modify inventory
* Decide the final price
* Confirm payment
* Bypass spending limits
* Write financial records
* Approve itself as a trusted buyer

Instead, every transaction passes through the Aegis backend, which acts as the **authoritative transaction engine**.

```text
                    AI AGENT
                       │
                       │ Intent
                       ▼
                ┌──────────────┐
                │  AI SERVICE  │
                │              │
                │ Discovery    │
                │ LangGraph    │
                │ Geo/Tax      │
                └──────┬───────┘
                       │
                       │ Purchase Request
                       ▼
              ┌───────────────────┐
              │  AEGIS BACKEND    │
              │                   │
              │ Guardrails        │
              │ Trust             │
              │ Inventory         │
              │ Idempotency       │
              │ Payments          │
              │ Ledger            │
              │ Audit             │
              └─────────┬─────────┘
                        │
             ┌──────────┼──────────┐
             ▼          ▼          ▼
        PostgreSQL   Razorpay   Merchant UI
```

---

# 🎯 Core Idea

The central idea behind Aegis is:

> **Let AI make decisions, but never let AI become the final authority over money or inventory.**

This creates a clear separation of responsibilities:

| Component  | Responsibility                       |
| ---------- | ------------------------------------ |
| AI Agent   | Express purchase intent              |
| AI Service | Discovery and purchase orchestration |
| Backend    | Transactional authorization          |
| PostgreSQL | Persistent source of truth           |
| Razorpay   | Payment processing                   |
| Merchant   | Human oversight and trust decisions  |
| Ledger     | Financial state                      |
| Audit Log  | Operational history                  |

---

# ✨ Features

### 🤖 Autonomous AI Product Discovery

Agents can search products using natural-language intent.

Aegis converts product information into embeddings and uses **PostgreSQL + pgvector** for semantic product discovery.

---

### 🌍 Geo-Aware Offers

Discovery requests can contain geographic and compliance context such as:

* Country
* Target region
* Compliance requirements

Aegis can then generate region-aware offers including:

* Product information
* Regional tax
* Final price
* Compliance information
* Inventory availability

---

### 🧠 LangGraph Purchase Workflow

Purchases are orchestrated through a LangGraph workflow.

```text
Purchase Intent
      │
      ▼
   Ingest
      │
      ▼
Compliance Check
      │
   ┌──┴──┐
   │     │
Invalid Valid
   │     │
   ▼     ▼
Reject  Place Order
          │
          ▼
       Response
```

The AI workflow handles orchestration while the backend remains responsible for transactional operations.

---

### 🔐 Server-Side Guardrails

Critical transaction information is always verified by the backend.

Aegis protects against:

* Invalid quantities
* Invalid products
* Price manipulation
* Overspending
* Excessive purchase velocity
* Out-of-stock purchases
* Duplicate requests
* Invalid payment confirmations

---

### 🔒 Inventory Concurrency Protection

Inventory is protected using PostgreSQL row-level locking.

Conceptually:

```sql
SELECT *
FROM products
WHERE id = $1
FOR UPDATE;
```

This prevents two autonomous agents from purchasing the same final unit simultaneously.

```text
Stock = 1

Agent A ──────┐
              │
Agent B ──────┼──► PostgreSQL Row Lock
              │
              └──► Only one transaction succeeds
```

---

# ⭐ Progressive AI Agent Trust

One of the key features of Aegis is its **trusted buyer system**.

Traditional commerce repeatedly asks a human to authenticate or approve actions.

Autonomous commerce needs a better model.

Aegis introduces **progressive trust**.

---

## First-Time Buyer

When an AI agent interacts with a merchant for the first time, the agent is treated as an unknown buyer.

```text
                New AI Agent
                     │
                     ▼
             Purchase Request
                     │
                     ▼
          ┌─────────────────────┐
          │ Merchant Dashboard  │
          │                     │
          │ New Agent Request   │
          │                     │
          │ [ APPROVE ]         │
          │ [ REJECT  ]         │
          └──────────┬──────────┘
                     │
              ┌──────┴──────┐
              │             │
           Approve        Reject
              │             │
              ▼             ▼
        Trusted Buyer     Rejected
```

The merchant can inspect the request before allowing the first transaction.

---

## After Approval

Once the agent completes an approved/confirmed transaction, Aegis can recognize that agent through its `buyer_agent_id`.

Future requests from the same agent can therefore be treated as requests from a **trusted repeat buyer**.

```text
First Request
     │
     ▼
Merchant Approval
     │
     ▼
Successful Transaction
     │
     ▼
Agent becomes Trusted
     │
     ▼
Future Requests
     │
     ▼
Automatic / Low-Friction Approval
```

This creates a progressive trust model:

```text
UNKNOWN
   │
   │ Approved + successful transaction
   ▼
TRUSTED
   │
   │ Repeated successful transactions
   ▼
LOW-FRICTION AUTONOMOUS BUYER
```

### Why this matters

Imagine an enterprise AI procurement agent purchasing from the same supplier every week.

Without a trust system:

```text
Purchase 1 → Human approval
Purchase 2 → Human approval
Purchase 3 → Human approval
Purchase 4 → Human approval
...
```

With Aegis:

```text
Purchase 1 → Human approval
Purchase 2 → Trusted
Purchase 3 → Trusted
Purchase 4 → Trusted
...
```

The merchant retains control over the **first interaction**, while legitimate repeat agents can eventually transact with much less friction.

---

# 🛒 End-to-End Purchase Workflow

A complete Aegis transaction looks like this:

```text
┌──────────────────────┐
│    AI BUYER AGENT    │
└──────────┬───────────┘
           │
           │ Search Intent
           ▼
┌──────────────────────┐
│    AI DISCOVERY      │
│                      │
│ Embeddings           │
│ pgvector             │
│ Geo / Tax            │
│ Compliance           │
└──────────┬───────────┘
           │
           │ Offer
           ▼
┌──────────────────────┐
│    PURCHASE INTENT   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│     LANGGRAPH        │
│  Purchase Workflow   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   AEGIS BACKEND      │
│                      │
│ Idempotency          │
│ Velocity             │
│ Agent Trust          │
│ Price Verification   │
│ Inventory            │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ INVENTORY RESERVATION│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  RAZORPAY ORDER      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│      PAYMENT         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ SIGNED WEBHOOK       │
│ VERIFICATION         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ CONFIRM TRANSACTION  │
│                      │
│ Stock                │
│ Ledger               │
│ Audit                │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   CONFIRMED ORDER    │
└──────────────────────┘
```

---

# 🔄 Step-by-Step Workflow

## 1. AI Agent Sends a Search Request

Example:

```json
{
  "buyer_agent_id": "agent_bot_test",
  "buyer_geo_context": {
    "country_code": "DE",
    "target_region": "EU-Central",
    "compliance_requirements": [
      "CE_Certified"
    ]
  },
  "search_intent": {
    "query_string": "industrial grid coupling",
    "max_unit_budget_inr": 200,
    "quantity_required": 10
  }
}
```

---

## 2. Semantic Product Discovery

The AI service:

1. Generates a query embedding.
2. Searches the product embeddings.
3. Finds semantically similar products.
4. Checks inventory.
5. Calculates regional tax.
6. Generates the offer response.

```text
Natural Language
      │
      ▼
Embedding
      │
      ▼
pgvector
      │
      ▼
Similar Products
      │
      ▼
Geo / Tax / Compliance
      │
      ▼
Offer
```

---

# 3. Agent Selects an Offer

The agent receives structured product information such as:

```text
Product
SKU
Price
Tax
Final Price
Inventory
Compliance
Transaction ID
```

The agent can then decide whether to proceed.

---

# 4. Purchase Request

The agent sends:

```http
POST /api/agent/purchase
```

The AI service validates the request and passes the transaction into the backend.

---

# 5. Idempotency Check

Autonomous agents can retry requests because of network failures.

For example:

```text
Agent
  │
  ├── Purchase Request
  │
  ├── Server processes request
  │
  ├── Network timeout
  │
  └── Agent retries
```

Without idempotency:

```text
1 intention
    ↓
2 orders
```

Aegis instead uses an idempotency key:

```text
Purchase Intent
      │
      ▼
Idempotency Key
      │
      ▼
Existing Active Order?
      │
   ┌──┴──┐
  YES    NO
   │      │
   ▼      ▼
Return   Create
Existing  Order
Order
```

This protects against duplicate active transactions.

---

# 6. Spending / Velocity Guardrails

Aegis can enforce purchase velocity limits.

This prevents an autonomous agent from generating an abnormal number of orders within a short period.

Conceptually:

```text
Agent
  │
  ├── Request 1 ✓
  ├── Request 2 ✓
  ├── Request 3 ✓
  ├── Request 4 ✓
  │
  └── Request 5 ✕
             │
             ▼
       VELOCITY_LIMIT
```

---

# 7. Agent Trust Check

The backend determines whether the buyer agent is already trusted.

```text
buyer_agent_id
       │
       ▼
Previous confirmed transaction?
       │
   ┌───┴────┐
   │        │
  YES       NO
   │        │
   ▼        ▼
Trusted   First-time
Buyer      Buyer
              │
              ▼
        Merchant Approval
```

This is what allows Aegis to move from **human-supervised first interaction** to **low-friction autonomous repeat commerce**.

---

# 8. Inventory Reservation

Before payment is finalized, inventory is temporarily reserved.

```text
Available Stock
      │
      ▼
Reserve Quantity
      │
      ▼
Reservation TTL
      │
      ├──────────────┐
      │              │
 Payment succeeds   Payment fails/expires
      │              │
      ▼              ▼
Permanent          Release
Deduction          Stock
```

The reservation TTL prevents abandoned transactions from permanently locking inventory.

---

# 9. Razorpay Payment

Aegis creates the Razorpay payment order after the relevant transaction checks pass.

The backend does **not** consider the transaction successfully paid simply because a Razorpay order was created.

---

# 10. Webhook Verification

Razorpay sends the payment result through:

```http
POST /api/webhooks/razorpay
```

Aegis verifies the webhook signature.

```text
Webhook
   │
   ▼
Signature Verification
   │
 ┌─┴──────────────┐
 │                │
Invalid          Valid
 │                │
 ▼                ▼
Reject        Confirm Payment
                  │
                  ▼
             Confirm Order
```

This ensures that the backend does not blindly trust payment information supplied by a client.

---

# 11. Financial Ledger

Once a transaction is confirmed, financial information is recorded separately from the order itself.

```text
Confirmed Order
      │
      ├── Sale
      ├── Platform Fee
      ├── Tax
      └── Net Payout
```

This separation makes the system easier to audit.

---

# 12. Audit Trail

Aegis records important transaction events.

Examples:

```text
ORDER_CREATED
AUTO_APPROVED_TRUSTED_AGENT
REJECTED:OUT_OF_STOCK
REJECTED:VELOCITY_LIMIT
WEBHOOK_RECV
REJECTED:SIGNATURE_MISMATCH
LEDGER_POSTED
ROLLBACK_OK
```

The merchant dashboard exposes this operational history.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────┐
                         │   AI BUYER       │
                         │   AGENT          │
                         └────────┬─────────┘
                                  │
                                  ▼
                    ┌─────────────────────────┐
                    │       AI SERVICE        │
                    │                         │
                    │ FastAPI                 │
                    │ LangGraph               │
                    │ Discovery               │
                    │ Geo Optimizer            │
                    │ Embeddings               │
                    └───────────┬─────────────┘
                                │
                                ▼
                    ┌─────────────────────────┐
                    │        BACKEND          │
                    │                         │
                    │ Express                 │
                    │ Guardrails              │
                    │ Trust Engine             │
                    │ Inventory               │
                    │ Idempotency             │
                    │ Razorpay               │
                    │ Audit                   │
                    │ Ledger                  │
                    └───────────┬─────────────┘
                                │
                  ┌─────────────┼──────────────┐
                  │             │              │
                  ▼             ▼              ▼
          ┌─────────────┐ ┌───────────┐ ┌─────────────┐
          │ PostgreSQL  │ │ Razorpay  │ │  Merchant   │
          │ + pgvector  │ │           │ │  Dashboard  │
          └─────────────┘ └───────────┘ └─────────────┘
```

---

# 📂 Project Structure

```text
aegis/
│
├── ai-service/
│   ├── app/
│   │   ├── graph/
│   │   │   ├── __init__.py
│   │   │   └── purchase_graph.py
│   │   │
│   │   ├── ingestion/
│   │   │   ├── __init__.py
│   │   │   └── embed_products.py
│   │   │
│   │   ├── routers/
│   │   │   ├── __init__.py
│   │   │   ├── agent.py
│   │   │   └── discovery.py
│   │   │
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── backend_client.py
│   │   │   └── geo_optimizer.py
│   │   │
│   │   ├── config.py
│   │   ├── db.py
│   │   ├── embeddings.py
│   │   ├── main.py
│   │   └── schemas.py
│   │
│   ├── .env.example
│   ├── Dockerfile
│   └── requirements.txt
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   └── db.js
│   │   │
│   │   ├── controllers/
│   │   │   ├── auditController.js
│   │   │   ├── ledgerController.js
│   │   │   ├── ordersController.js
│   │   │   └── webhookController.js
│   │   │
│   │   ├── db/
│   │   │   ├── migrate.js
│   │   │   └── schema.sql
│   │   │
│   │   ├── middleware/
│   │   │   ├── correlationId.js
│   │   │   └── errorHandler.js
│   │   │
│   │   ├── routes/
│   │   │   ├── misc.js
│   │   │   ├── orders.js
│   │   │   └── webhooks.js
│   │   │
│   │   ├── services/
│   │   │   ├── auditService.js
│   │   │   ├── guardrails.js
│   │   │   ├── inventory.js
│   │   │   ├── ledgerService.js
│   │   │   ├── razorpayService.js
│   │   │   ├── reservationCleanup.js
│   │   │   └── ...
│   │   │
│   │   └── server.js
│   │
│   ├── Dockerfile
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   ├── loader/
│   │   │   ├── ui/
│   │   │   └── widgets/
│   │   │       ├── AboutModal.jsx
│   │   │       ├── AccountLookupModal.jsx
│   │   │       ├── ActivityLogCard.jsx
│   │   │       ├── AgentRequestPanel.jsx
│   │   │       ├── CompletionRatioCard.jsx
│   │   │       ├── CustomerOrdersCard.jsx
│   │   │       ├── SafetyChecksCard.jsx
│   │   │       └── SpendVelocityCard.jsx
│   │   │
│   │   ├── data/
│   │   ├── styles/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── Dockerfile
│   ├── nginx.conf
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── vite.config.js
│
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secret.yaml
│   ├── postgres-deployment.yaml
│   ├── postgres-service.yaml
│   ├── backend-deployment.yaml
│   ├── backend-service.yaml
│   ├── ai-service-deployment.yaml
│   ├── ai-service-service.yaml
│   ├── frontend-deployment.yaml
│   ├── frontend-service.yaml
│   └── ingress.yaml
│
├── docker-compose.yml
├── .gitignore
└── README.md
```

---

# 🧰 Tech Stack

## Frontend

* React
* Vite
* Tailwind CSS
* Framer Motion
* Lucide React
* Nginx

## Backend

* Node.js
* Express
* PostgreSQL
* `pg`
* Razorpay
* REST APIs

## AI Service

* Python
* FastAPI
* LangGraph
* LangChain Core
* Pydantic
* asyncpg
* NumPy
* pgvector

## Infrastructure

* Docker
* Docker Compose
* Kubernetes
* Kubernetes Ingress
* Persistent Volumes
* PostgreSQL + pgvector

---

# ⚙️ Local Setup

## Prerequisites

Make sure the following are installed:

* Node.js 20+
* Python 3.12+
* Docker
* Docker Compose
* PostgreSQL with pgvector
* Kubernetes + kubectl for Kubernetes deployment
* Razorpay test credentials for payment testing

---

# 🐳 Run Using Docker Compose

The recommended way to run the complete system locally is Docker Compose.

## 1. Clone the repository

```bash
git clone https://github.com/vivekcpu/Aegis-Agentic-Commerce-Dashboard
cd aegis
```

---

## 2. Configure environment variables

Create the required environment files from the examples:

```bash
cp backend/.env.example backend/.env
cp ai-service/.env.example ai-service/.env
```

Configure your database, Razorpay and service URLs.

---

## 3. Start the complete stack

```bash
docker compose up --build
```

For detached mode:

```bash
docker compose up -d --build
```

Check running containers:

```bash
docker compose ps
```

---

# 🔎 Service URLs

After starting the stack:

| Service    | URL                          |
| ---------- | ---------------------------- |
| Frontend   | `http://localhost:5173`      |
| Backend    | `http://localhost:4000`      |
| AI Service | `http://localhost:8000`      |
| AI Swagger | `http://localhost:8000/docs` |
| PostgreSQL | `localhost:5432`             |

---

# 🧠 Generate Product Embeddings

After PostgreSQL is running:

```bash
docker compose exec ai-service \
python -m app.ingestion.embed_products
```

This generates embeddings for products that do not already have one.

---

# 🧑‍💻 Manual Development Setup

## Backend

```bash
cd backend
npm install
npm run migrate
npm run dev
```

Production:

```bash
npm start
```

---

## AI Service

```bash
cd ai-service
pip install -r requirements.txt
```

Generate embeddings:

```bash
python -m app.ingestion.embed_products
```

Run FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

---

## Frontend

```bash
cd frontend
npm install
npm run dev
```

Production build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

---

# 🧪 API Testing

## Product Discovery

```bash
curl -X POST http://localhost:8000/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_agent_id": "agent_bot_test",
    "buyer_geo_context": {
      "country_code": "DE",
      "target_region": "EU-Central",
      "compliance_requirements": [
        "CE_Certified"
      ]
    },
    "search_intent": {
      "query_string": "industrial grid coupling",
      "max_unit_budget_inr": 200,
      "quantity_required": 10
    }
  }'
```

---

## AI Purchase

```bash
curl -X POST http://localhost:8000/api/agent/purchase \
  -H "Content-Type: application/json" \
  -d '{
    "buyer_agent_id": "agent_bot_test",
    "product_id": "prod_cable_441",
    "quantity": 5
  }'
```

---

# 💳 Payment Testing

Aegis supports Razorpay test-mode transactions.

Configure:

```env
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...
RAZORPAY_WEBHOOK_SECRET=...
```

The payment workflow is:

```text
Purchase
   ↓
Create Razorpay Order
   ↓
Payment
   ↓
Webhook
   ↓
Signature Verification
   ↓
Confirm Payment
   ↓
Confirm Order
   ↓
Ledger
   ↓
Audit
```

Aegis does not treat client-side payment information as authoritative.

---

# ☸️ Kubernetes Deployment

Aegis includes Kubernetes manifests for deploying the complete system.

```text
Kubernetes Cluster
│
├── Namespace
│
├── PostgreSQL
│   ├── Deployment
│   ├── Service
│   └── Persistent Volume
│
├── Backend
│   ├── Deployment
│   └── Service
│
├── AI Service
│   ├── Deployment
│   └── Service
│
├── Frontend
│   ├── Deployment
│   └── Service
│
└── Ingress
```

---

## Deploy Namespace

```bash
kubectl apply -f k8s/namespace.yaml
```

---

## Apply Configuration

```bash
kubectl apply -f k8s/configmap.yaml
```

---

## Apply Secrets

For production, create secrets separately rather than committing credentials.

Example:

```bash
kubectl create secret generic aegis-secrets \
  -n aegis \
  --from-literal=POSTGRES_PASSWORD='your-password' \
  --from-literal=RAZORPAY_KEY_ID='rzp_test_...' \
  --from-literal=RAZORPAY_KEY_SECRET='...' \
  --from-literal=RAZORPAY_WEBHOOK_SECRET='...'
```

---

## Deploy PostgreSQL

```bash
kubectl apply \
  -f k8s/postgres-deployment.yaml \
  -f k8s/postgres-service.yaml
```

---

## Deploy Backend

```bash
kubectl apply \
  -f k8s/backend-deployment.yaml \
  -f k8s/backend-service.yaml
```

---

## Deploy AI Service

```bash
kubectl apply \
  -f k8s/ai-service-deployment.yaml \
  -f k8s/ai-service-service.yaml
```

---

## Deploy Frontend

```bash
kubectl apply \
  -f k8s/frontend-deployment.yaml \
  -f k8s/frontend-service.yaml
```

---

## Deploy Ingress

```bash
kubectl apply -f k8s/ingress.yaml
```

---

## Run Database Migration

```bash
kubectl exec -n aegis deploy/backend -- npm run migrate
```

---

# 🔧 Useful Docker Commands

Start:

```bash
docker compose up --build
```

Start in background:

```bash
docker compose up -d --build
```

View containers:

```bash
docker compose ps
```

View all logs:

```bash
docker compose logs -f
```

Backend logs:

```bash
docker compose logs -f backend
```

AI service logs:

```bash
docker compose logs -f ai-service
```

Stop:

```bash
docker compose down
```

Remove containers and volumes:

```bash
docker compose down -v
```

---

# ☸️ Useful Kubernetes Commands

Check all resources:

```bash
kubectl get all -n aegis
```

Check pods:

```bash
kubectl get pods -n aegis
```

Watch pods:

```bash
kubectl get pods -n aegis -w
```

Check services:

```bash
kubectl get svc -n aegis
```

Check ingress:

```bash
kubectl get ingress -n aegis
```

Backend logs:

```bash
kubectl logs -n aegis deploy/backend
```

AI service logs:

```bash
kubectl logs -n aegis deploy/ai-service
```

Frontend logs:

```bash
kubectl logs -n aegis deploy/frontend
```

Restart backend:

```bash
kubectl rollout restart deployment/backend -n aegis
```

Restart AI service:

```bash
kubectl rollout restart deployment/ai-service -n aegis
```

Restart frontend:

```bash
kubectl rollout restart deployment/frontend -n aegis
```

---

# 🗄️ Database Architecture

Aegis uses PostgreSQL as the primary transactional database.

The major entities are:

```text
merchants
    │
    ├── products
    │
    └── orders
          │
          ├── ledger_entries
          │
          └── audit_log
```

### Products

Stores:

* Product information
* SKU
* Price
* Inventory
* Compliance metadata
* Embeddings

### Orders

Stores:

* Buyer agent
* Product
* Quantity
* Price
* Total amount
* Order status
* Idempotency key
* Razorpay IDs
* Reservation information
* Correlation ID

### Ledger Entries

Stores financial accounting information separately from order state.

### Audit Log

Stores operational transaction events.

---

# 🔎 Semantic Search Architecture

Aegis uses pgvector for product discovery.

```text
Product
   │
   ▼
Title + Description
   │
   ▼
Embedding
   │
   ▼
PostgreSQL
   │
   ▼
pgvector
```

A search request follows:

```text
User / AI Intent
       │
       ▼
Query Embedding
       │
       ▼
Cosine Similarity
       │
       ▼
Relevant Products
       │
       ▼
Geo / Tax / Compliance
       │
       ▼
Offer Response
```

---

# 🧱 Why the Architecture is Designed This Way

## AI Service ≠ Transaction Engine

The AI service should never become the authority for money or inventory.

Instead:

```text
AI SERVICE

"I want to buy this."
        │
        ▼
BACKEND

"Is this transaction allowed?"
        │
        ├── Price
        ├── Stock
        ├── Trust
        ├── Velocity
        ├── Idempotency
        └── Payment
```

This creates a strong security boundary.

---

# 🔐 Security Model

Aegis follows a **server-authoritative transaction model**.

Critical values are not trusted merely because an AI agent supplied them.

The backend verifies:

```text
Product
   ↓
Price
   ↓
Inventory
   ↓
Agent Trust
   ↓
Spending / Velocity
   ↓
Payment
   ↓
Ledger
```

This is particularly important because autonomous agents can operate much faster than humans and can retry requests automatically.

---

# 🔁 Failure Handling

Failures are treated as normal transaction states.

Examples:

```text
OUT_OF_STOCK
VELOCITY_LIMIT
PRODUCT_NOT_FOUND
INVALID_REQUEST
SIGNATURE_MISMATCH
PAYMENT_GATEWAY_UNAVAILABLE
```

The AI service can receive structured failure responses instead of low-level server errors.

Example:

```json
{
  "status": "rejected",
  "order_id": null,
  "reason_code": "OUT_OF_STOCK",
  "message": "Only 2 units are available.",
  "correlation_id": "..."
}
```

This allows autonomous agents to make decisions based on machine-readable outcomes.

---

# 🧾 Correlation IDs

Every transaction receives a correlation ID.

```text
AI Agent
   │
   │ correlation_id = abc123
   ▼
AI Service
   │
   ▼
Backend
   │
   ├── Guardrails
   ├── Inventory
   ├── Payment
   ├── Ledger
   └── Audit
```

This makes it possible to trace a transaction across multiple services.

---

# 📊 Merchant Dashboard

The merchant dashboard acts as the operational control center for Aegis.

It provides visibility into:

* AI agent requests
* Trusted buyers
* Customer orders
* Spending velocity
* Safety checks
* Completion ratio
* Audit activity
* Account information

The **Agent Request Panel** provides the human-in-the-loop layer for first-time autonomous buyers.

---

# 🧠 Architecture Principles

Aegis is built around several core principles.

### 1. AI should be autonomous, but not authoritative

AI can make decisions and requests.

The backend authorizes transactions.

### 2. Money-moving operations stay server-side

Payment confirmation and accounting are never delegated to the AI agent.

### 3. Inventory must be concurrency-safe

Database locking protects against simultaneous autonomous purchases.

### 4. Retries must be safe

Idempotency prevents duplicate active transactions.

### 5. Trust should be progressive

First-time agents can require human approval.

Successful repeat agents can become trusted buyers.

### 6. Every financial operation should be auditable

Orders, ledger entries and audit events are maintained separately.

### 7. Failure should be machine-readable

Autonomous agents need predictable error states.

---

# 🔮 Future Improvements

Potential production extensions include:

* Redis-backed distributed velocity limiting
* Persistent agent reputation scoring
* Cryptographic agent identity
* Agent API keys / signed requests
* Merchant-specific trust policies
* Multiple trust levels
* Per-agent spending limits
* Category-specific purchasing permissions
* Real-time dashboard updates
* Event-driven transaction processing
* Kafka / RabbitMQ integration
* Advanced fraud detection
* Multi-merchant support
* Production embedding models
* Enterprise procurement integrations

---

# 🌎 The Bigger Vision

Aegis is built around a simple observation:

**AI agents are becoming capable of acting on behalf of humans and businesses.**

Today:

```text
Human
  ↓
Website
  ↓
Checkout
```

Tomorrow:

```text
Human
  ↓
AI Agent
  ↓
Autonomous Decisions
  ↓
Multiple Merchants
  ↓
Purchases
  ↓
Payments
```

The infrastructure behind these transactions needs to answer questions that traditional e-commerce was not designed to handle:

```text
Who is this agent?

Should I trust it?

What is it allowed to buy?

How much can it spend?

Is the requested price legitimate?

Is inventory actually available?

Was payment genuinely completed?

Can this transaction be audited?

Should this agent need approval again?
```

Aegis is an attempt to build that missing layer.

---

# 🏁 Aegis in One Sentence

> **Aegis is a server-authoritative agentic commerce infrastructure that enables autonomous AI buyers to transact with merchants while enforcing inventory, pricing, spending, trust, payment, accounting, and audit controls.**

---

# 📜 License

Add your preferred license here.

---

## 👨‍💻 Built With

**React · Node.js · Express · Python · FastAPI · LangGraph · PostgreSQL · pgvector · Razorpay · Docker · Kubernetes**

---

> **Aegis — Building the trust layer for the agentic commerce era.**
