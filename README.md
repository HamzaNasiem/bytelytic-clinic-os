# Bytelytic Clinic OS 🏥🤖

> **AI-powered front desk operating system for small physical therapy and mental health clinics.**

The AI handles inbound patient calls 24/7, books appointments automatically, sends SMS reminders, tracks revenue, and gives the clinic owner a real-time dashboard — all without a human receptionist.

---

## 🎯 What This System Does

When a patient calls the clinic number:
1. **Retell AI Voice Agent** picks up and has a natural conversation
2. **AI extracts** the booking details from the transcript (name, date, time, type)
3. **Patient is saved** in the database automatically
4. **Appointment is created** and added to Google Calendar
5. **SMS confirmation** is sent to the patient instantly
6. **Revenue is tracked** automatically on the dashboard
7. **Reminder SMS** is sent 24 hours before the appointment automatically

The clinic owner logs into the dashboard and sees everything in real-time.

---

## 🔴 Live Demo

| Service | URL |
|---------|-----|
| **Dashboard (Frontend)** | https://dashboard-two-jade-54.vercel.app |
| **Backend API** | https://clinic-os-production.up.railway.app |
| **AI Voice Number** | +1 (575) 573-4355 |

**Login credentials for demo:**
- Email: `qamx99@gmail.com`
- Password: `Bytelytic@2025`

---

## 🛠️ Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| **Node.js + Express.js** | REST API server |
| **Supabase (PostgreSQL)** | Database + Auth |
| **Railway** | Backend cloud deployment |
| **Retell AI** | AI voice agent (handles phone calls) |
| **Twilio** | Phone number + SMS |
| **Google Calendar API** | Appointment calendar sync |
| **OpenRouter / AI** | Extract booking info from transcripts |
| **node-cron** | Background automation jobs |

### Frontend
| Technology | Purpose |
|-----------|---------|
| **React 18** | UI framework |
| **Vite** | Build tool |
| **Tailwind CSS** | Styling |
| **Recharts** | Dashboard charts |
| **Axios** | API communication |
| **Vercel** | Frontend deployment |

---

## 📁 Project Structure

```
bytelytic-clinic-os/
│
├── src/                        ← Backend (Node.js)
│   ├── server.js               ← Express app + cron jobs starter
│   ├── config/
│   │   └── env.js              ← All env vars validated here
│   ├── middleware/
│   │   ├── auth.middleware.js  ← Supabase JWT verification
│   │   └── error.middleware.js ← Global error handler
│   ├── db/
│   │   ├── client.js           ← Supabase client
│   │   └── schema.sql          ← Full PostgreSQL schema (7 tables)
│   ├── api/
│   │   ├── index.js            ← Auth routes (/auth/login, etc.)
│   │   ├── appointments/       ← Appointment CRUD
│   │   ├── patients/           ← Patient management
│   │   ├── calls/              ← Call logs
│   │   ├── dashboard/          ← Stats, revenue, timeline
│   │   ├── clinics/            ← Clinic settings + wipe
│   │   └── webhooks/
│   │       ├── retell.webhook.js   ← Receives Retell AI call events
│   │       └── twilio.webhook.js   ← Receives patient SMS replies
│   ├── services/
│   │   ├── voice.service.js    ← Core: call handling + booking logic
│   │   ├── sms.service.js      ← Send/receive SMS via Twilio
│   │   ├── ai.service.js       ← OpenRouter AI calls
│   │   ├── calendar.service.js ← Google Calendar integration
│   │   ├── revenue.service.js  ← Revenue tracking
│   │   ├── noshow.service.js   ← No-show risk prediction
│   │   ├── recall.service.js   ← Patient recall automation
│   │   ├── insurance.service.js← Insurance verification
│   │   └── followup.service.js ← Post-visit follow-ups
│   └── jobs/
│       ├── reminder.job.js     ← Hourly: 24h SMS reminders
│       ├── noshow.job.js       ← Daily: high-risk confirmation SMS
│       ├── recall.job.js       ← Daily: outbound recall calls
│       └── insurance.job.js    ← Daily: insurance verification
│
├── dashboard/                  ← Frontend (React + Vite)
│   └── src/
│       ├── pages/
│       │   ├── Login.jsx       ← Auth page
│       │   ├── Dashboard.jsx   ← Main metrics + charts
│       │   ├── Appointments.jsx← Appointment management
│       │   ├── Patients.jsx    ← Patient directory + history
│       │   ├── CallLogs.jsx    ← Call transcripts
│       │   └── Setup.jsx       ← Clinic configuration
│       ├── components/
│       │   ├── Layout.jsx      ← App shell
│       │   ├── Sidebar.jsx     ← Navigation
│       │   └── Header.jsx      ← Top bar with dropdowns
│       └── lib/
│           └── api.js          ← Axios + JWT interceptor
│
├── .env.local-dev-template     ← Copy this to .env
├── vercel.json                 ← Vercel build config
└── railway.toml                ← Railway deploy config
```

