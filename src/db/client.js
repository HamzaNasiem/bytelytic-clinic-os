"use strict";

const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");

// Singleton — service_role key bypasses RLS.
// We enforce multi-tenancy in code (clinic_id on every query).
// Never expose this client to the frontend — dashboard uses anon key.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceKey, {
  auth: { persistSession: false },
});

module.exports = { supabase };
