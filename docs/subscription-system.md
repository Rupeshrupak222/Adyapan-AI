# Premium Subscription System

Enterprise subscription platform for Adyapan AI: Free / Premium (Pro) / Enterprise
plans, multi-gateway payments (Razorpay, Stripe, PayPal, Mock), feature gating with
per-plan quotas, user billing UI, and admin analytics + management.

## Architecture

```
frontend (Next.js)                         backend (Express + Prisma)
────────────────────                       ────────────────────────────
/app/premium            ──checkout/verify──▶  /api/subscription/*  ──▶ subscriptions / payments
/components/premium                         subscription.service.ts      plans / coupons
PremiumSetupWizard.tsx   ──coupon apply───▶  /api/payment/coupon/apply
/account-hub/BillingView ──overview──────▶  /api/subscription/overview
/admin/sections/         ──admin─────────▶  /api/admin/subscriptions/*
BillingFinance.tsx
```

All prices are stored in **paise** in `payments`, `plans` and `transactions`; the
`subscriptions` row keeps `price` in **rupees** (decimal) for readability.

## Data model

Created idempotently via boot SQL (not Prisma migrations):

- `backend/src/scripts/usage-tables.sql` → `subscriptions`, `billing_events`
- `backend/src/scripts/admin-tables.sql` → `transactions`, `payment_methods`,
  `billing_addresses`, `invoices`, `usage_limits`, `feature_access`
- `payments`, `plans`, `coupons`, `revenue_reports` come from the admin bootstrap

Prisma schema: `backend/prisma/schema.prisma` (master DB via `prisma.config.ts`).

### Key tables

| Table              | Purpose                                                        |
|--------------------|----------------------------------------------------------------|
| `plans`            | Admin-managed plan catalog (`free`, `pro_monthly`, `pro_yearly`, `enterprise`) |
| `subscriptions`    | One active sub per user; status: active / past_due / superseded / expired / cancelled / cancel_at_period_end |
| `payments`         | Payment orders + verification (amount in paise, `refundStatus`) |
| `transactions`     | Money-movement audit trail (`payment` / `refund`)               |
| `invoices`         | Generated PDF invoices (`ADY-YYYY-NNNNNN`)                      |
| `feature_access`   | featureKey → requiredPlan + gated flag + route pattern          |
| `usage_limits`     | Per-feature per-plan quotas (daily / monthly / tokens / storage)|
| `billing_addresses`| One per user (GSTIN for invoicing)                              |
| `payment_methods`  | Saved cards / gateway tokens                                    |

## Plans & pricing

Seeded in `backend/prisma/seed-subscription.ts`:

| Plan        | Monthly | Yearly | Self-checkout |
|-------------|---------|--------|---------------|
| free        | ₹0      | ₹0     | No            |
| pro_monthly | ₹199    | —      | Yes           |
| pro_yearly  | —       | ₹1999  | Yes           |
| enterprise  | custom  | custom | No (admin grant) |

`resolvePlanPrice` (`backend/src/controllers/plan.controller.ts`) prefers the
admin-managed `plans` table and falls back to `DEFAULT_PLANS`. `free` and
`enterprise` always resolve to ₹0 and are not offered in checkout.

## Checkout & payment flow

1. `GET /api/subscription/plans` → catalog (public)
2. `POST /api/subscription/checkout` `{ plan, billingCycle, provider?, couponCode? }`
   → `{ order: { provider, providerOrderId, amount, currency, key?, clientSecret?, approvalUrl? } }`
3. Client completes payment with the gateway:
   - **mock** (no creds configured) → auto-verifies in the wizard
   - **razorpay** → `checkout.js` modal, then verify handler
   - **paypal** → open `approvalUrl`, user confirms, then Verify
   - **stripe** → dev redirect (redirect flow not wired end-to-end yet)
4. `POST /api/subscription/verify` `{ orderId, paymentId, signature, provider }`
   → activates subscription, records `payment` + `transaction`, creates PDF
   invoice, sets user `plan` / `subscriptionStatus` / `subscriptionEnd`.

Gateway abstraction: `backend/src/services/payment-provider.service.ts`.
`getPaymentProvider(name)` falls back razorpay → mock without Razorpay creds;
Stripe / PayPal only activate with their env keys.

## Feature gating & usage limits

