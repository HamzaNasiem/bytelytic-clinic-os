# Bytelytic Clinic OS — Complete Project Roadmap

**Product:** AI-powered front desk system for physical therapy & mental health clinics (USA)
**Business Model:** $450–$800/month per clinic — replaces human receptionist entirely
**Built by:** Bytelytic (bytelytic.com) — solo developer product

---

## What This System Does

A clinic owner signs up with Bytelytic. We give them:

1. A US phone number their patients call
2. An AI voice agent that answers 24/7, books appointments, handles questions
3. Automated patient recall — AI calls patients who haven't visited in 30/60/90 days
4. No-show prediction + auto waitlist filling
5. Post-visit SMS follow-up to patients
6. Insurance pre-verification 48 hours before appointments
7. A dashboard where the doctor sees everything — calls handled, appointments booked, revenue recovered

**The doctor does nothing. They just check the dashboard.**

---

## Tech Stack

| Layer            | Technology                                   |
| ---------------- | -------------------------------------------- |
| Backend          | Node.js 20 + Express 4                       |
| Language         | JavaScript                                   |
| Database         | PostgreSQL via Supabase                      |
| Voice AI         | Retell AI                                    |
| Telephony        | Twilio (phone numbers + SMS)                 |
| Calendar         | Google Calendar API                          |
| AI/LLM           | OpenRouter (free models with fallback chain) |
| Frontend         | React 18 + Vite + Tailwind CSS               |
| Backend Hosting  | Railway.app                                  |
| Frontend Hosting | Vercel (planned)                             |
| Jobs             | node-cron (built-in, no Redis needed)        |

---

## System Architecture

```
Patient
  │
  ├── Phone Call (24/7)        ← Twilio number → Retell AI answers
  ├── SMS / Inbound text       ← Twilio webhook
  ├── Website Chat Widget      ← (Phase 4)
  └── Online Booking Form      ← (Phase 4)
         │
         ▼
┌─────────────────────────────────────┐
│     Bytelytic Integration Layer     │
│                                     │
│  Voice AI Logic   Booking Engine    │
│  (Retell config)  (Calendar sync)   │
│                                     │
│  Automation Flows (Reminders, etc.) │
└────────────────┬────────────────────┘
                 │
     ┌───────────┼───────────┐
     ▼           ▼           ▼
  Retell AI   Twilio     Google Cal
  (calls)     (SMS)      (appointments)
                 │
                 ▼
┌─────────────────────────────────────┐
│         Clinic Dashboard            │
│  Appointments + Calls + Analytics   │
└─────────────────────────────────────┘
                 │
                 ▼
         Doctor (read-only)
         Sirf dashboard dekhta hai
```

---

## Database Tables

```
clinics          — clinic settings, agent ID, calendar ID
patients         — patient records, visit history
appointments     — all bookings (AI + manual)
calls            — every call log with transcript
sms_messages     — all SMS sent and received
jobs             — background job queue with retry
revenue_events   — every dollar recovered by AI
```

---

---

# PHASE 1 — Core MVP

**Status: COMPLETE ✅**
**Goal:** AI answers calls → appointments appear in dashboard

### What was built:

#### Backend (Railway — live at `clinic-os-production.up.railway.app`)

- [x] `src/config/env.js` — all environment variables validated on startup
- [x] `src/db/schema.sql` — complete PostgreSQL schema (7 tables)
- [x] `src/server.js` — Express server with CORS, Morgan logging, graceful shutdown
- [x] `src/middleware/auth.middleware.js` — Supabase JWT verification
- [x] `src/middleware/error.middleware.js` — global error handler

#### Voice AI (Retell)

- [x] `src/services/voice.service.js` — Retell agent creation, call event handling
- [x] `src/api/webhooks/retell.webhook.js` — receives call events, processes async
- [x] Retell agent created and configured with clinic prompt
- [x] Twilio number `+15755734355` linked to Retell agent
- [x] Webhook URL set to Railway: `https://clinic-os-production.up.railway.app/webhooks/retell`

#### AI Booking Extraction

- [x] `src/services/ai.service.js` — OpenRouter with 6 free models + dual-key fallback
- [x] Transcript → booking details extracted via AI (name, date, time, type)
- [x] Patient upserted in DB on every call

#### Calendar Integration

- [x] `src/services/calendar.service.js` — Google Calendar read/write
- [x] Available slots checked against business hours
- [x] Appointment event created in Google Calendar automatically

#### SMS

- [x] `src/services/sms.service.js` — Twilio SMS send + DB log
- [x] Confirmation SMS sent to patient after booking

#### Dashboard API

- [x] `src/api/dashboard/dashboard.routes.js` — `/stats`, `/revenue`, `/timeline`
- [x] `src/api/appointments/appointments.routes.js`
- [x] `src/api/patients/patients.routes.js`
- [x] `src/api/calls/calls.routes.js`
- [x] `src/api/clinics/clinics.routes.js`

