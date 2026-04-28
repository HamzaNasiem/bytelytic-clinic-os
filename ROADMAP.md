# Bytelytic Clinic OS — Complete Product Roadmap

**Product:** AI-powered front desk operating system for physical therapy & mental health clinics (USA)
**Business Model:** $450–$800/month per clinic — replaces human receptionist entirely
**Built by:** Bytelytic (bytelytic.com)
**Vision:** Every small clinic in America runs on Bytelytic — zero missed calls, zero no-shows, zero manual scheduling

---

## What This System Does

A clinic owner signs up → within 10 minutes they have:

1. A dedicated US phone number patients call 24/7
2. An AI voice agent that answers, books, reschedules, and handles FAQs
3. Automated 24-hour appointment reminder SMS
4. Patient recall — AI calls patients who haven't visited in 30/60/90 days
5. No-show prediction — flags high-risk patients, sends extra confirmations
6. Post-visit follow-up SMS with sentiment analysis
7. Insurance pre-verification 48h before appointments
8. A real-time dashboard showing everything — calls, bookings, revenue recovered

**The doctor does nothing. They just check the dashboard.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express 4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Voice AI | Retell AI |
| Telephony | Twilio (phone numbers + SMS) |
| Calendar | Google Calendar API |
| AI/LLM | OpenRouter (6 free models + fallback chain) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Email | Resend.com |
| Payments | Stripe |
| Backend Hosting | Railway.app |
| Frontend Hosting | Vercel |
| Background Jobs | node-cron (no Redis needed until Phase 7) |
| Monitoring | Better Uptime |

---

## Database Schema (7 Tables — Multi-Tenant from Day 1)

```sql
clinics         — clinic settings, Retell agent ID, calendar, billing
patients        — patient records, visit history, insurance, preferences
appointments    — all bookings with status, reminders, calendar event ID
calls           — every call log with transcript, duration, outcome
sms_messages    — all SMS sent/received with AI sentiment scoring
jobs            — background job retry queue (max 3 attempts)
revenue_events  — every dollar recovered, categorized by event type
```

---

## System Architecture

```
Patient
  │
  ├── Phone Call 24/7          ← Twilio → Retell AI answers
  ├── SMS Reply                ← Twilio webhook → intent detection
  ├── Online Booking Form      ← (Phase 5)
  └── Website Chat Widget      ← (Phase 6)
         │
         ▼
┌──────────────────────────────────────┐
│       Bytelytic Integration Layer    │
│                                      │
│  voice.service    booking engine     │
│  sms.service      calendar sync      │
│  ai.service       job queue          │
│  recall.service   noshow prediction  │
│  revenue.service  followup.service   │
└────────────────┬─────────────────────┘
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
  Retell AI   Twilio      Google Cal
  (calls)     (SMS)       (appointments)
                 │
     ┌───────────┤
     ▼           ▼
  OpenRouter   Stripe
  (AI/LLM)    (billing)
                 │
                 ▼
┌──────────────────────────────────────┐
│           Clinic Dashboard           │
│   Appointments + Calls + Analytics   │
│   Revenue + Patients + Settings      │
└──────────────────────────────────────┘
                 │
                 ▼
         Doctor (read-only view)
```

---

---

# PHASE 1 — Core MVP

**Status: ✅ COMPLETE**
**Goal:** AI answers inbound calls → appointments appear in dashboard

---

### Backend (Railway — live at `clinic-os-production.up.railway.app`)

- [x] `src/config/env.js` — all required env vars validated on startup, app exits with clear error if missing
- [x] `src/db/schema.sql` — complete PostgreSQL schema (7 tables, 7 indexes, multi-tenant)
- [x] `src/db/client.js` — Supabase client singleton
- [x] `src/server.js` — Express server with CORS, Morgan logging, graceful SIGTERM shutdown
- [x] `src/middleware/auth.middleware.js` — Supabase JWT verification, injects `req.clinicId`
- [x] `src/middleware/error.middleware.js` — global error handler, consistent error format

### Voice AI (Retell)

- [x] `src/services/voice.service.js` — handleCallEvent (started/ended/analyzed)
- [x] `src/services/voice.service.js` — AI extracts: patient name, date, time, appointment type
- [x] `src/services/voice.service.js` — patient upserted in DB on every call
- [x] `src/services/voice.service.js` — appointment created with status `scheduled`
- [x] `src/services/voice.service.js` — revenue_event inserted on every booking
- [x] `src/api/webhooks/retell.webhook.js` — HMAC-SHA256 signature verification
- [x] `src/api/webhooks/retell.webhook.js` — async processing (200 response before processing)
- [x] `src/api/webhooks/retell.webhook.js` — handles: call_started, call_ended, call_analyzed
- [x] Retell agent created and configured with clinic prompt
- [x] Twilio number `+15755734355` linked to Retell agent
- [x] Webhook URL: `https://clinic-os-production.up.railway.app/webhooks/retell`

### AI Service (OpenRouter)

- [x] `src/services/ai.service.js` — chat() function using OpenRouter API
- [x] 6 free model fallback chain (tries next model if one fails)
- [x] Dual API key support (primary + backup key for quota)
- [x] Booking details extraction from call transcript
- [x] Structured JSON output parsing

