"use strict";

const cron = require("node-cron");
const { supabase } = require("../db/client");
const insuranceSvc = require("../services/insurance.service");

async function getActiveClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("is_active", true);

  if (error) throw new Error(`getActiveClinics failed: ${error.message}`);
  return data || [];
}

async function processInsuranceForClinic(clinicId) {
  try {
    const { data: jobRecord, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        clinic_id: clinicId,
        job_type: "insurance_verification",
        status: "processing",
        payload: {}
      })
      .select()
      .single();

    if (jobErr) {
      console.error(`[insurance.job] Failed to lock job clinic=${clinicId}`, jobErr.message);
      return;
    }

    const result = await insuranceSvc.processVerifications(clinicId);

    if (!result.success) {
      console.error(`[insurance.job] clinicId=${clinicId} processVerifications failed`, result.error);
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          ran_at: new Date().toISOString(),
          error_message: result.error
        })
        .eq("id", jobRecord.id);
      return;
    }

    await supabase
      .from("jobs")
      .update({
        status: "done",
        ran_at: new Date().toISOString(),
        error_message: `Sent: ${result.data.sent}. Failed: ${result.data.failed}`
      })
      .eq("id", jobRecord.id);

    if (result.data.sent > 0 || result.data.failed > 0) {
      console.info(`[insurance.job] clinicId=${clinicId} sent=${result.data.sent} failed=${result.data.failed}`);
    }
  } catch (error) {
    console.error(`[insurance.job] Execution failed clinic=${clinicId}`, error.message);
  }
}

async function run() {
  console.info("[insurance.job] run started");

  let clinics;
  try {
    clinics = await getActiveClinics();
  } catch (e) {
    console.error("[insurance.job] failed to get active clinics", e.message);
    return;
  }

  for (const clinic of clinics) {
    try {
      await processInsuranceForClinic(clinic.id);
    } catch (e) {
      console.error(`[insurance.job] clinicId=${clinic.id} failed`, e.message);
    }
  }

  console.info("[insurance.job] run complete");
}

function start() {
  // Daily at 9am UTC — catches appointments in the next 48h before US business day starts
  cron.schedule("0 9 * * *", run, { timezone: "UTC" });
  console.info("[insurance.job] scheduled — daily 09:00 UTC");
}

module.exports = { start, run };