- `backend/src/services/feature-access.service.ts` — catalog cache + access eval.
- `backend/src/middleware/aiTokenLimit.middleware.ts` — feature-aware:
  1. resolve feature from route (`feature_access.route_pattern`)
  2. check plan gate (free < premium < enterprise)
  3. check `usage_limits` quotas against `ai_request_logs` / `ai_usage`
  4. fall back to global token/request quotas
  - fails **open** (unknown feature / eval errors) and skips ADMIN.
- `GET /api/subscription/feature-access` → user's matrix (allowed/limits/usage).
- Admin can edit `feature_access` rows and CRUD `usage_limits`.

## User endpoints (`/api/subscription`)

```
GET    /plans                      public plan catalog
GET    /features                   public feature catalog
GET    /overview                   subscription + usage + invoices + payment methods + billing address
GET    /feature-access             user feature matrix
POST   /checkout                   create payment order
POST   /verify                     verify payment + activate
POST   /cancel                     cancel (at period end or immediate)
POST   /renew                      renew existing
POST   /change-plan                upgrade / downgrade
GET    /invoices                   list invoices
GET    /invoices/:number/download  PDF invoice download
GET|POST   /payment-methods         saved cards
DELETE /payment-methods/:id
PUT    /payment-methods/:id/default
GET|PUT    /billing-address
GET    /providers                  configured gateways
```

Legacy endpoints still available: `GET /payment/plans` (public), `GET /payment/coupons`,
`POST /payment/coupon/apply`.

## Admin endpoints (`/api/admin/subscriptions`)

Require `billing:read` / `billing:write` permissions.

```
GET    /analytics                  MRR/ARR/net revenue/refunds/churn/upgrade-downgrade + revenue series
GET    /                           subscriptions (paginated, ?status= ?plan= ?page= ?perPage=)
POST   /users/:userId/grant        grant enterprise / pro / free for N days
GET    /transactions               ledger (paginated, ?type=)
POST   /payments/:id/refund        refund a paid payment (gateway + local record)
GET    /features                   feature_access + usage_limits
PUT    /features/:id               update requiredPlan / gated / name / etc.
POST   /features/refresh           force-refresh feature catalog cache
POST   /limits                     create usage limit
PUT    /limits/:id                 update usage limit
DELETE /limits/:id                 delete usage limit
```

## Frontend

| File                                              | Purpose                              |
|---------------------------------------------------|--------------------------------------|
| `frontend/src/app/premium/page.tsx`               | Premium landing + comparison + billing entry (`?view=billing`) |
| `frontend/src/components/premium/PremiumSetupWizard.tsx` | 5-step checkout wizard (plan → cycle/coupon → provider → review → confirm) |
| `frontend/src/components/account-hub/BillingView.tsx` | Manage subscription: invoices PDF, payment methods, billing address, cancel/renew, coupon apply |
| `frontend/src/components/admin/sections/BillingFinance.tsx` | Admin: revenue + subscription KPIs, analytics series, subscriptions + grant, transactions + refund, feature access + usage limits |
| `frontend/src/store/usage-store.ts`               | PlanKind snapshot store (`free`/`premium`/`enterprise`) |

Coupon handoff uses `localStorage["adyapan-coupon"]` (code + plan) from the
billing view to `/premium` for checkout.

## Environment

| Variable                       | Purpose                          |
|--------------------------------|----------------------------------|
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Enables Razorpay (else mock fallback) |
| `STRIPE_SECRET_KEY` / `STRIPE_PUBLISHABLE_KEY` | Enables Stripe |
| `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` | Enables PayPal |

## Running

```bash
cd backend
npx prisma generate                          # schema (master DB)
npx ts-node src/scripts/migrate-all.ts        # boot tables (idempotent)
npx ts-node prisma/seed-subscription.ts       # plans + feature catalog + limits
npm run typecheck                             # tsc --noEmit
npm test                                      # jest

cd ../frontend
npm run dev                                   # Next.js
```

## Tests

- `backend/tests/services/subscription.service.test.ts` — lifecycle, invoice numbers, expiration, cancel, change plan.
- `backend/tests/services/feature-access.test.ts` — plan gating, limits, route resolution, fail-open.
- `backend/tests/controllers/subscription-billing.test.ts` — plan price resolution + coupon validation.