### Google Calendar Integration

- [x] `src/services/calendar.service.js` — OAuth2 client setup
- [x] `src/services/calendar.service.js` — available slot checking against business hours
- [x] `src/services/calendar.service.js` — appointment event creation
- [x] `src/services/calendar.service.js` — token refresh handling
- [x] `GET /auth/google` — OAuth redirect
- [x] `GET /auth/google/callback` — token exchange + save to clinic row

### SMS Service (Twilio)

- [x] `src/services/sms.service.js` — send() — outbound SMS with DB log
- [x] `src/services/sms.service.js` — sendReminder() — 24h reminder with formatted date/time
- [x] `src/services/sms.service.js` — sendFollowup() — post-visit follow-up
- [x] `src/services/sms.service.js` — handleInbound() — process patient SMS replies
- [x] `src/services/sms.service.js` — classifySentiment() — AI rates reply as positive/negative/neutral/concern
- [x] `src/services/sms.service.js` — detectIntent() — AI detects CONFIRM/CANCEL from natural text
- [x] `src/services/sms.service.js` — dev mode: fake numbers log instead of send
- [x] Confirmation SMS sent after every AI booking

### REST API (20+ Endpoints)

- [x] `POST /auth/login` — email/password → Supabase JWT
- [x] `GET /auth/me` — current user info
- [x] `GET /dashboard/stats` — totalPatients, totalCalls, totalAppointments, revenue, no-shows
- [x] `GET /dashboard/revenue` — month-over-month breakdown
- [x] `GET /dashboard/timeline` — call volume chart data (7/14/30 days)
- [x] `GET /appointments?range=today|7days|all` — filtered appointment list
- [x] `GET /appointments/today` — today only
- [x] `PUT /appointments/:id` — update status/notes/insurance_verified
- [x] `GET /patients` — list with search by name/phone
- [x] `GET /patients/:id` — detail + full history (calls + SMS + appointments)
- [x] `POST /patients` — create patient manually
- [x] `GET /calls` — call logs with filters
- [x] `GET /calls/:id` — single call with transcript
- [x] `GET /clinics/:id` — clinic settings
- [x] `PUT /clinics/:id` — update clinic settings
- [x] `POST /clinics/:id/create-agent` — create Retell agent
- [x] `PUT /clinics/:id/twilio-number` — save Twilio number
- [x] `DELETE /clinics/:id/wipe` — delete all clinic data
- [x] `POST /webhooks/retell` — Retell AI call events
- [x] `POST /webhooks/twilio/sms` — patient SMS replies
- [x] `POST /webhooks/twilio/status` — SMS delivery callbacks

### Frontend (React — Vercel live at `dashboard-two-jade-54.vercel.app`)

- [x] `dashboard/src/pages/Login.jsx` — Supabase auth, JWT stored in localStorage
- [x] `dashboard/src/pages/Dashboard.jsx` — 6 metric cards, bar chart, "Up Next" table
- [x] `dashboard/src/pages/Appointments.jsx` — today/upcoming/all filters, status badges, confirm/cancel/no-show actions
- [x] `dashboard/src/pages/Patients.jsx` — list + detail panel, search, full history (calls + SMS + appointments)
- [x] `dashboard/src/pages/CallLogs.jsx` — call list + transcript side panel, speaker-labeled
- [x] `dashboard/src/pages/Setup.jsx` — clinic info, system status, Create Agent button
- [x] `dashboard/src/components/Sidebar.jsx` — navigation, Bytelytic branding
- [x] `dashboard/src/components/Header.jsx` — notifications dropdown, help dropdown, profile dropdown, sign out
- [x] `dashboard/src/components/Layout.jsx` — app shell with sidebar + header
- [x] `dashboard/src/lib/api.js` — axios with JWT interceptor, 401 auto-redirect to login
- [x] `dashboard/src/App.jsx` — routing, protected routes, auth guard
- [x] Mobile responsive — hamburger menu, stack navigation on patients/calls, horizontal scroll on tables
- [x] `vercel.json` — build config pointing to /dashboard subdirectory
- [x] `dashboard/package.json` — vite/tailwind in dependencies (not devDependencies) for Vercel build

### Infrastructure

- [x] Railway deployment — auto-restart on crash, SIGTERM graceful shutdown
- [x] Vercel deployment — auto-deploy on git push
- [x] CORS — only Vercel + localhost allowed
- [x] All 4 cron jobs registered in server.js
- [x] `GET /health` — no-auth health check for uptime monitoring
- [x] Uncaught exception + unhandled rejection safety nets

### Credentials

```
Dashboard: https://dashboard-two-jade-54.vercel.app
Backend:   https://clinic-os-production.up.railway.app
Email:     qamx99@gmail.com
Password:  Bytelytic@2025
Phone:     +15755734355
```

---

---

# PHASE 2 — Automation & Reliability

**Status: 🔄 IN PROGRESS (Code: ✅ Done | Config: ⚠️ Partial | Tested: ❌)**
**Goal:** System runs automatically without any manual action

---

### 1. Appointment Reminder Job (24-hour SMS)