#### Frontend (React — running locally)

- [x] `dashboard/src/pages/Login.jsx` — Supabase auth login
- [x] `dashboard/src/pages/Dashboard.jsx` — 6 metric cards, call analytics
- [x] `dashboard/src/pages/Appointments.jsx` — today/upcoming appointments
- [x] `dashboard/src/pages/Patients.jsx` — patient list
- [x] `dashboard/src/pages/CallLogs.jsx` — call history with transcripts
- [x] `dashboard/src/lib/api.js` — axios with JWT auto-attach

### Live Test Result (April 15, 2026):

```
Test Audio call made → AI greeted → appointment booked →
Dashboard updated → SMS sent to patient ✅
```

### Login credentials:

```
URL:      http://localhost:5173
Email:    qamx99@gmail.com
Password: Bytelytic@2025
```

---

---

# PHASE 2 — Automation & Reliability

**Status: NOT STARTED**
**Goal:** System runs automatically without any manual action

### What to build:

#### 1. Appointment Reminder Job (24-hour SMS)

- **File:** `src/jobs/reminder.job.js` ← exists but untested
- **Logic:** Every hour, find appointments in next 24h where `reminder_sent = false` → send SMS → mark `reminder_sent = true`
- **Test:** Book appointment for tomorrow → wait for next hour → SMS arrives automatically
- **Why important:** Reduces no-shows by 30-40%

#### 2. Inbound SMS Reply Handling

- **File:** `src/api/webhooks/twilio.webhook.js` ← exists but untested
- **Logic:** Patient replies "CONFIRM" or "CANCEL" → update appointment status in DB → dashboard reflects change
- **Test:** Send SMS to Twilio number → DB appointment status changes

#### 3. Appointments Page — Full Test

- Test filtering by date (Today / Upcoming / Past)
- Test status badges (scheduled, confirmed, cancelled, no_show)
- Test clicking appointment to see call transcript

#### 4. Patients Page — Full Test

- Search by name/phone
- Click patient → see full history (all calls, SMS, appointments)

#### 5. Call Logs Page — Full Test

- View all calls with duration, outcome
- Click call → see full transcript

#### 6. Revenue Tracking — Verify

- Every AI booking creates a `revenue_event` in DB
- Dashboard shows accurate dollar amounts
- Test: make 3 bookings → verify `$450` shows on dashboard

#### 7. Vercel Deployment (Dashboard)

- dashboard k tamam pages ko premium cinematic best laxuary look do sb kuch clickable ho page kam krrhe ho      responsive hoto phir deploay krdo 
- Deploy dashboard 
- Doctor gets a permanent URL to check — no localhost needed
- Update CORS in Railway to allow Vercel domain

---

---

# PHASE 3 — WOW Features (AI Automation)

**Status: NOT STARTED**
**Goal:** AI proactively works for the clinic — recalls patients, predicts no-shows

### What to build:

#### 1. Patient Recall System

- **Files:** `src/services/recall.service.js`, `src/jobs/recall.job.js` ← exist but untested
- **Logic:** Every day at 8pm, find patients with `last_visit_date` = 30, 60, or 90 days ago → AI calls them → "Hi [name], we haven't seen you in a while, want to book?"
- **If they book:** appointment created, `revenue_event` type = `recall_booked`
- **Limit:** Max 20 outbound calls per clinic per day
- **Test:** Set a patient `last_visit_date = 31 days ago` → run job manually → call goes out

#### 2. No-Show Prediction

- **Files:** `src/services/noshow.service.js`, `src/jobs/noshow.job.js` ← exist but untested
- **Logic:** Every day at 6pm, score tomorrow's appointments by no-show risk (AI analysis of patient history) → send extra confirmation SMS to top 3 high-risk patients
- **Dashboard:** Show risk badge next to high-risk appointments
- **Why important:** Filling one no-show slot = $150 recovered

#### 3. Post-Visit Follow-Up SMS

- **File:** `src/services/followup.service.js` ← exists but untested
- **Logic:** 2 days after completed appointment → SMS: "How are you feeling after your visit? Reply with any concerns."
- **Sentiment analysis:** AI reads reply → flags negative sentiment for doctor review
- **DB:** `sms_messages.reply_sentiment` field already in schema

#### 4. Insurance Pre-Verification

- **Files:** `src/services/insurance.service.js`, `src/jobs/insurance.job.js` ← exist but untested
- **Logic:** 48 hours before appointment → SMS to patient: "Please confirm your insurance [provider] is still active for your visit on [date]"
- **If expired:** Flag appointment in dashboard → `insurance_verified = false`
- **Why important:** Prevents billing disputes after visit

#### 5. Waitlist Auto-Fill

