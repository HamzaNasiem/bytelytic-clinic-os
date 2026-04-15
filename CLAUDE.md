# CLAUDE.md — Bytelytic Clinic OS

## WHO YOU ARE BUILDING FOR

You are building **Bytelytic Clinic OS** — a complete AI-powered front desk
operating system for small physical therapy and mental health clinics in the USA.
The product is sold as a monthly service by Bytelytic (bytelytic.com) to clinic
owners who are not technical. They pay $450–$800/month for a system that replaces
their human receptionist entirely.

The developer (owner of Bytelytic) is a solo full-stack developer in Pakistan
building this alone. Every architectural decision must favor simplicity,
stability, and the ability to be maintained by one person. When in doubt, pick
the simpler approach.

---

## WHAT THE PRODUCT DOES

A clinic owner signs up. Bytelytic gives them:

1. A US phone number that their patients call
2. An AI voice agent that answers every call 24/7, books appointments,
   handles questions, sends reminders
3. Automated patient recall — AI calls patients who haven't visited in
   30/60/90 days
4. No-show prediction + auto waitlist filling
5. Post-visit SMS follow-up to patients
6. Insurance pre-verification 48h before appointments
7. A dashboard where the doctor sees revenue recovered, calls handled,
   appointments booked — all by AI

The doctor does nothing. They just check the dashboard.

---

## TECH STACK — DO NOT DEVIATE

```
Backend:     Node.js 20 + Express 4
Language:    JavaScript (not TypeScript — keep it simple)
Database:    PostgreSQL via Supabase (free tier to start)
ORM:         None — raw SQL queries using supabase-js client
Jobs:        node-cron (built-in, no Redis needed until 50+ clients)
Voice AI:    Retell AI (API + webhooks)
Telephony:   Twilio (phone numbers, SMS, outbound calls)
Calendar:    Google Calendar API v3
AI/LLM:      Anthropic Claude API (claude-sonnet-4-6) for recall logic,
             post-visit analysis, no-show prediction
Auth:        Supabase Auth (email/password for clinic dashboard login)
Frontend:    React 18 + Vite + Tailwind CSS
Hosting:     Railway.app (backend) + Vercel (dashboard)
Env:         dotenv
HTTP client: axios
```

**Never suggest**: TypeScript, Prisma, GraphQL, Redis (until explicitly asked),
Docker (until scale demands it), microservices, Next.js, or any framework
not listed above.

---

## SYSTEM ARCHITECTURE — 5 LAYERS

Every request in this system flows through exactly 5 layers in sequence.
Understand this before writing any code.

```
┌─────────────────────────────────────────────────────────────┐
│  LAYER 1 — PATIENT ENTRY  (how patients reach the system)   │
│                                                             │
│  Phone call          SMS / inbound      Cron trigger        │
│  Twilio → Retell AI  Twilio webhook     node-cron jobs      │
│  (voice)             (text)             (recall, reminders) │
│                                                             │
│  Web chat widget     Doctor dashboard                       │
│  React widget on     React app          ←  read-only        │
│  clinic website      (Vercel)                               │
└────────────────────────────┬────────────────────────────────┘
                             │ HTTP / webhook
┌────────────────────────────▼────────────────────────────────┐
│  LAYER 2 — API LAYER  (Express.js — ONE server)             │
│                                                             │
│  POST /webhooks/retell      ← Retell sends call events      │
│  POST /webhooks/twilio/sms  ← Twilio sends inbound SMS      │
│  GET  /dashboard/stats      ← Dashboard reads data          │
│  POST /appointments         ← Manu al booking                │
│  GET  /patients             ← Patient list                  │
│  POST /auth/login           ← Clinic login                  │
└────────────────────────────┬────────────────────────────────┘
                             │ function calls
┌────────────────────────────▼────────────────────────────────┐
│  LAYER 3 — SERVICES  (business logic — src/services/)       │
│                                                             │
│  voice.service     sms.service     calendar.service         │
│  Retell API calls  Twilio SMS      Google Calendar          │
│                                                             │
│  recall.service    noshow.service  revenue.service          │
│  Outbound calls    Predict + fill  ROI tracking             │
│                                                             │
│  followup.service  insurance.service                        │
│  Post-visit SMS    Pre-visit verify                         │
└────────────────────────────┬────────────────────────────────┘
                             │ scheduled triggers
┌────────────────────────────▼────────────────────────────────┐
│  LAYER 4 — BACKGROUND JOBS  (node-cron — src/jobs/)         │
│                                                             │
│  reminder.job  → every 1hr  → send 24h appointment SMS      │
│  recall.job    → daily 8pm  → call patients not seen 30d+   │
│  insurance.job → daily 9am  → verify insurance 48h before   │
│  noshow.job    → daily 6pm  → predict + fill empty slots    │
│                                                             │
│  All jobs: create jobs table entry first → then process     │
│  If fail: retry up to 3x automatically                      │
└────────────────────────────┬────────────────────────────────┘
                             │ SQL queries
┌────────────────────────────▼────────────────────────────────┐
│  LAYER 5 — DATABASE  (PostgreSQL via Supabase)              │
│                                                             │
│  clinics     patients     appointments    calls             │
│  sms_messages jobs        revenue_events                    │
│                                                             │
│  RULE: clinic_id on EVERY table — multi-tenant from day 1   │
└─────────────────────────────────────────────────────────────┘
```

