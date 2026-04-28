"use strict";

const cron = require("node-cron");
const { supabase } = require("../db/client");
const followupSvc = require("../services/followup.service");

// ─────────────────────────────────────────────────────────────
// FETCH ALL ACTIVE CLINICS
// ─────────────────────────────────────────────────────────────
async function getActiveClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("is_active", true);

  if (error) {
    console.error(`[followup.job] Failed to fetch active clinics`, error.message);
    return [];
  }
  return data.map((c) => c.id);
}

// ─────────────────────────────────────────────────────────────
// BACKGROUND JOB
// ─────────────────────────────────────────────────────────────
async function run() {
  console.log(`[followup.job] Starting daily execution...`);
  
  const clinics = await getActiveClinics();
  if (!clinics.length) {
    console.log(`[followup.job] No active clinics found.`);
    return;
  }

  let totalFollowups = 0;

  for (const clinicId of clinics) {
    // 1. Create a job record for resilience
    const { data: jobRecord, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        clinic_id: clinicId,
        job_type: "followup_dispatch",
        status: "processing",
        payload: {}
      })
      .select()
      .single();

    if (jobErr) {
      console.error(`[followup.job] Failed to lock job clinic=${clinicId}`, jobErr.message);
      continue;
    }

    try {
      // 2. Execute processFollowups
      const result = await followupSvc.processFollowups(clinicId);
      
      if (!result.success) {
        throw new Error(result.error);
      }

      totalFollowups += result.data.sent;

      // 3. Mark job complete
      await supabase
        .from("jobs")
        .update({
          status: "done",
          ran_at: new Date().toISOString(),
          error_message: `Follow-ups sent: ${result.data.sent}. Failed: ${result.data.failed}`
        })
        .eq("id", jobRecord.id);

    } catch (err) {
      console.error(`[followup.job] Execution failed clinic=${clinicId}`, err.message);
      // 4. Mark job failed
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          ran_at: new Date().toISOString(),
          error_message: err.message
        })
        .eq("id", jobRecord.id);
    }
  }

  console.log(`[followup.job] Execution complete. Total Follow-ups Sent: ${totalFollowups}`);
}

function start() {
  // every day at 10:00 UTC
  cron.schedule("0 10 * * *", run);
  console.log("[followup.job] scheduled — daily 10:00 UTC");
}

module.exports = { start, run };