---

## 🗄️ Database Schema (7 Tables)

```
clinics
  └── patients (many)
        └── appointments (many)
              └── sms_messages (many)
        └── calls (many)
  └── revenue_events
  └── jobs (retry queue)
```

| Table | Description |
|-------|-------------|
| `clinics` | Clinic info, Twilio number, Retell agent, business hours |
| `patients` | Patient records, insurance, visit history |
| `appointments` | Bookings with status, reminders, Google Calendar ID |
| `calls` | All call logs with transcripts |
| `sms_messages` | All SMS with AI sentiment scoring |
| `jobs` | Background job retry queue |
| `revenue_events` | Revenue tracking per event type |

---

## 🚀 Local Setup (Run It Yourself)

### Prerequisites
- Node.js 18+
- A Supabase account (free tier works)
- Accounts needed for full features: Retell AI, Twilio, Google Cloud

### Step 1 — Clone & Install
```bash
git clone https://github.com/HamzaNasiem/bytelytic-clinic-os.git
cd bytelytic-clinic-os

# Install backend dependencies
npm install

# Install frontend dependencies
cd dashboard && npm install && cd ..
```

### Step 2 — Set Up Supabase
1. Go to [supabase.com](https://supabase.com) → Create a new project
2. Go to **SQL Editor** → Run the entire contents of `src/db/schema.sql`
3. Go to **Settings → API** → Copy your:
   - Project URL
   - `service_role` key (secret)
   - `anon` key (public)
4. Go to **Authentication → Users** → Create a user with your email/password
5. Go to **Table Editor → clinics** → Insert a row with your clinic info and set `owner_email` to your Supabase user email

### Step 3 — Configure Environment Variables
```bash
cp .env.local-dev-template .env
```

Open `.env` and fill in:
```env
# Required to start:
SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
SUPABASE_SERVICE_KEY=your_service_role_key
SUPABASE_ANON_KEY=your_anon_key

# For AI features (get from retell.ai):
RETELL_API_KEY=key_xxx

# For SMS (get from console.twilio.com):
TWILIO_ACCOUNT_SID=ACxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxx
TWILIO_DEFAULT_NUMBER=+1xxxxxxxxxx

# For Google Calendar (get from console.cloud.google.com):
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxx
GOOGLE_REDIRECT_URI=http://localhost:3000/auth/google/callback

# For AI transcript parsing (get from openrouter.ai):
OPENROUTER_API_KEY=sk-or-v1-xxx

# App URLs
API_BASE_URL=http://localhost:3000
DASHBOARD_URL=http://localhost:5173
WEBHOOK_BASE_URL=http://localhost:3000
```

### Step 4 — Run Backend
```bash
npm run dev
# Server starts on http://localhost:3000
```

### Step 5 — Run Frontend
```bash
cd dashboard
npm run dev
# Dashboard opens at http://localhost:5173
```

### Step 6 — Login
Go to `http://localhost:5173` → Login with your Supabase user email/password.

---

## ☁️ Production Deployment

### Backend → Railway
1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select this repo
3. Set **Root Directory** to `/` (not dashboard)
4. Add all env vars from `.env` in Railway's Variables section
5. Update these for production:
   ```
   API_BASE_URL=https://your-railway-url.up.railway.app
   WEBHOOK_BASE_URL=https://your-railway-url.up.railway.app
   DASHBOARD_URL=https://your-vercel-url.vercel.app
   ```

### Frontend → Vercel
1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Set **Root Directory** to `dashboard`
3. Add environment variable:
   ```
   VITE_API_URL=https://your-railway-url.up.railway.app
   ```
4. Deploy

### Twilio Webhook Setup
In Twilio Console → Phone Numbers → Your number → Messaging:
```
Webhook URL: https://your-railway-url.up.railway.app/webhooks/twilio/sms
HTTP Method: POST
```

### Retell AI Setup
1. Go to [retell.ai](https://retell.ai) → Dashboard → Setup page
2. Click "Create Agent" button (it calls the API automatically)
3. Link your Twilio number to the agent in Retell dashboard

---

## 🔄 How The AI Flow Works

```
Patient calls +1 (575) 573-4355
         ↓
Twilio routes call to Retell AI
         ↓
Retell AI Voice Agent handles conversation
("Hi! I'd like to book an appointment for Tuesday at 2pm")
         ↓
Call ends → Retell sends webhook to Railway
         ↓
voice.service.js processes the event:
  1. OpenRouter AI reads transcript
  2. Extracts: name, date, time, appointment_type
  3. Upserts patient in DB
  4. Creates appointment in DB
  5. Creates Google Calendar event
  6. Sends SMS confirmation to patient
  7. Records revenue_event
         ↓
Dashboard updates in real-time
         ↓
Reminder SMS sent 24h before appointment (auto cron job)
         ↓
Patient replies "CONFIRM" → appointment status updated
```

---

## 📊 Dashboard Features

| Page | What You See |
|------|-------------|
| **Dashboard** | 6 metric cards, revenue chart, today's schedule |
| **Appointments** | All bookings, filter by date, confirm/cancel/no-show |
| **Patients** | Directory, search, full patient history + comms log |
| **Call Logs** | All calls with duration, type, full transcript |
| **Setup** | System health, create agent, configure clinic |

---

## 🔒 Security

- All API endpoints protected with Supabase JWT
- Retell webhooks verified with HMAC-SHA256
- Twilio webhooks verified with Twilio signature
- Multi-tenant: every table has `clinic_id` (data isolation)
- No secrets in code — all via environment variables

---

## 📦 API Endpoints Reference

```
POST   /auth/login                    Login → returns JWT
GET    /auth/me                       Current user info
GET    /auth/google                   Google OAuth redirect

GET    /dashboard/stats               Metrics (patients, calls, revenue)
GET    /dashboard/revenue             Month-over-month revenue
GET    /dashboard/timeline            Call volume chart data

GET    /appointments?range=today|7days|all
GET    /appointments/today
PUT    /appointments/:id              Update status/notes

GET    /patients?search=name
GET    /patients/:id                  Detail + full history
POST   /patients                      Create patient

GET    /calls                         Call logs
GET    /calls/:id                     Single call

GET    /clinics/:id                   Clinic info
PUT    /clinics/:id/twilio-number     Save Twilio number
POST   /clinics/:id/create-agent      Create Retell AI agent
DELETE /clinics/:id/wipe              Delete all data

POST   /webhooks/retell               Retell call events
POST   /webhooks/twilio/sms           Patient SMS replies
POST   /webhooks/twilio/status        SMS delivery status
```

---

## 🤝 Contributing

This project is a portfolio/client demo project. For questions or collaboration, contact via GitHub issues.

---

## 📄 License

MIT License — free to use, modify, and deploy.

---

*Built with ❤️ by [HamzaNasiem](https://github.com/HamzaNasiem) — Bytelytic*