---

## DATA FLOW — WHAT HAPPENS STEP BY STEP

### When patient calls (most common flow):
```
1. Patient dials clinic Twilio number
2. Twilio forwards call to Retell AI agent
3. Retell AI talks to patient, collects: name, phone, date, time, reason
4. Retell sends webhook → POST /webhooks/retell (call_ended event)
5. retell.webhook.js calls voice.service.handleCallEvent()
6. voice.service uses Claude API to extract booking details from transcript
7. calendar.service.getAvailableSlots() — checks Google Calendar
8. calendar.service.createEvent() — books the slot
9. DB: insert into appointments, upsert into patients, insert into calls
10. sms.service.send() — confirmation SMS to patient
11. revenue_events insert: type='missed_call_recovered', amount=$150
12. Dashboard updates automatically next refresh
```

### When recall job runs (daily 8pm):
```
1. recall.job triggers via node-cron
2. Loops through all active clinics
3. recall.service.getRecallCandidates() — patients with last_visit 30/60/90d ago
4. For each candidate: insert into jobs table (status=pending)
5. voice.service.makeOutboundCall() — Retell calls patient
6. Patient answers → AI says "Hi [name], calling from [clinic]..."
7. If patient books → appointment created → revenue_event inserted
8. jobs table updated: status=done or failed (retry next run if failed)
```

### Web chat widget (on clinic website):
```
Setup: Claude Code generates a small React widget (single JS file)
Clinic embeds: <script src="https://app.bytelytic.com/widget.js?clinicId=xxx">
Patient types message → POST /api/chat (clinicId in query param)
Backend: Claude API responds with booking info or answers FAQ
If booking intent detected → redirect to booking flow via SMS confirmation
No Retell needed for chat — pure Claude API text responses
```

---

## 3 CRITICAL RULES — READ BEFORE WRITING ANY CODE

These three rules prevent 90% of bugs and crashes:

### Rule 1 — clinic_id on every table, every query
```javascript
// WRONG — security hole, data leak between clinics
const appts = await supabase.from('appointments').select('*');

// CORRECT — always filter by clinic
const appts = await supabase
  .from('appointments')
  .select('*')
  .eq('clinic_id', clinicId);
```

### Rule 2 — jobs table before any async action
```javascript
// WRONG — if server crashes mid-send, reminder is lost forever
await sms.service.sendReminder(appointmentId);

// CORRECT — save intent first, process after
await supabase.from('jobs').insert({
  clinic_id: clinicId,
  job_type: 'send_reminder',
  payload: { appointmentId },
  run_at: new Date()
});
await processJobQueue('send_reminder'); // retries if this fails
```

### Rule 3 — try/catch in every service, never crash the whole server
```javascript
// WRONG — one bad clinic crashes jobs for all 50 clinics
for (const clinic of clinics) {
  await processRecall(clinic.id); // throws → loop stops
}

// CORRECT — isolate each clinic
for (const clinic of clinics) {
  try {
    await processRecall(clinic.id);
  } catch (e) {
    console.error(`[recall] failed clinic=${clinic.id}`, e.message);
    // continue — other clinics still run
  }
}
```

---