- [x] `src/jobs/reminder.job.js` — cron every hour, processes all active clinics
- [x] Logic: finds appointments in 24-25h window where `reminder_sent = false`
- [x] Calls `smsSvc.sendReminder()` → marks `reminder_sent = true`
- [x] Job record inserted in `jobs` table before action (crash-safe)
- [x] Per-clinic isolation (one failure doesn't stop other clinics)
- [x] Registered in `server.js` — runs on Railway automatically
- [ ] **Twilio Console** — webhook URL set to Railway ← **DO THIS**
- [ ] End-to-end test: book appointment for tomorrow → SMS received next hour

**To test manually:**
```bash
# Trigger job manually via Railway CLI or add test endpoint
node -e "require('./src/jobs/reminder.job.js').run()"
```

---

### 2. Inbound SMS Reply Handling (CONFIRM / CANCEL)

- [x] `src/api/webhooks/twilio.webhook.js` — signature verified, 200 returned immediately
- [x] `POST /webhooks/twilio/sms` — resolves clinic from Twilio `To` number
- [x] `POST /webhooks/twilio/status` — updates `sms_messages.status` from delivery callbacks
- [x] `smsSvc.handleInbound()` — parallel: classify sentiment + detect intent
- [x] Intent → appointment status updated in DB (confirm/cancel)
- [x] All SMS saved to `sms_messages` table with sentiment
- [ ] **Twilio Console** → +15755734355 → Messaging → Webhook URL: ← **DO THIS**
  ```
  https://clinic-os-production.up.railway.app/webhooks/twilio/sms
  ```
- [ ] End-to-end test: send "CONFIRM" to +15755734355 → appointment status changes

---

### 3. Background Jobs — All 4 Running

- [x] `src/jobs/reminder.job.js` — every hour (`:00`) — 24h SMS reminders
- [x] `src/jobs/noshow.job.js` — daily 18:00 UTC — no-show prediction + confirmations
- [x] `src/jobs/recall.job.js` — daily 20:00 UTC — outbound recall calls
- [x] `src/jobs/insurance.job.js` — daily 09:00 UTC — insurance verification SMS
- [x] All 4 registered and started in `server.js`
- [x] Each job isolates per-clinic failures
- [x] railway.toml — `restartPolicyType = "on_failure"` — auto-restart on crash
- [ ] Verify jobs running: Railway → Service → Metrics → check for hourly activity

---

### 4. Appointments Page — Full Verification

- [x] Today filter — shows only today's appointments
- [x] Next 7 Days filter — shows upcoming week
- [x] All filter — complete history
- [x] Status badges: scheduled (blue), confirmed (green), cancelled (red), completed (purple), no_show (brown)
- [x] Confirm button → PUT /appointments/:id → status = confirmed
- [x] No-Show button → PUT /appointments/:id → status = no_show
- [x] Cancel button → PUT /appointments/:id → status = cancelled
- [x] AI booked badge (Bot icon) vs manually booked (User icon)
- [x] Avatar with patient initials + deterministic color
- [x] Mobile horizontal scroll on table
- [ ] Click appointment row → show linked call transcript (not yet implemented)
- [ ] Appointment detail modal with full notes

**Missing: Appointment → Transcript link**
```javascript
// In Appointments.jsx — add onClick to appointment row
// Fetch call linked to appointment_id and show transcript panel
```

---

### 5. Patients Page — Full Verification

- [x] Patient directory — list with search by name/phone
- [x] Click patient → detail panel (desktop split view)
- [x] Mobile: tap → full screen detail view with back button
- [x] Patient profile: name, phone, status badge, avatar
- [x] Clinical summary: last visit, total visits, no-shows
- [x] Appointment history table with status dots
- [x] Communication log: calls + SMS in one unified view
- [x] Book Appointment button — UI exists
- [x] Message Patient button — UI exists
- [ ] Book Appointment → actually calls `POST /appointments` API
- [ ] Message Patient → actually calls `POST /sms/send` API
- [ ] Patient detail: show insurance info (provider + member ID)
- [ ] Edit patient info (name, phone, DOB)

---

### 6. Call Logs Page — Full Verification

- [x] All calls list with duration, direction, type, date
- [x] Click row → transcript panel opens on right
- [x] Transcript: speaker-labeled lines (Agent: / Patient:)
- [x] Outcome badge (Booking, No Answer, Completed, etc.)
- [x] Direction: inbound (PhoneIncoming) / outbound (PhoneOutgoing) icons
- [x] Avatar with patient initials
- [x] "No calls yet" empty state with instructions
- [ ] Filter tabs (All / Inbound / Outbound / Bookings) — UI exists but not filtering
- [ ] Recording playback — only show button if `recording_url` not null
- [ ] AI summary generation for each call transcript
- [ ] Duration visual bar (relative call length)

**Missing: Filter logic**
```javascript
// In CallLogs.jsx — client-side filter
const filtered = calls.filter(c => {
  if (activeFilter === 'inbound') return c.direction === 'inbound';
  if (activeFilter === 'outbound') return c.direction === 'outbound';
  if (activeFilter === 'bookings') return c.call_type === 'booking';
  return true; // 'all'
});
```

---

### 7. Revenue Tracking — Verify

- [x] `revenue_events` table — stores every dollar recovered
- [x] `src/services/revenue.service.js` — recordEvent(), getMonthlyStats()
- [x] `voice.service.js` — inserts revenue_event on every AI booking ($150 default)
- [x] `recall.service.js` — inserts revenue_event on recall bookings
- [x] `GET /dashboard/stats` — returns revenueRecoveredCents + revenueRecoveredDollars
- [x] `GET /dashboard/revenue` — monthly breakdown with MoM % change
- [x] Dashboard card shows revenue amount
- [ ] **Blocked:** $0 because no real AI calls yet — Retell agent must be linked to Twilio number
- [ ] Test: make 3 test calls → verify $450 on dashboard
- [ ] Revenue card — add "per booking" detail text when $0

---

### 8. Vercel Deployment — Verified

- [x] Dashboard deployed at `dashboard-two-jade-54.vercel.app`
- [x] `VITE_API_URL` = `https://clinic-os-production.up.railway.app` set in Vercel
- [x] Login working with real Supabase credentials
- [x] CORS on Railway allows Vercel origin — confirmed `Access-Control-Allow-Origin: https://dashboard-two-jade-54.vercel.app`
- [x] API calls go to Railway (not localhost) — confirmed
- [x] Auto-deploy on git push — working via vercel.json

---

### Phase 2 Remaining Checklist

```
[ ] Twilio Console → +15755734355 → SMS Webhook URL set
[ ] Retell Dashboard → Phone Numbers → link +15755734355 to agent
[ ] Setup page → "Create Agent" → retell_agent_id saved to DB
[ ] Call Logs filter tabs — implement client-side filter logic
[ ] Patients page → Book Appointment → wire to API
[ ] Appointments page → click row → show transcript
[ ] Make 3 test calls → verify revenue tracking
```

---

---

# PHASE 3 — WOW Automation Features

**Status: 🔄 IN PROGRESS (Recall ✅ | No-Show ✅)**
**Goal:** AI proactively works for the clinic — recalls patients, predicts no-shows, handles follow-ups

---

### 1. Patient Recall System (Outbound AI Calls)

**Code:** `src/services/recall.service.js` + `src/jobs/recall.job.js` ← ✅ Tested and Live

- [x] `recall.service.js` — getRecallCandidates() — finds patients with last_visit = 30/60/90 days ago
- [x] `recall.service.js` — initiateRecall() — creates Retell outbound call to patient
- [x] `recall.service.js` — handleRecallResult() — if booked: create appointment + revenue_event
- [x] `recall.job.js` — daily 20:00 UTC — max 20 calls per clinic per day
- [x] Dashboard → Patients page — "Recall Candidates" section
- [x] Test: set patient `last_visit_date = 31 days ago` → run job → call goes out → appointment booked

**Business impact:** $150 per recovered patient × 5-10 patients/month = $750-1500 extra revenue per clinic

---

### 2. No-Show Prediction System

**Code:** `src/services/noshow.service.js` + `src/jobs/noshow.job.js` ← ✅ Tested and Live

- [x] `noshow.service.js` — predictNoshows() — AI scores upcoming appointments by risk
- [x] Risk factors: past no-shows, day of week, appointment type, time of day
- [x] `noshow.job.js` — daily 18:00 UTC — top 3 high-risk → extra confirmation SMS
- [x] `jobs` table — job record before each SMS (crash-safe)
- [x] Dashboard → Appointments page — risk badge (🔴 High Risk) next to patient name
- [x] Test: create patient with `no_show_count = 3` → book appointment → check risk score

---

### 3. Post-Visit Follow-Up SMS

**Code:** `src/services/followup.service.js` ← exists, untested

- [ ] `followup.service.js` — send follow-up 48h after completed appointment
- [ ] Message: "Hi [name]! Checking in after your [type]. How are you feeling? Reply anytime."
- [ ] `sms.service.js` — classifySentiment() already handles reply analysis
- [ ] Negative sentiment → flag in dashboard for doctor review
- [ ] `sms_messages.reply_sentiment` field — already in schema
- [ ] Dashboard → Patient detail → show sentiment icon next to SMS reply
- [ ] Job: Add `followup.job.js` — runs daily, finds completed appointments 48h ago where followup not sent
- [ ] Schema change: add `followup_sent BOOLEAN DEFAULT false` to appointments table

---

### 4. Insurance Pre-Verification SMS

**Code:** `src/services/insurance.service.js` + `src/jobs/insurance.job.js` ← exists, untested

- [ ] `insurance.service.js` — send insurance check SMS 48h before appointment
- [ ] Message: "Hi [name]! Confirming your [insurance] is active for your visit on [date]. Reply YES to confirm."
- [ ] If no response in 24h → flag `insurance_verified = false` in appointments table
- [ ] Dashboard → Appointments → ⚠️ icon on unverified insurance
- [ ] `insurance.job.js` — daily 09:00 UTC — processes tomorrow's appointments
- [ ] Test: book appointment for day after tomorrow → insurance SMS sent → check appointment flag

---

### 5. Waitlist Auto-Fill

**Code:** Not yet written

- [ ] Schema: add `waitlist` table — patient_id, clinic_id, preferred_dates, appointment_type
- [ ] When appointment cancelled → find waitlisted patient for that slot
- [ ] Retell outbound call to waitlisted patient — "A slot opened up for [date/time], want it?"
- [ ] If yes → create appointment → revenue_event type = `noshow_slot_filled`
- [ ] `src/services/waitlist.service.js` — getWaitlistCandidates(), offerSlot()
- [ ] Dashboard → Appointments → cancelled appointment shows "Find Waitlist Patient" button
- [ ] API: `POST /waitlist` — add patient to waitlist
- [ ] API: `GET /waitlist` — view current waitlist

---

### 6. Appointment Rescheduling via Voice

**Code:** Current voice agent only handles new bookings

- [ ] Retell agent prompt update — detect when patient says "reschedule" or "change my appointment"
- [ ] Agent asks: "What day works better for you?"
- [ ] `voice.service.js` — detect `action: 'reschedule'` from AI extraction
- [ ] Find existing appointment for patient → update datetime
- [ ] Google Calendar event updated
- [ ] SMS confirmation sent: "Your appointment has been rescheduled to [new date/time]"

---

### Phase 3 New Files to Create

```
src/jobs/followup.job.js          — daily 10am UTC — post-visit follow-ups
src/services/waitlist.service.js  — waitlist management
src/api/waitlist/waitlist.routes.js — waitlist endpoints
```

---

---

# PHASE 4 — Self-Service Onboarding (SaaS Foundation)

**Status: 🔲 NOT STARTED**
**Goal:** Any clinic can sign up and be fully operational in 10 minutes — zero manual work

---

### 1. Public Signup Page

- [ ] `dashboard/src/pages/Signup.jsx` — multi-step wizard (4 steps)
- [ ] Step 1: Clinic info (name, specialty, city, timezone)
- [ ] Step 2: Doctor info (name, credentials, contact)
- [ ] Step 3: Business hours (Mon-Fri time pickers)
- [ ] Step 4: Appointment types (name + duration, add/remove)
- [ ] Submit → triggers full auto-provisioning flow

---

### 2. Auto-Provisioning Engine

- [ ] `src/services/onboarding.service.js` — orchestrates full signup
- [ ] Step 1: Create Supabase auth user (email + password)
- [ ] Step 2: Insert clinic row with all settings
- [ ] Step 3: Call Retell API → create personalized agent (inject clinic name, hours, doctor name, appointment types into prompt)
- [ ] Step 4: Assign available Twilio number from pool → link to new Retell agent
- [ ] Step 5: Send Google Calendar OAuth link to clinic email
- [ ] Step 6: Send welcome email (via Resend.com) with dashboard login + phone number
- [ ] All steps wrapped in try-catch — if step fails, rollback previous steps
- [ ] `POST /onboard` — single endpoint that runs entire flow
- [ ] `onboarding_status` tracked: step-by-step progress saved to DB

---

### 3. Twilio Number Pool Management

- [ ] `src/services/phonenumber.service.js`
- [ ] `assignNumber(clinicId)` — grab next available number from pool
- [ ] `releaseNumber(clinicId)` — return number to pool when clinic cancels
- [ ] Schema: add `phone_pool` table — number, assigned_to (clinic_id), assigned_at
- [ ] Pre-purchase 10 Twilio numbers → add to pool
- [ ] Auto-alert when pool has < 3 numbers remaining

---

### 4. Personalized Retell Agent Per Clinic

- [ ] `src/services/voice.service.js` — buildAgentPrompt(clinic) — dynamic prompt generation
- [ ] Prompt includes: clinic name, doctor name, specialty, hours by day, appointment types + durations, city/timezone
- [ ] Agent voice selection (male/female, accent options)
- [ ] Post-call analysis setting — extract structured data
- [ ] Webhook URL set to clinic-specific endpoint (or global with clinic resolution)
- [ ] Agent updated via Retell API when clinic settings change

---

### 5. Google Calendar OAuth Flow (Self-Service)

- [ ] Dashboard → Settings page → "Connect Google Calendar" button
- [ ] `GET /auth/google?token=<jwt>` — already built, just needs UI button
- [ ] OAuth completes → `google_refresh_token` saved to clinic row
- [ ] Dashboard status indicator: "Google Calendar ✅ Connected" / "❌ Not Connected"
- [ ] If token expires → auto-refresh using refresh_token (already handled in calendar.service.js)

---

### 6. Clinic Settings Page (Full)

- [ ] `dashboard/src/pages/Settings.jsx` — full settings (rename from Setup)
- [ ] **Clinic Profile tab:** name, specialty, address, timezone, phone number display
- [ ] **Business Hours tab:** Mon-Fri individual time pickers, enable/disable days
- [ ] **Appointment Types tab:** add/remove/edit types with duration
- [ ] **Integrations tab:** Google Calendar connect, Twilio status, Retell agent status
- [ ] **Notifications tab:** email reminders on/off, recall on/off, follow-up on/off
- [ ] **Danger Zone tab:** test call, reset data, cancel account
- [ ] All changes → `PUT /clinics/:id` → saved instantly

---

### 7. Multi-Clinic Admin Dashboard

- [ ] `dashboard/src/pages/Admin.jsx` — separate route `/admin` (bytelytic owner only)
- [ ] Auth: check if user email is bytelytic admin email
- [ ] View all clinics — name, status, active/suspended, calls this month, revenue
- [ ] Per-clinic quick actions: view dashboard, suspend, activate, impersonate
- [ ] Global stats: total clinics, total calls this month, total revenue
- [ ] `GET /admin/clinics` — admin-only endpoint (different auth check)
- [ ] `POST /admin/clinics/:id/suspend` — suspend clinic (stop cron jobs)
- [ ] `POST /admin/clinics/:id/activate` — resume clinic

---

### 8. Welcome Email (Resend.com)

- [ ] `src/services/email.service.js` — Resend.com API integration
- [ ] `sendWelcomeEmail(clinic)` — sent after successful onboarding
- [ ] Email content:
  - Clinic name + doctor name
  - Dashboard login URL + credentials
  - Their dedicated phone number
  - "Your AI receptionist is live. Patients can call [number] right now."
  - Quick start guide (3 steps)
- [ ] `sendDailyReport(clinic)` — morning summary email (Phase 5)
- [ ] `sendAlertEmail(clinic, message)` — for critical failures

---

### Phase 4 New Files

```
src/services/onboarding.service.js
src/services/phonenumber.service.js
src/services/email.service.js
src/api/admin/admin.routes.js
src/api/onboard/onboard.routes.js
dashboard/src/pages/Signup.jsx
dashboard/src/pages/Settings.jsx   ← replaces Setup.jsx
dashboard/src/pages/Admin.jsx
```

---

---

# PHASE 5 — Billing & Public Launch

**Status: 🔲 NOT STARTED**
**Goal:** Paying customers using the product — real revenue for Bytelytic

---

### 1. Stripe Subscription Billing

- [ ] `src/services/billing.service.js` — Stripe API integration
- [ ] Plans:
  - Starter: $149/month — 200 calls/month, 1 location
  - Growth: $299/month — 500 calls/month, reminders + recall
  - Pro: $599/month — unlimited calls, all features, priority support
- [ ] `POST /billing/create-subscription` — start Stripe checkout session
- [ ] `POST /webhooks/stripe` — handle: payment success, failure, cancellation
- [ ] On payment failure → `clinic.is_active = false` → no more AI calls
- [ ] On payment success → `clinic.is_active = true` → all restored
- [ ] Schema: add to clinics table — `stripe_customer_id`, `stripe_subscription_id`, `plan`, `trial_ends_at`
- [ ] 14-day free trial — no card required to start
- [ ] `GET /billing/portal` — Stripe customer portal link (self-service plan changes)

---

### 2. Usage Tracking

- [ ] Track calls per month per clinic
- [ ] Track SMS per month per clinic
- [ ] Soft limits: warn at 80% usage → email alert
- [ ] Hard limits: pause AI after 100% → notify clinic
- [ ] `GET /billing/usage` — current month usage vs plan limits
- [ ] Dashboard → Settings → Usage tab with progress bars

---

### 3. Trial Experience

- [ ] Signup → 14-day trial starts automatically
- [ ] Trial banner in dashboard header: "Trial: 8 days remaining → Upgrade"
- [ ] Day 10 email: "Your trial ends in 4 days — add card to continue"
- [ ] Day 14: clinic suspended if no card → friendly "Trial ended" page
- [ ] If upgrade: all data preserved, seamless continuation

---

### 4. Public Landing Page (bytelytic.com)

- [ ] Hero: "Your AI receptionist answers every call, books every patient, 24/7"
- [ ] Demo video: 60-second screen recording of full flow
- [ ] Pricing table: 3 plans, annual discount
- [ ] Social proof: "(X) appointments booked this month" (live counter from DB)
- [ ] FAQ section
- [ ] "Book a demo" → Calendly link
- [ ] "Start free trial" → Signup page
- [ ] Tech: Next.js (separate from dashboard) or simple HTML/CSS
- [ ] Domain: bytelytic.com (already owned)

---

### 5. Demo Booking Flow

- [ ] bytelytic.com → "Book a demo" → Calendly embed
- [ ] After demo → send personalized follow-up: "Your demo clinic is ready to try"
- [ ] Auto-provision a demo clinic with fake data pre-populated
- [ ] Demo link expires in 7 days

---

### 6. Referral System

- [ ] Each clinic gets a referral code: `bytelytic.com/r/CLINIC123`
- [ ] Referring clinic gets 1 month free per referral
- [ ] Referred clinic gets 1 month free
- [ ] `referrals` table: ref_code, referrer_clinic_id, referred_clinic_id, rewarded_at

---

---

# PHASE 6 — Intelligence & Analytics

**Status: 🔲 NOT STARTED**
**Goal:** AI doesn't just automate — it advises. Clinic owner makes better decisions with data.

---

### 1. Weekly AI Insights Email

- [ ] Every Monday morning → email to clinic owner
- [ ] Content generated by AI from last week's data:
  - "You missed 3 calls on Tuesday between 12-2pm — consider adding lunch coverage"
  - "Your no-show rate this week was 18% — 4 patients didn't confirm. Reminder system is helping."
  - "Recall calls recovered $450 this week from 3 patients"
- [ ] `src/services/insights.service.js` — generateWeeklyInsights(clinicId)
- [ ] Uses OpenRouter to analyze DB data and generate natural language report

---

### 2. Advanced Dashboard Analytics

- [ ] **Revenue page:** monthly trend chart (12 months), breakdown by event type
- [ ] **Calls page:** busiest hours heatmap (Mon-Sun × 8am-8pm grid)
- [ ] **Patients page:** new vs returning patient ratio chart
- [ ] **No-show page:** no-show rate trend, top no-show patients list
- [ ] **Recall page:** recall campaign results — called / answered / booked / revenue
- [ ] Date range picker (last 7/30/90 days / custom)
- [ ] Export to CSV button

---

### 3. Smart Scheduling Suggestions

- [ ] AI analyzes booking patterns → suggests optimal hours
- [ ] "Most patients prefer Friday 10am-12pm — consider adding a slot"
- [ ] "You have 3 consecutive Mondays with no bookings after 4pm"
- [ ] Dashboard → Insights tab → AI recommendations cards

---

### 4. Patient Lifetime Value Tracking

- [ ] Per-patient: total revenue generated, visit frequency, churn risk
- [ ] High-value patients flagged — "VIP" badge in patient list
- [ ] Churn risk: patient hasn't visited in 90+ days, past 5+ visits
- [ ] Automatic recall prioritization: high-LTV patients recalled first

---

### 5. Competitor Benchmarking (Future)

- [ ] Anonymous aggregated data from all Bytelytic clinics
- [ ] "Your no-show rate (12%) is better than avg (18%)"
- [ ] "Clinics in your specialty average 47 calls/month"
- [ ] Opt-in only, fully anonymous

---

---

# PHASE 7 — Production Hardening & Scale

**Status: 🔲 NOT STARTED**
**Goal:** Zero downtime, HIPAA compliance, ready for 50+ clinics

---

### 1. Monitoring & Alerting

- [ ] Better Uptime — ping `/health` every 5 minutes
- [ ] Alert channels: email + SMS to Bytelytic owner if down
- [ ] Railway auto-restart already configured
- [ ] `GET /health/detailed` — check DB connection, Retell API, Twilio API — full status
- [ ] Error rate monitoring: if > 5 errors/minute → alert
- [ ] Response time monitoring: if avg > 2s → alert

---

### 2. Daily Report Email to Clinic Owner

- [ ] Every morning 9am (clinic's timezone)
- [ ] "Yesterday your AI handled X calls, booked Y appointments, sent Z reminders"
- [ ] Top patient who called most, most common question asked
- [ ] Open rate tracking via Resend.com analytics

---

### 3. HIPAA Compliance Hardening

- [ ] Audit all Railway logs — ensure patient name/phone/DOB never logged
- [ ] `morgan` log format — exclude request body from logs
- [ ] `console.log` audit across all services — no PHI in logs
- [ ] BAA (Business Associate Agreement) drafted for each clinic
- [ ] Supabase Row Level Security (RLS) enabled — clinics cannot see each other's data
- [ ] Supabase access logs enabled
- [ ] All patient data encrypted at rest (Supabase default)
- [ ] Data retention policy: delete calls/SMS after 7 years (HIPAA requirement)
- [ ] `DELETE /patients/:id` — full HIPAA-compliant patient data deletion

---

### 4. API Security Hardening

- [ ] Rate limiting: `express-rate-limit` — 100 req/min per IP
- [ ] Webhook idempotency: store `retell_call_id` + `twilio_sid` → reject duplicates
- [ ] Input validation: `zod` schema validation on all POST/PUT endpoints
- [ ] SQL injection prevention: already handled by Supabase SDK (parameterized)
- [ ] JWT expiry: check token age, force re-login after 24h
- [ ] Admin endpoints: separate IP whitelist or separate API key

---

### 5. Performance Optimization

- [ ] Dashboard stats endpoint: add Redis cache (5 min TTL) — currently hits DB on every load
- [ ] Patient list: add cursor-based pagination (currently returns all)
- [ ] Call logs: add pagination with cursor
- [ ] DB indexes: verify query plans for most-used queries
- [ ] Appointments: add materialized view for "today's appointments" (high-frequency query)

---

### 6. Redis Job Queue (50+ Clinics)

- [ ] Replace `node-cron` with `bull` (Redis-backed job queue)
- [ ] Jobs become reliable — survive server restarts without losing pending work
- [ ] Retry logic with exponential backoff
- [ ] Dead letter queue for permanently failed jobs
- [ ] Bull Board UI — visual job monitoring dashboard
- [ ] Railway Redis add-on — $5/month

---

### 7. Backup & Recovery

- [ ] Supabase daily DB backups (auto — already enabled on paid tier)
- [ ] Export patient data as CSV — `GET /export/patients.csv`
- [ ] Export appointments as CSV — `GET /export/appointments.csv`
- [ ] Disaster recovery plan: redeploy from GitHub → Railway in < 10 minutes

---

---

# PHASE 8 — Enterprise & White Label

**Status: 🔲 NOT STARTED**
**Goal:** Agencies and large clinic groups use Bytelytic at scale

---

### 1. Multi-Location Clinic Groups

- [ ] Schema: `clinic_groups` table — group_id, group_name, owner_email
- [ ] Clinics belong to a group (optional)
- [ ] Group admin dashboard: see all locations in one view
- [ ] Cross-location patient lookup (patient visits Location A, seen at Location B)
- [ ] Group-level billing: one Stripe subscription for all locations

---

### 2. White Label for Agencies

- [ ] Agency signs up → gets their own branded dashboard (custom logo, colors, domain)
- [ ] Agency manages multiple client clinics
- [ ] Client clinics see agency branding (not Bytelytic)
- [ ] Agency billing: wholesale price ($200/clinic) → sells at $500 → $300 margin per clinic
- [ ] Custom domain support: `dashboard.theiragency.com` → points to Bytelytic

---

### 3. EHR/EMR Integration

- [ ] Jane App (Canada/USA) — read/write patient records
- [ ] SimplePractice — read/write appointments
- [ ] Kareo, Athenahealth — (future)
- [ ] Integration via API or Zapier webhook bridge
- [ ] When appointment booked → auto-create in EHR system
- [ ] When patient created → sync demographic data

---

### 4. Custom Voice Agent Builder

- [ ] Dashboard → Agent tab — customize agent behavior
- [ ] Edit system prompt in UI (with guardrails)
- [ ] Change agent voice (male/female, English/Spanish)
- [ ] Set custom greeting message
- [ ] Add FAQ answers (What's your address? → set answer)
- [ ] Emergency routing: "Press 9 for urgent matters" → call forward to doctor cell
- [ ] A/B test two agent scripts — track which converts better

---

### 5. Spanish Language Support

- [ ] Retell agent: Spanish language option
- [ ] SMS messages in Spanish
- [ ] Dashboard: English/Spanish toggle
- [ ] Patient language preference stored in DB
- [ ] Auto-detect caller language from first few seconds
- [ ] Spanish clinics — huge underserved market in USA

---

---

## Summary Table

| Phase | Name | Status | Key Outcome |
|-------|------|--------|-------------|
| 1 | Core MVP | ✅ COMPLETE | AI answers calls, books appointments, dashboard works |
| 2 | Automation & Reliability | 🔄 In Progress | Reminders run automatically, Twilio webhook live |
| 3 | WOW Automation | 🔲 Code Exists | Recall, no-show prediction, follow-ups, insurance |
| 4 | Self-Service Onboarding | 🔲 Not Started | Any clinic signs up → live in 10 minutes |
| 5 | Billing & Public Launch | 🔲 Not Started | Real paying customers, bytelytic.com live |
| 6 | Intelligence & Analytics | 🔲 Not Started | AI insights, advanced reporting, LTV tracking |
| 7 | Production Hardening | 🔲 Not Started | HIPAA, monitoring, scale to 50+ clinics |
| 8 | Enterprise & White Label | 🔲 Not Started | Agencies, multi-location, EHR integration |

---

## Business Value Per Feature

| Feature | Value to Clinic | Monthly Revenue Impact |
|---------|----------------|----------------------|
| AI answers calls 24/7 | Never miss a patient | +$150 per recovered call |
| Auto booking | No receptionist ($2500/mo salary) | Save $2,500/month |
| 24h reminder SMS | 30% fewer no-shows | +$450/month |
| Patient recall calls | Bring back lost patients | +$150 per booking |
| No-show prediction | Fill empty slots from waitlist | +$150 per filled slot |
| Post-visit follow-up | Patient retention + reviews | LTV increase |
| Insurance verification | Prevent billing disputes | Avoid $500+ write-offs |
| Weekly AI insights | Better business decisions | Operational improvement |

---

## Revenue Model

| Plan | Price | Calls | Features |
|------|-------|-------|---------|
| Starter | $149/month | 200 calls | Booking + reminders |
| Growth | $299/month | 500 calls | + Recall + no-show prediction |
| Pro | $599/month | Unlimited | All features + priority support |

**Unit economics:**
- Cost per clinic: ~$30/month (Twilio + Retell + Railway + Supabase)
- Margin at Growth plan: $269/month per clinic
- Break-even: 5 clients
- Target year 1: 20 clients = $5,980/month recurring revenue

---

## Immediate Next Steps (This Week)

```
1. Twilio Console → +15755734355 → SMS webhook URL set (5 min)
2. Retell Dashboard → Phone Numbers → link +15755734355 to agent (10 min)
3. Dashboard → Setup → "Create Agent" → agent saved to DB (1 min)
4. Make 3 test calls → verify full flow → dashboard shows $450 (30 min)
5. Fix Call Logs filter tabs in code (30 min)
6. Wire Patients "Book Appointment" button to API (1 hour)
7. Start Phase 3: test recall job manually (1 hour)
```

---

_Last updated: April 27, 2026_
_Project: Bytelytic Clinic OS_
_Owner: Bytelytic (bytelytic.com)_
_Target market: Physical therapy & mental health clinics, USA_
