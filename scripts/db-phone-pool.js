require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Setting up phone_pool table...");

  // Since we can't run raw DDL via the JS client easily without RPC,
  // we will just insert a dummy number. If the table doesn't exist, it will throw an error,
  // in which case we will tell the user to run the SQL in their Supabase dashboard.

  try {
    console.log("Attempting to seed dummy Twilio number: +12345678900");
    const { error } = await supabase.from('phone_pool').upsert({
      phone_number: '+12345678900',
      is_assigned: false
    }, { onConflict: 'phone_number' });

    if (error) {
      if (error.code === '42P01') {
        console.error("\n❌ Table 'phone_pool' does not exist in Supabase!");
        console.error("Please run the following SQL in your Supabase SQL Editor:\n");
        console.error(`
CREATE TABLE IF NOT EXISTS phone_pool (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  is_assigned BOOLEAN DEFAULT false,
  assigned_to UUID REFERENCES clinics(id) ON DELETE SET NULL,
  assigned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
        `);
      } else {
        console.error("Error inserting:", error);
      }
    } else {
      console.log("✅ Successfully seeded phone_pool with +12345678900");
    }
  } catch (err) {
    console.error(err);
  }
}

run();