## PROJECT FOLDER STRUCTURE

Build exactly this structure. Do not add extra folders without being asked.

```
bytelytic-clinic-os/
│
├── src/
│   ├── server.js                    # Express app entry point
│   ├── config/
│   │   └── env.js                   # All env vars validated here
│   │
│   ├── db/
│   │   ├── client.js                # Supabase client singleton
│   │   └── schema.sql               # Full PostgreSQL schema
│   │
│   ├── api/
│   │   ├── index.js                 # Router — mounts all routes
│   │   ├── webhooks/
│   │   │   ├── retell.webhook.js    # Retell AI call events
│   │   │   └── twilio.webhook.js    # SMS inbound events
│   │   ├── clinics/
│   │   │   └── clinics.routes.js    # CRUD for clinic management
│   │   ├── patients/
│   │   │   └── patients.routes.js   # Patient list, search, update
│   │   ├── appointments/
│   │   │   └── appointments.routes.js
│   │   └── dashboard/
│   │       └── dashboard.routes.js  # Stats, revenue, call logs
│   │
│   ├── services/
│   │   ├── voice.service.js         # Retell AI — agent config, call mgmt
│   │   ├── sms.service.js           # Twilio SMS send/receive
│   │   ├── calendar.service.js      # Google Calendar read/write
│   │   ├── recall.service.js        # Patient recall outbound call logic
│   │   ├── noshow.service.js        # No-show prediction + waitlist fill
│   │   ├── followup.service.js      # Post-visit SMS follow-up
│   │   ├── insurance.service.js     # Pre-visit insurance verification SMS
│   │   └── revenue.service.js       # ROI calculation for dashboard
│   │
│   ├── jobs/
│   │   ├── reminder.job.js          # Runs every hour — sends 24h reminders
│   │   ├── recall.job.js            # Runs daily at 8pm — recall patients
│   │   ├── insurance.job.js         # Runs daily at 9am — 48h insurance check
│   │   └── noshow.job.js            # Runs daily at 6pm — predict + fill
│   │
│   └── middleware/
│       ├── auth.middleware.js        # Verify Supabase JWT for API calls
│       └── error.middleware.js       # Global error handler
│
├── dashboard/                        # React app (separate Vite project)
│   ├── src/
│   │   ├── main.jsx
│   │   ├── App.jsx
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Dashboard.jsx         # Main overview + revenue stats
│   │   │   ├── Appointments.jsx      # Today's + upcoming appointments
│   │   │   ├── Patients.jsx          # Patient list + history
│   │   │   └── CallLogs.jsx          # All AI call history
│   │   ├── components/
│   │   │   ├── RevenueCard.jsx       # Shows $ recovered by AI
│   │   │   ├── CallStats.jsx         # Answer rate, call volume
│   │   │   └── AppointmentTable.jsx
│   │   └── lib/
│   │       └── api.js                # Axios instance with auth header
│   └── package.json
│
├── .env                              # Never commit this
├── .env.example                      # Commit this — all keys listed
├── package.json
└── README.md
```

---

## DATABASE SCHEMA — COMPLETE

Always use this exact schema. Never modify column names once set.
Every table MUST have `clinic_id` — this is the multi-tenancy key.

