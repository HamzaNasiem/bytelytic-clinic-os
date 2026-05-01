require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function run() {
  // Use postgres directly if needed, but we don't have connection string.
  // Actually, we can just use the standard REST API if we insert dummy and it auto-creates? No.
  // We can use RPC if 'exec_sql' exists, but if not, we must manually create it via Dashboard.
  console.log('Run this in Supabase SQL editor:');
  console.log(`
CREATE TABLE IF NOT EXISTS waitlist (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id        UUID        REFERENCES clinics(id) ON DELETE CASCADE,
  patient_id       UUID        REFERENCES patients(id) ON DELETE CASCADE,
  appointment_type TEXT        NOT NULL,
  preferred_dates  JSONB       DEFAULT '[]'::jsonb,
  status           TEXT        CHECK (status IN ('pending', 'fulfilled', 'cancelled')) DEFAULT 'pending',
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);`);
}
run();
