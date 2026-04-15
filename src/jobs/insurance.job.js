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
  // processVerifications internally calls getVerificationCandidates (48h window)
  // and sends an SMS per appointment — jobs table is written inside sendVerificationRequest
  const result = await insuranceSvc.processVerifications(clinicId);

  if (!result.success) {
    console.error(
      `[insurance.job] clinicId=${clinicId} processVerifications failed`,
      result.error,
    );
    return;
  }

  if (result.data.sent > 0 || result.data.failed > 0) {
    console.info(
      `[insurance.job] clinicId=${clinicId} sent=${result.data.sent} failed=${result.data.failed}`,
    );
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