```sql
-- clinics.sql
CREATE TABLE clinics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_email TEXT UNIQUE NOT NULL,
  phone_number TEXT,                    -- Twilio number assigned to clinic
  twilio_number TEXT,                   -- same as above, kept for clarity
  retell_agent_id TEXT,                 -- Retell AI agent ID for this clinic
  google_calendar_id TEXT,              -- Google Calendar ID
  google_refresh_token TEXT,            -- OAuth refresh token for calendar
  timezone TEXT DEFAULT 'America/Chicago',
  business_hours JSONB DEFAULT '{"mon":"08:00-18:00","tue":"08:00-18:00","wed":"08:00-18:00","thu":"08:00-18:00","fri":"08:00-18:00"}',
  appointment_types JSONB DEFAULT '[{"name":"Initial Eval","duration":60},{"name":"Follow-up","duration":30}]',
  recall_days INTEGER[] DEFAULT '{30,60,90}',
  monthly_revenue_per_visit INTEGER DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- patients.sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  date_of_birth DATE,
  insurance_provider TEXT,
  insurance_member_id TEXT,
  last_visit_date DATE,
  total_visits INTEGER DEFAULT 0,
  no_show_count INTEGER DEFAULT 0,
  preferred_time TEXT,                  -- "morning", "afternoon", "evening"
  notes TEXT,
  recall_opted_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(clinic_id, phone)
);

-- appointments.sql
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  patient_name TEXT NOT NULL,           -- denormalized for speed
  patient_phone TEXT NOT NULL,
  appointment_type TEXT NOT NULL,
  datetime TIMESTAMPTZ NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  google_event_id TEXT,                 -- Google Calendar event ID
  status TEXT DEFAULT 'scheduled'
    CHECK (status IN ('scheduled','confirmed','completed','cancelled','no_show')),
  confirmed_at TIMESTAMPTZ,
  reminder_sent BOOLEAN DEFAULT false,
  insurance_verified BOOLEAN DEFAULT false,
  revenue_amount INTEGER,               -- in USD cents
  booked_by TEXT DEFAULT 'ai'
    CHECK (booked_by IN ('ai','staff','patient')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- calls.sql
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  retell_call_id TEXT UNIQUE,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  call_type TEXT CHECK (call_type IN ('booking','recall','reminder','followup','insurance','general')),
  from_number TEXT,
  to_number TEXT,
  duration_seconds INTEGER,
  status TEXT CHECK (status IN ('initiated','ongoing','ended','failed')),
  outcome TEXT CHECK (outcome IN ('booked','rescheduled','cancelled','no_answer','callback','declined','completed')),
  appointment_id UUID REFERENCES appointments(id),
  transcript TEXT,
  recording_url TEXT,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- sms_messages.sql
CREATE TABLE sms_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id),
  twilio_sid TEXT UNIQUE,
  direction TEXT CHECK (direction IN ('inbound','outbound')),
  from_number TEXT,
  to_number TEXT,
  body TEXT NOT NULL,
  sms_type TEXT CHECK (sms_type IN ('reminder','recall','followup','insurance','confirmation','general')),
  appointment_id UUID REFERENCES appointments(id),
  status TEXT DEFAULT 'sent',
  patient_reply TEXT,
  reply_sentiment TEXT CHECK (reply_sentiment IN ('positive','negative','neutral','concern')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- jobs.sql  (retry queue — critical for stability)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  job_type TEXT NOT NULL,               -- 'send_reminder','recall_call','insurance_check'
  payload JSONB NOT NULL,               -- all data needed to run the job
  status TEXT DEFAULT 'pending'
    CHECK (status IN ('pending','processing','done','failed')),
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  error_message TEXT,
  run_at TIMESTAMPTZ DEFAULT NOW(),     -- when to run (for scheduling)
  ran_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- revenue_events.sql
CREATE TABLE revenue_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
  event_type TEXT CHECK (event_type IN (
    'missed_call_recovered',
    'recall_booked',
    'noshow_slot_filled',
    'after_hours_booked',
    'appointment_completed'
  )),
  amount_cents INTEGER NOT NULL,
  appointment_id UUID REFERENCES appointments(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_appointments_clinic_datetime ON appointments(clinic_id, datetime);
CREATE INDEX idx_appointments_status ON appointments(clinic_id, status);
CREATE INDEX idx_patients_clinic_phone ON patients(clinic_id, phone);
CREATE INDEX idx_patients_last_visit ON patients(clinic_id, last_visit_date);
CREATE INDEX idx_calls_clinic ON calls(clinic_id, created_at DESC);
CREATE INDEX idx_jobs_pending ON jobs(status, run_at) WHERE status = 'pending';
CREATE INDEX idx_revenue_events_clinic ON revenue_events(clinic_id, created_at);
```

---

## ENVIRONMENT VARIABLES

`.env.example` must contain exactly these. In `src/config/env.js`, validate
that all required vars exist on startup — crash immediately if any are missing.

```bash
# Server
PORT=3000
NODE_ENV=development

# Supabase
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_KEY=eyJ...              # service_role key (not anon)
SUPABASE_ANON_KEY=eyJ...                 # for dashboard auth

# Retell AI
RETELL_API_KEY=key_...
RETELL_WEBHOOK_SECRET=...                # verify webhook signatures

# Twilio
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_DEFAULT_NUMBER=+1...             # fallback number

# Google Calendar
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=https://api.bytelytic.com/auth/google/callback

# Anthropic (Claude API for AI logic)
ANTHROPIC_API_KEY=sk-ant-...

# App
API_BASE_URL=https://api.bytelytic.com
DASHBOARD_URL=https://app.bytelytic.com
WEBHOOK_BASE_URL=https://api.bytelytic.com
```

