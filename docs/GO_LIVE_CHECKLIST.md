# Pathwise Go-Live Checklist (Sell-Ready)

## Current baseline (verified)
- ✅ Lint passes (`npm run lint`)
- ✅ Production build passes (`npm run build`)
- ✅ Unit/API tests pass (`npm run test`)
- ✅ App includes runtime diagnostics (`/setup`, `/api/health`)

---

## P0 — Must-have before live commercial launch

### 1) Infrastructure & deployment
- [ ] Deploy production on Vercel (or equivalent) with custom domain (e.g. `app.pathwise.ai`)
- [ ] Configure production env vars:
  - `NEXT_PUBLIC_APP_URL`
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - One AI key (`GROQ_API_KEY` or `GOOGLE_AI_API_KEY`)
  - `TRANSPORT_NSW_API_KEY`
  - `GOOGLE_PLACES_API_KEY`
  - `FIRECRAWL_API_KEY`
- [ ] Set preview/staging environment with separate Supabase project
- [ ] Add uptime monitor to `/api/health`

### 2) Stability & observability
- [ ] Add error tracking (Sentry or equivalent) for frontend + API routes
- [ ] Add request logging + alerting for 5xx spikes
- [ ] Add analytics funnel: landing → onboarding → plan generated → share/export
- [ ] Add API rate limiting on expensive routes (`/api/scrape`, `/api/itinerary`)

### 3) Security & trust
- [ ] Add legal pages linked in footer: Privacy Policy, Terms, Disclaimer
- [ ] Add data retention + deletion policy for user guides
- [ ] Add bot/abuse controls (IP throttle, basic WAF)
- [ ] Add explicit PHI/medical disclaimer in onboarding and export views

### 4) Product quality
- [ ] Add first-run demo profile + sample venue so buyers can see value in <2 min
- [ ] Add “Demo mode” badge and deterministic sample outputs for sales demos
- [ ] Ensure print/PDF works on A4 + Letter in Chrome and Safari
- [ ] Add fallback behavior messaging when provider APIs are unavailable

---

## P1 — Makes it materially more “buyable”

### 1) Commercial packaging
- [ ] Add “For organizations” page (hospitals/schools/venues)
- [ ] Publish pricing tiers (Starter, Team, Enterprise)
- [ ] Add contact CTA: “Book a live pilot”
- [ ] Add case-study format page with measurable outcomes

### 2) Enterprise readiness
- [ ] Add role-based admin dashboard (usage + generated plans + safety events)
- [ ] Add export/reporting (CSV + PDF usage summaries)
- [ ] Add SOC2-ready controls roadmap (audit logs, access controls)

### 3) Reliability hardening
- [ ] Add load test for peak scrape/generate traffic
- [ ] Add synthetic monitoring of full user flow (E2E in cron)
- [ ] Add backup/restore docs for Supabase data

---

## P2 — Growth accelerators
- [ ] Add referral loop in-app (“share this support plan with carer/team”)
- [ ] Add multilingual UX beyond social-story panels
- [ ] Add white-label support for institutions

---

## Go-live release gate
A release is **commercial-live ready** when all are true:
1. P0 complete
2. Last 7 days error rate < 1% on critical APIs
3. Median itinerary generation latency acceptable in production
4. Sales demo flow succeeds end-to-end in < 5 minutes

