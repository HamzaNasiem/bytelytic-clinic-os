# Bytelytic Clinic OS — Complete Product Roadmap

**Product:** AI-powered front desk operating system for physical therapy, dental & mental health clinics (USA)
**Business Model:** $299–$800/month per clinic — replaces human receptionist entirely
**Built by:** Bytelytic (bytelytic.com)
**Vision:** Every small to mid-sized clinic in America runs on Bytelytic — zero missed calls, zero no-shows, zero manual scheduling, and fully automated revenue recovery.

---

## What This System Does

A clinic owner signs up → within 10 minutes they have:

1. A dedicated US phone number patients call 24/7.
2. An AI voice agent that answers, books, reschedules, and handles FAQs with zero latency.
3. Automated 24-hour appointment reminder SMS & WhatsApp messages.
4. Patient recall — AI proactively calls patients who haven't visited in 30/60/90 days.
5. No-show prediction — flags high-risk patients, sends extra confirmations.
6. Post-visit follow-up SMS with sentiment analysis.
7. Insurance pre-verification 48h before appointments.
8. Call Routing & Human Handoff — transfers complex queries to a real human automatically.
9. A real-time cinematic dashboard showing everything — calls, bookings, revenue recovered.

**The doctor does nothing. They just check the dashboard.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20 + Express 4 |
| Database | PostgreSQL via Supabase |
| Auth | Supabase Auth (JWT) |
| Voice AI | Retell AI + ElevenLabs (Voice Cloning) |
| Telephony | Twilio (Phone numbers, SMS, Call Forwarding) |
| Multi-Channel | WhatsApp Business API + Twilio |
| Calendar | Google Calendar API + Native EMR Sync |
| AI/LLM | OpenRouter (Claude 3.5 Sonnet + GPT-4o Fallback chain) |
| Frontend | React 18 + Vite + Tailwind CSS |
| Email | Resend.com |
| Payments | Stripe (Subscriptions + Usage Billing) |
| Infrastructure | Railway.app (Backend) + Vercel (Frontend) |
| Queue/Jobs | BullMQ + Redis (Scaling background jobs) |

---

## Database Schema (7 Tables — Multi-Tenant)

```sql
clinics         — settings, Retell agent ID, calendar, billing, routing rules
patients        — records, visit history, insurance, LTV, preferences
appointments    — all bookings, statuses, reminders, calendar event ID
calls           — transcript, duration, outcome, sentiment, QA score
sms_messages    — inbound/outbound SMS, AI intent scoring
jobs            — background job retry queue
revenue_events  — every dollar recovered, categorized by event type
```

---

## System Architecture

```
Patient
  │
  ├── Phone Call 24/7          ← Twilio → Retell AI answers
  ├── SMS / WhatsApp Reply     ← Twilio webhook → intent detection
  ├── Website Chat Widget      ← (Phase 6)
  └── Outbound Marketing       ← SMS Blasts & AI Recall Calls
         │
         ▼
┌──────────────────────────────────────┐
│       Bytelytic Integration Layer    │
│                                      │
│  voice.service    booking engine     │
│  sms.service      calendar sync      │
│  ai.service       job queue          │
│  recall.service   noshow prediction  │
│  routing.service  followup.service   │
└────────────────┬─────────────────────┘
                 │
     ┌───────────┼────────────┐
     ▼           ▼            ▼
  Retell AI   Twilio      Google Cal / EMR
  (calls)   (SMS/Voice)  (appointments)
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
```

---

---

# PHASE 1 — Core MVP
**Status: ✅ COMPLETE**
**Goal:** AI answers inbound calls → appointments appear in dashboard automatically.
*Everything from database to voice agent, real-time logging, and calendar integration is live.*

---

# PHASE 2 — Automation & Reliability
**Status: 🔄 IN PROGRESS (Code: ✅ Done | Config: ⚠️ Partial)**
**Goal:** System runs background tasks automatically (Reminders, Confirmations, SMS routing).

- [x] Appointment Reminder Job (24-hour SMS)
- [x] Inbound SMS Reply Handling (CONFIRM / CANCEL intent detection)
- [x] Dashboard UI filters and state management for Appointments & Patients
- [x] Vercel & Railway environment separation for local vs production deployment
- [ ] Twilio Webhook Live Configuration (Pending final testing)

---

# PHASE 3 — WOW Automation Features
**Status: 🔄 IN PROGRESS (Recall ✅ | No-Show ✅)**
**Goal:** AI proactively works for the clinic to generate revenue.

- [x] **Patient Recall System:** Outbound AI calls to patients who haven't visited in 60+ days.
- [x] **No-Show Prediction:** Flags high-risk appointments and sends extra confirmations.
- [x] **Post-Visit Follow-Up SMS:** AI checks in 48h after visit and flags negative sentiment.
- [x] **Insurance Pre-Verification:** SMS sent 48h prior to verify active insurance.
- [ ] **Waitlist Auto-Fill:** When an appointment is cancelled, AI calls waitlisted patients to fill the slot.
- [ ] **Voice Rescheduling:** Agent handles "change my appointment" intuitively on calls.

---

# PHASE 4 — Self-Service Onboarding (SaaS Foundation)
**Status: 🔄 IN PROGRESS (UI: ✅ | Provisioning: 🔲)**
**Goal:** Any clinic can sign up, pay, and be operational in 5 minutes — zero manual intervention.

