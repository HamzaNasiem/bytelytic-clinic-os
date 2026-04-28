"use strict";

const { supabase } = require("../db/client");
const smsSvc = require("./sms.service");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getFollowupCandidates
 * Returns appointments that were completed exactly 2 days ago
 * and have not yet received a followup SMS.
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: object[], error?: string }}
 */
async function getFollowupCandidates(clinicId) {
  try {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const dateStr = twoDaysAgo.toISOString().split("T")[0];

    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select("id, patient_name, patient_phone, appointment_type, datetime")
      .eq("clinic_id", clinicId)
      .eq("status", "completed")
      .eq("followup_sent", false)
      .gte("datetime", `${dateStr}T00:00:00.000Z`)
      .lte("datetime", `${dateStr}T23:59:59.999Z`);

    if (apptErr)
      throw new Error(
        `Failed to fetch completed appointments: ${apptErr.message}`,
      );
    if (!appointments?.length) return { success: true, data: [] };

    return { success: true, data: appointments };
  } catch (error) {
    console.error(
      `[followup.getFollowupCandidates] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * processFollowups
 * Finds all eligible completed appointments and sends each a follow-up SMS.
 * One clinic failure does not stop the others — called per-clinic by the job.
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: { sent: number, failed: number }, error?: string }}
 */
async function processFollowups(clinicId) {
  try {
    const candidatesResult = await getFollowupCandidates(clinicId);
    if (!candidatesResult.success) return candidatesResult;

    const results = { sent: 0, failed: 0 };

    for (const appt of candidatesResult.data) {
      const result = await smsSvc.sendFollowup(appt.id);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        console.error(
          `[followup.processFollowups] clinicId=${clinicId} apptId=${appt.id}`,
          result.error,
        );
      }
    }

    console.log(
      `[followup.processFollowups] clinicId=${clinicId} sent=${results.sent} failed=${results.failed}`,
    );
    return { success: true, data: results };
  } catch (error) {
    console.error(
      `[followup.processFollowups] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { getFollowupCandidates, processFollowups };
