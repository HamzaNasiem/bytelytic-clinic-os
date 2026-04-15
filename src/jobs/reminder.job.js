"use strict";

const cron = require("node-cron");
const { supabase } = require("../db/client");
const smsSvc = require("../services/sms.service");

// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────

async function getActiveClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("is_active", true);

  if (error) throw new Error(`getActiveClinics failed: ${error.message}`);
  return data || [];
}

async function processRemindersForClinic(clinicId) {
  // Window: appointments starting in the next 24–25 hours
  // Running every hour means we check a 1-hour window ahead of the 24h mark.
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in25h = new Date(now.getTime() + 25 * 60 * 60 * 1000);

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("id")
    .eq("clinic_id", clinicId)
    .in("status", ["scheduled", "confirmed"])
    .eq("reminder_sent", false)
    .gte("datetime", in24h.toISOString())
    .lt("datetime", in25h.toISOString());

  if (error) throw new Error(`fetch appointments failed: ${error.message}`);
  if (!appointments?.length) return;

  for (const appt of appointments) {
    // Rule 2 (CLAUDE.md): persist job intent before any async action
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        clinic_id: clinicId,
        job_type: "send_reminder",
        payload: { appointmentId: appt.id },
        status: "processing",
        attempts: 1,
      })
      .select("id")
      .single();

    if (jobErr) {
      console.error(
        `[reminder.job] clinicId=${clinicId} failed to create job`,
        jobErr.message,
      );
      continue;
    }

    const result = await smsSvc.sendReminder(appt.id);

    await supabase
      .from("jobs")
      .update({
        status: result.success ? "done" : "failed",
        error_message: result.success ? null : result.error,
        ran_at: new Date().toISOString(),
      })
      .eq("id", job.id)
      .eq("clinic_id", clinicId);

    if (!result.success) {
      console.error(
        `[reminder.job] clinicId=${clinicId} apptId=${appt.id} sms failed`,
        result.error,
      );
    }
  }

  console.info(
    `[reminder.job] clinicId=${clinicId} processed=${appointments.length}`,
  );
}

// ─────────────────────────────────────────────────────────────
// JOB RUNNER
// ─────────────────────────────────────────────────────────────

async function run() {
  console.info("[reminder.job] run started");

  let clinics;
  try {
    clinics = await getActiveClinics();
  } catch (e) {
    console.error("[reminder.job] failed to get active clinics", e.message);
    return;
  }

  // Rule 3 (CLAUDE.md): isolate each clinic — one failure must not stop others
  for (const clinic of clinics) {
    try {
      await processRemindersForClinic(clinic.id);
    } catch (e) {
      console.error(`[reminder.job] clinicId=${clinic.id} failed`, e.message);
    }
  }

  console.info("[reminder.job] run complete");
}

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────

function start() {
  // Every hour on the hour
  cron.schedule("0 * * * *", run, { timezone: "UTC" });
  console.info("[reminder.job] scheduled — every hour");
}

module.exports = { start, run };