- **Logic:** When appointment cancelled → automatically check if any waitlisted patient wants that slot → call them → if they confirm, slot filled
- **Revenue:** Every filled slot = `noshow_slot_filled` revenue event

---

---

# PHASE 4 — Multi-Tenant & Client Onboarding

**Status: NOT STARTED**
**Goal:** Onboard real paying clinics — each gets their own isolated system

### What to build:

#### 1. Clinic Onboarding Flow

- Admin creates new clinic via API or simple form
- System auto-creates:
  - Supabase auth user for clinic owner
  - Retell AI agent (personalized with clinic name, hours, doctor name)
  - Twilio phone number assigned to clinic
  - Google Calendar linked via OAuth
- Clinic owner gets email with dashboard login credentials

#### 2. Per-Clinic Isolation (already in schema)

- Every DB table has `clinic_id` ← already enforced
- Auth middleware already injects `req.clinicId` from JWT ← done
- Each clinic has their own Retell agent ← architecture ready

#### 3. Clinic Setup Dashboard Page

- **File:** `dashboard/src/pages/Setup.jsx` ← exists but incomplete
- Clinic owner can update:
  - Business hours (Mon-Fri times)
  - Appointment types (Initial Eval 60min, Follow-up 30min)
  - Doctor name and emergency number
  - Twilio phone number

#### 4. Google Calendar OAuth Flow

- **Already built:** `GET /auth/google` and `GET /auth/google/callback`
- Clinic owner clicks "Connect Google Calendar" in dashboard
- OAuth flow completes → `google_refresh_token` saved to clinic row
- All appointments auto-appear in their Google Calendar

#### 5. Multi-Clinic Dashboard (Admin View)

- Bytelytic admin sees all clinics in one view
- Per-clinic revenue, call volume, status
- Ability to pause/activate a clinic

#### 6. Billing Integration

- Stripe subscription — $450-$800/month per clinic
- Auto-pause if payment fails
- Invoice generation

---

---

# PHASE 5 — Production Hardening

**Status: NOT STARTED**
**Goal:** System runs reliably for real clients with zero maintenance

### What to build:

#### 1. Monitoring & Alerts

- Better Uptime (free) — ping `/health` every 5 minutes
- Alert via email/SMS if server goes down
- Railway auto-restarts on crash (already configured)

#### 2. Daily Email Reports to Clinic Owner

- Every morning: "Yesterday your AI answered X calls, booked Y appointments, recovered $Z"
- Service: Resend.com (free tier — 100 emails/day)

#### 3. Google Reviews Automation

- After positive post-visit sentiment → send SMS: "Glad your visit went well! Would you mind leaving us a Google review? [link]"
- Automates reputation management for clinic

#### 4. HIPAA Compliance Review

- Audit all logs — ensure no PHI (patient names, DOB, phone) in Railway logs
- BAA (Business Associate Agreement) signed with each clinic before go-live
- Supabase HIPAA compliance tier (if needed at scale)

#### 5. AWS Migration (Optional — at 20+ clients)

- Same SQL schema — only `SUPABASE_URL` changes
- AWS RDS PostgreSQL for better performance and compliance
- No code changes needed

#### 6. Performance Optimization

- Redis job queue (replaces node-cron at 50+ clients)
- Response caching for dashboard stats
- Rate limiting on all API endpoints

---

---

## Summary Table

| Phase | Name                     | Status      | Key Outcome                                           |
| ----- | ------------------------ | ----------- | ----------------------------------------------------- |
| 1     | Core MVP                 | ✅ COMPLETE | AI answers calls, books appointments, dashboard works |
| 2     | Automation & Reliability | 🔲 Next     | Reminders run automatically, dashboard fully tested   |
| 3     | WOW Features             | 🔲 Planned  | Recall patients, predict no-shows, follow-ups         |
| 4     | Multi-Tenant             | 🔲 Planned  | Onboard real paying clinics independently             |
| 5     | Production Hardening     | 🔲 Planned  | Monitoring, HIPAA, scale to 20+ clinics               |

---

## Business Value Per Feature

| Feature                | Value to Clinic           | Monthly Impact           |
| ---------------------- | ------------------------- | ------------------------ |
| AI answers calls 24/7  | Never miss a patient call | +$150 per recovered call |
| Auto booking           | No receptionist needed    | Save $2,500/month salary |
| 24h reminder SMS       | 30% fewer no-shows        | +$450/month per clinic   |
| Recall patients        | Bring back lost patients  | +$150 per recall booking |
| No-show prediction     | Fill empty slots          | +$150 per filled slot    |
| Post-visit follow-up   | Patient retention         | Long-term LTV increase   |
| Insurance verification | Prevent billing disputes  | Avoid $500+ write-offs   |

---

_Last updated: April 15, 2026_
_Project: Bytelytic Clinic OS_
_Owner: Bytelytic (bytelytic.com)_