- [x] **Public Signup Wizard:** 4-step cinematic UI for clinic details, doctor info, and hours.
- [x] **Database Constraints & Error Handling:** Proper frontend validation and DB error mapping.
- [ ] **Stripe Paywall:** User must enter credit card to begin 14-day trial before provisioning starts.
- [ ] **Auto-Provisioning Engine:**
  - Backend hits Twilio API to automatically purchase a dedicated local number.
  - Backend hits Retell API to create a personalized agent, injecting clinic data into the prompt.
  - Links Twilio number to Retell agent.
- [ ] **Self-Serve Calendar OAuth:** Settings page to 1-click connect Google Calendar.
- [ ] **Welcome Sequence:** Automated Resend.com email with dashboard login and phone number.

---

# PHASE 5 — Billing & The "Managed Service" Model
**Status: 🔲 NOT STARTED**
**Goal:** Profitable B2B unit economics and usage-based billing.

- [ ] **Usage Tracking Engine:** Track precise minutes and SMS segments used per clinic.
- [ ] **Markup Billing via Stripe:**
  - Base Fee: $299/mo
  - Usage Fee: $0.20/min for calls, $0.05 per SMS.
- [ ] **Auto-Recharge:** If usage credits drop below $20, auto-charge credit card $100.
- [ ] **Twilio Number Pool Management:** Release numbers when a clinic churns.
- [ ] **Public Landing Page (bytelytic.com):** High-converting SaaS landing page with live demo widget.
- [ ] **Referral System:** Affiliate links for clinics to invite other clinics.

---

# PHASE 6 — World-Class Communication Features
**Status: 🔲 NOT STARTED**
**Goal:** Multi-channel dominance and voice customization.

- [ ] **Voice Cloning (ElevenLabs):** Allow clinics to upload a 2-minute audio clip of their real receptionist to clone their voice for the AI.
- [ ] **Call Forwarding / Human Handoff:** If the AI detects an emergency, extreme frustration, or a complex medical question, it says "Let me transfer you" and forwards the call to the doctor's cell phone.
- [ ] **Voicemail Drop:** If a patient doesn't answer an outbound recall call, the AI leaves a perfect, natural-sounding voicemail.
- [ ] **WhatsApp Integration:** Patients can text the clinic's WhatsApp number to book appointments, with the same AI handling the text conversation.
- [ ] **Outbound Marketing Blasts:** Clinic owner can select 500 patients and send an AI-personalized SMS: "Hi [Name], Dr. Smith has an opening today at 3 PM. Reply YES to grab it."

---

# PHASE 7 — Intelligence & Analytics
**Status: 🔲 NOT STARTED**
**Goal:** AI acts as a business advisor, not just a receptionist.

- [ ] **Call QA Scoring:** AI analyzes every completed transcript and scores it 1-100 based on conversion rate and empathy.
- [ ] **Smart Scheduling Suggestions:** "You have missed 15 calls this month between 12 PM - 1 PM. Consider adding an AI lunch-hour special."
- [ ] **Patient Lifetime Value (LTV):** Tracks high-value patients and prioritizes their recall calls.
- [ ] **Weekly AI Insights Email:** A natural language summary sent to the owner every Monday morning detailing revenue recovered, no-shows avoided, and actionable advice.
- [ ] **Competitor Benchmarking:** "Your no-show rate of 12% is better than the national average of 18%."

---

# PHASE 8 — Enterprise, EMRs, and Scale
**Status: 🔲 NOT STARTED**
**Goal:** Scale to 1,000+ clinics, ensure HIPAA compliance, and integrate deeply into medical systems.

- [ ] **Native EHR/EMR Sync:** Bi-directional syncing with Jane App, SimplePractice, Kareo, and Athenahealth. (Replaces the need for Google Calendar for advanced clinics).
- [ ] **Mobile App (React Native):** An iOS/Android app for the clinic owner to see live stats, listen to call recordings, and receive push notifications when VIP patients book.
- [ ] **Multi-Location Architecture:** "Clinic Groups" where one admin dashboard manages 15 different physical locations with shared or separate phone numbers.
- [ ] **White-Label Agency Portal:** Allow marketing agencies to re-sell Bytelytic Clinic OS under their own domain and logo.
- [ ] **HIPAA Compliance Hardening:** BAA agreements, RLS data isolation, 7-year data retention, and strict audit logs.
- [ ] **Redis Job Queue (BullMQ):** Replace node-cron with robust Redis queues for handling 10,000+ daily SMS/Calls without failure.

---

## Unit Economics & Revenue Model

| Plan | Base Price | Margins | Target Audience |
|------|------------|---------|-----------------|
| Starter | $199/mo | Base + Usage Arbitrage | Solo practitioners, small therapists |
| Growth | $399/mo | Base + Usage Arbitrage | Mid-sized dental/physical therapy |
| Enterprise | $799/mo | Premium + Setup Fee | Multi-location clinic groups |

**Arbitrage Model (Done-For-You SaaS):**
The clinic never touches Twilio or Retell. Bytelytic pays the wholesale cost (~$0.10/min) and bills the clinic the retail cost (~$0.20/min), pocketing the difference.

---

## Immediate Next Steps (This Week)

1. Twilio Console → Wire Webhook URL to production backend.
2. Build Stripe Subscription Paywall in the Signup Flow.
3. Build the Auto-Provisioning Engine (Backend automatically buys Twilio number and creates Retell Agent via API).
4. Do an end-to-end live test: Sign up, pay with test card, call the newly auto-generated phone number.