---

## API ROUTES — COMPLETE LIST

### Webhooks (no auth — verified by signature)
```
POST /webhooks/retell          # Retell call events
POST /webhooks/twilio/sms      # Inbound SMS from patients
POST /webhooks/twilio/status   # SMS delivery status
```

### Auth
```
POST /auth/login               # Supabase email/password → JWT
POST /auth/google/callback     # Google OAuth for calendar
GET  /auth/me                  # Current clinic info
```

### Dashboard (requires auth)
```
GET /dashboard/stats           # Overview: calls, bookings, revenue this month
GET /dashboard/revenue         # Revenue recovered breakdown by type
GET /dashboard/timeline        # Daily activity last 30 days
```

### Clinics (admin only initially)
```
POST /clinics                  # Onboard new clinic
GET  /clinics/:id              # Get clinic settings
PUT  /clinics/:id              # Update settings, hours, etc
```

### Patients
```
GET  /patients                 # List all patients (with pagination)
GET  /patients/:id             # Single patient + visit history
POST /patients                 # Create patient manually
PUT  /patients/:id             # Update patient info
```

### Appointments
```
GET  /appointments             # List (filter by date, status)
POST /appointments             # Manual booking by staff
PUT  /appointments/:id         # Update (confirm, cancel, no-show)
GET  /appointments/today       # Today's schedule
```

### Calls
```
GET  /calls                    # Call log with transcript
GET  /calls/:id                # Single call detail
```

---

## SERVICES — BEHAVIOR SPECIFICATION

### voice.service.js
- `createAgent(clinicId)` — create Retell agent using clinic DB settings, save agent ID
- `handleCallEvent(event)` — on call_ended: extract booking from transcript via Claude API,
  upsert patient, create appointment + revenue_event, send confirmation SMS
- `makeOutboundCall(clinicId, phone, purpose, context)` — outbound via Retell

### sms.service.js
- `send(clinicId, toPhone, body, type, appointmentId)` — Twilio send + save to sms_messages
- `handleInbound(from, body, clinicId)` — Claude API detects intent, updates appointment status
- `sendReminder(appointmentId)` — 24h before reminder
- `sendFollowup(appointmentId)` — 2 days after visit check-in

### calendar.service.js
- `getAvailableSlots(clinicId, date, durationMinutes)` — open slots vs business hours
- `createEvent(clinicId, appointment)` — Google Calendar event, returns event ID
- `cancelEvent(clinicId, googleEventId)` — removes event
- Per-clinic OAuth via clinics.google_refresh_token

### recall.service.js
- `getRecallCandidates(clinicId)` — patients with last_visit exactly 30/60/90d ago, not opted out
- `initiateRecall(clinicId, patientId)` — jobs table first, then Retell outbound call
- `processRecallOutcome(callId, outcome)` — booked → revenue_event type='recall_booked'

### noshow.service.js
- `predictNoshows(clinicId, date)` — Claude API scores each appointment by risk
- `fillFromWaitlist(clinicId, slot)` — on cancellation, call next waitlist patient

### revenue.service.js
- `getMonthlyStats(clinicId, month, year)` — aggregate revenue_events, return breakdown + MoM
- `recordEvent(clinicId, type, cents, appointmentId)` — always call when AI books anything

---

## JOBS — CRON SCHEDULE AND BEHAVIOR

All jobs follow this pattern — never run logic directly, create a job record
first, then process:

```javascript
// CORRECT pattern for every job
async function processReminders() {
  const due = await getDueReminders();        // find appointments needing reminder
  for (const appt of due) {
    await createJob('send_reminder', appt);   // save to jobs table first
  }
  await processJobQueue('send_reminder');     // then process with retry
}
```

### reminder.job.js
- Schedule: `0 * * * *` (every hour)
- Logic: Find all appointments in next 24 hours where reminder_sent = false.
  Send SMS reminder. Mark reminder_sent = true.

