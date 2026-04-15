"use strict";

const { supabase } = require("../db/client");
const smsSvc = require("./sms.service");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getVerificationCandidates
 * Returns appointments in the next 48 hours where:
 *   - insurance_verified is false
 *   - the patient has an insurance_provider on file
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: object[], error?: string }}
 */
async function getVerificationCandidates(clinicId) {
  try {
    const now = new Date();
    const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select(
        `
        id, patient_name, patient_phone, appointment_type, datetime, patient_id,
        patients ( insurance_provider, insurance_member_id )
      `,
      )
      .eq("clinic_id", clinicId)
      .in("status", ["scheduled", "confirmed"])
      .eq("insurance_verified", false)
      .gte("datetime", now.toISOString())
      .lte("datetime", in48h.toISOString());

    if (apptErr)
      throw new Error(`Failed to fetch appointments: ${apptErr.message}`);

    // Only include patients who have insurance on file — nothing to verify otherwise
    const candidates = (appointments || []).filter(
      (a) => a.patients?.insurance_provider,
    );

    return { success: true, data: candidates };
  } catch (error) {
    console.error(
      `[insurance.getVerificationCandidates] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * sendVerificationRequest
 * Sends a single SMS asking the patient to confirm their insurance is active.
 *
 * @param {string} clinicId
 * @param {string} appointmentId
 * @returns {{ success: boolean, data?: { sid: string }, error?: string }}
 */
async function sendVerificationRequest(clinicId, appointmentId) {
  try {
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select(
        `
        id, patient_name, patient_phone, appointment_type, datetime, patient_id,
        patients ( insurance_provider )
      `,
      )
      .eq("id", appointmentId)
      .eq("clinic_id", clinicId)
      .single();

    if (apptErr || !appt)
      throw new Error(
        `Appointment ${appointmentId} not found for clinic ${clinicId}`,
      );

    const apptDate = new Date(appt.datetime);
    const formattedDate = apptDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const provider = appt.patients?.insurance_provider || "your insurance";

    const body =
      `Hi ${appt.patient_name}! You have a ${appt.appointment_type} scheduled for ${formattedDate}. ` +
      `Please confirm your ${provider} coverage is still active. ` +
      `Reply YES if active or EXPIRED if it has changed. —Bytelytic`;

    const result = await smsSvc.send(
      clinicId,
      appt.patient_phone,
      body,
      "insurance",
      appointmentId,
      appt.patient_id,
    );

    if (!result.success) return result;

    console.log(
      `[insurance.sendVerificationRequest] clinicId=${clinicId} apptId=${appointmentId} sid=${result.data.sid}`,
    );
    return { success: true, data: { sid: result.data.sid } };
  } catch (error) {
    console.error(
      `[insurance.sendVerificationRequest] clinicId=${clinicId} apptId=${appointmentId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * processVerifications
 * Sends insurance verification SMS to all eligible appointments for a clinic.
 * Called per-clinic by insurance.job.js — one failure does not stop others.
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: { sent: number, failed: number }, error?: string }}
 */
async function processVerifications(clinicId) {
  try {
    const candidatesResult = await getVerificationCandidates(clinicId);
    if (!candidatesResult.success) return candidatesResult;

    const results = { sent: 0, failed: 0 };

    for (const appt of candidatesResult.data) {
      const result = await sendVerificationRequest(clinicId, appt.id);
      if (result.success) {
        results.sent++;
      } else {
        results.failed++;
        console.error(
          `[insurance.processVerifications] clinicId=${clinicId} apptId=${appt.id}`,
          result.error,
        );
      }
    }

    console.log(
      `[insurance.processVerifications] clinicId=${clinicId} sent=${results.sent} failed=${results.failed}`,
    );
    return { success: true, data: results };
  } catch (error) {
    console.error(
      `[insurance.processVerifications] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = {
  getVerificationCandidates,
  sendVerificationRequest,
  processVerifications,
};
