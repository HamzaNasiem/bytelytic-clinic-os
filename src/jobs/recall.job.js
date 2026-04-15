"use strict";

const cron = require("node-cron");
const { supabase } = require("../db/client");
const recallSvc = require("../services/recall.service");

// Max outbound recall calls per clinic per daily run.
// Keeps us off spam blacklists — Retell also has rate limits.
const MAX_CALLS_PER_CLINIC = 20;

async function getActiveClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("is_active", true);

  if (error) throw new Error(`getActiveClinics failed: ${error.message}`);
  return data || [];
}

async function processRecallForClinic(clinicId) {
  const candidatesResult = await recallSvc.getRecallCandidates(clinicId);

  if (!candidatesResult.success) {
    console.error(
      `[recall.job] clinicId=${clinicId} getRecallCandidates failed`,
      candidatesResult.error,
    );
    return;
  }

  const candidates = candidatesResult.data.slice(0, MAX_CALLS_PER_CLINIC);

  if (!candidates.length) return;

  for (const candidate of candidates) {
    // initiateRecall already creates the jobs table record before calling Retell
    const result = await recallSvc.initiateRecall(clinicId, candidate.id);

    if (!result.success) {
      console.error(
        `[recall.job] clinicId=${clinicId} patientId=${candidate.id} initiate failed`,
        result.error,
      );
    }
  }

  console.info(
    `[recall.job] clinicId=${clinicId} initiated=${candidates.length} of ${candidatesResult.data.length} candidates`,
  );
}

async function run() {
  console.info("[recall.job] run started");

  let clinics;
  try {
    clinics = await getActiveClinics();
  } catch (e) {
    console.error("[recall.job] failed to get active clinics", e.message);
    return;
  }

  for (const clinic of clinics) {
    try {
      await processRecallForClinic(clinic.id);
    } catch (e) {
      console.error(`[recall.job] clinicId=${clinic.id} failed`, e.message);
    }
  }

  console.info("[recall.job] run complete");
}

function start() {
  // Daily at 8pm UTC — clinics are mostly in US timezones (UTC-5 to UTC-8)
  // so 8pm UTC = 3pm–12pm local, within business hours for outbound calls
  cron.schedule("0 20 * * *", run, { timezone: "UTC" });
  console.info("[recall.job] scheduled — daily 20:00 UTC");
}

module.exports = { start, run };