### recall.job.js
- Schedule: `0 20 * * *` (daily 8pm clinic local time — use UTC+offset)
- Logic: For each active clinic, get recall candidates.
  Make max 20 outbound calls per clinic per day to avoid spam flags.

### insurance.job.js
- Schedule: `0 9 * * *` (daily 9am)
- Logic: Find appointments in next 48 hours where insurance_verified = false
  and patient has insurance_provider set.
  Send SMS asking patient to confirm insurance is still active.

### noshow.job.js
- Schedule: `0 18 * * *` (daily 6pm)
- Logic: Get tomorrow's appointments. Run noshow predictor.
  For top 3 high-risk patients, send extra confirmation SMS.
  Flag them in DB so staff sees risk indicator in dashboard.

---

## RETELL AI AGENT — SYSTEM PROMPT TEMPLATE

Use in voice.service.js createAgent(). Replace {{variables}} from DB.

```
You are the AI receptionist for {{clinic_name}}, a {{clinic_type}} clinic
at {{clinic_address}}. Warm, professional, efficient.

Tasks: Book/reschedule/cancel appointments. Answer hours, location, insurance.
New patients: collect full name, DOB, phone, insurance provider.
Always confirm date + time + type before finalizing. Tell patient SMS follows.

Clinic hours: {{business_hours}}
Appointment types: {{appointment_types}}

Rules:
- Never give medical advice — say "Dr. {{doctor_name}} will address that"
- Emergency: give {{emergency_number}} immediately
- Call book_appointment function when all booking details collected
```

---

## DASHBOARD — WHAT TO BUILD IN REACT

Dashboard has four pages. Build in this order — stop after Dashboard.jsx
until backend is ready.

### 1. Login.jsx
Simple email/password form. Calls Supabase Auth. Saves JWT to localStorage.
Redirects to Dashboard on success.

### 2. Dashboard.jsx (main page — most important)
Shows 6 metric cards at top:
- "AI Recovered This Month" — dollar amount (green, large font)
- "Calls Answered" — count + percentage
- "Appointments Booked by AI" — count
- "Patients Recalled" — count
- "No-Shows Filled" — count
- "Avg Response Time" — seconds

Below cards: simple bar chart (last 14 days calls volume using Recharts).
Below chart: last 10 calls table (time, patient, outcome, duration).

### 3. Appointments.jsx
Two tabs: Today | Upcoming (7 days).
Table with: time, patient name, type, status (color coded), booked by (AI/staff).
Status badges: scheduled=blue, confirmed=green, no_show=red, cancelled=gray.
Click row to see details + call transcript.

### 4. Patients.jsx
Search bar + table. Columns: name, phone, last visit, total visits, no-show count.
Click patient to see full history: all appointments, all calls, all SMS.

---

## ERROR HANDLING RULES

Every service function must follow this exact pattern:

```javascript
async function exampleService(clinicId, data) {
  try {
    // do work
    return { success: true, data: result };
  } catch (error) {
    console.error(`[exampleService] clinicId=${clinicId}`, error.message);
    // DO NOT rethrow — log and return error so one clinic failure
    // does not crash the job runner for other clinics
    return { success: false, error: error.message };
  }
}
```

Webhook handlers must always return 200 to Retell/Twilio even on errors.
If we return 4xx/5xx, they will retry and cause duplicate bookings.

```javascript
app.post('/webhooks/retell', async (req, res) => {
  res.sendStatus(200);              // respond immediately
  await processRetellEvent(req.body); // process async after response
});
```

---

## MULTI-TENANCY RULES

1. Every database query MUST include `clinic_id` in WHERE clause.
   Never query without it — it is a security issue.

2. Auth middleware extracts clinicId from JWT and attaches to `req.clinicId`.
   Every route uses `req.clinicId` — never trust a clinicId from req.body.

3. When a job runs, it loops through all active clinics independently:
   ```javascript
   const clinics = await getActiveClinics();
   for (const clinic of clinics) {
     try {
       await processForClinic(clinic.id);
     } catch (e) {
       console.error(`Job failed for clinic ${clinic.id}:`, e.message);
       // continue to next clinic
     }
   }
   ```

---

## PHASES — BUILD ORDER

### Phase 1 — MVP (Week 1–2) — Working demo
```
1. src/config/env.js         validate all env vars on startup
2. src/db/schema.sql         create all tables in Supabase
3. calendar.service.js       getAvailableSlots + createEvent
4. voice.service.js          createAgent + handleCallEvent
5. webhooks/retell.js        receive call events
6. src/server.js             wire everything, deploy Railway
```
Test: Call Twilio number → AI answers → appointment booked → Google Calendar updated

### Phase 2 — SMS + Dashboard (Week 3–4)
```
1. sms.service.js            send + handle inbound replies
2. webhooks/twilio.js        receive inbound SMS
3. jobs/reminder.job.js      24h appointment reminder
4. dashboard/Login.jsx       Supabase auth
5. dashboard/Dashboard.jsx   revenue cards + call log
6. api/dashboard/routes.js   /stats /revenue /timeline
```
Test: Appointment booked → 24h SMS reminder sent → doctor sees in dashboard

### Phase 3 — WOW Features (Week 5–7)
```
1. recall.service.js + recall.job.js       patients 30/60/90d recall
2. noshow.service.js + noshow.job.js       predict + fill empty slots
3. followup.service.js                     post-visit SMS + sentiment
4. insurance.service.js + insurance.job.js 48h pre-verify SMS
```
Test: Set patient last_visit = 31 days ago → run recall job → outbound call made

### Phase 4 — Multi-tenant (Month 2)
```
1. api/clinics/routes.js     onboard new clinics
2. auth.middleware.js        per-clinic JWT from Supabase
3. dashboard remaining pages Patients.jsx + Appointments.jsx
4. voice.service.js update   separate Retell agent per clinic
```
Test: 2 clinics live → calls isolated → data isolated → dashboards separate

### Phase 5 — Production hardening (Month 3)
```
- AWS RDS migration (same SQL — only SUPABASE_URL changes)
- Better Uptime monitoring (free — ping /health every 5 min)
- Resend.com daily email reports to clinic owners
- Google Reviews automation after positive post-visit sentiment
```

---

## WHEN CLAUDE CODE IS ASKED TO BUILD SOMETHING

Follow this order every time:
1. Check if schema.sql needs a new column — add it first
2. Write the service function with try/catch
3. Write the route that calls the service
4. Write the job if automation is needed
5. Add the route to `src/api/index.js`
6. Test with a curl command before declaring done

Never skip step 1. Schema changes later break everything.

---

## THINGS NEVER TO DO

- Never store API keys in code — always use process.env
- Never query DB without clinic_id in WHERE clause
- Never return 4xx/5xx to Retell or Twilio webhooks
- Never add TypeScript — keep pure JavaScript
- Never use Prisma or any ORM — raw supabase-js queries only
- Never create separate servers for separate features — one server
- Never deploy dashboard and backend to same Railway service — keep separate
- Never give medical advice in bot prompts — legal liability
- Never log patient PHI (names, DOB, phone) to console in production
- Never commit .env file — always check .gitignore first

---

## DEPLOYMENT CHECKLIST

Before going live with first client:

```
[ ] All env vars set in Railway dashboard
[ ] Supabase RLS (Row Level Security) disabled — we handle auth in code
[ ] Retell webhook URL set to: https://api.bytelytic.com/webhooks/retell
[ ] Twilio webhook URL set to: https://api.bytelytic.com/webhooks/twilio/sms
[ ] Google Calendar OAuth completed for clinic
[ ] Test call end to end: call → AI answers → appointment booked → SMS reminder → shows in dashboard
[ ] /health endpoint returns 200
[ ] Error logs going to Railway console
[ ] BAA signed with clinic owner (HIPAA requirement)
```

---

## QUICK REFERENCE — KEY PACKAGES

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0",
    "twilio": "^5.0.0",
    "retell-sdk": "^4.0.0",
    "googleapis": "^140.0.0",
    "@anthropic-ai/sdk": "^0.36.0",
    "node-cron": "^3.0.3",
    "axios": "^1.6.0",
    "dotenv": "^16.4.0",
    "cors": "^2.8.5",
    "morgan": "^1.10.0"
  }
}
```

---

*CLAUDE.md last updated: April 2026*
*Project: Bytelytic Clinic OS*
*Owner: Bytelytic (bytelytic.com)*
*Contact: team@bytelytic.com*