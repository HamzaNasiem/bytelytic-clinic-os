"use strict";

const { supabase } = require("../db/client");
const voiceSvc = require("./voice.service");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getRecallCandidates
 * Returns patients whose last_visit_date was exactly 30, 60, or 90 days ago
 * (per clinic config) and who have not opted out of recall.
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: object[], error?: string }}
 */
async function getRecallCandidates(clinicId) {
  try {
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("recall_days")
      .eq("id", clinicId)
      .single();

    if (clinicErr || !clinic) throw new Error(`Clinic ${clinicId} not found`);

    const recallDays = clinic.recall_days || [30, 60, 90];
    const today = new Date();
    const candidates = [];

    for (const days of recallDays) {
      const target = new Date(today);
      target.setDate(target.getDate() - days);
      const dateStr = target.toISOString().split("T")[0]; // YYYY-MM-DD

      const { data: patients, error } = await supabase
        .from("patients")
        .select("id, name, phone, last_visit_date")
        .eq("clinic_id", clinicId)
        .eq("last_visit_date", dateStr)
        .eq("recall_opted_out", false);

      if (error) {
        console.error(
          `[recall.getRecallCandidates] clinicId=${clinicId} days=${days}`,
          error.message,
        );
        continue; // don't let one recall_days bucket fail the others
      }

      if (patients?.length) {
        patients.forEach((p) =>
          candidates.push({ ...p, daysSinceVisit: days }),
        );
      }
    }

    console.log(
      `[recall.getRecallCandidates] clinicId=${clinicId} found=${candidates.length}`,
    );
    return { success: true, data: candidates };
  } catch (error) {
    console.error(
      `[recall.getRecallCandidates] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * initiateRecall
 * Creates a jobs table record first, then triggers a Retell outbound call.
 * Rule: always persist intent before async action so failures are retryable.
 *
 * @param {string} clinicId
 * @param {string} patientId
 * @returns {{ success: boolean, data?: { jobId: string, callId: string }, error?: string }}
 */
async function initiateRecall(clinicId, patientId) {
  try {
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select("name, phone")
      .eq("id", patientId)
      .eq("clinic_id", clinicId)
      .single();

    if (patErr || !patient)
      throw new Error(`Patient ${patientId} not found for clinic ${clinicId}`);

    // Persist job intent before making the call (Rule 2 from CLAUDE.md)
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        clinic_id: clinicId,
        job_type: "recall_call",
        payload: { patientId, patientName: patient.name, phone: patient.phone },
        status: "pending",
      })
      .select()
      .single();

    if (jobErr)
      throw new Error(`Failed to create recall job: ${jobErr.message}`);

    const callResult = await voiceSvc.makeOutboundCall(
      clinicId,
      patient.phone,
      "recall",
      {
        patientId,
        patientName: patient.name,
      },
    );

    if (!callResult.success) {
      await supabase
        .from("jobs")
        .update({
          status: "failed",
          error_message: callResult.error,
          ran_at: new Date().toISOString(),
        })
        .eq("id", job.id)
        .eq("clinic_id", clinicId);
      return { success: false, error: callResult.error };
    }

    await supabase
      .from("jobs")
      .update({ status: "done", ran_at: new Date().toISOString() })
      .eq("id", job.id)
      .eq("clinic_id", clinicId);

    console.log(
      `[recall.initiateRecall] clinicId=${clinicId} patientId=${patientId} callId=${callResult.data.callId}`,
    );
    return {
      success: true,
      data: { jobId: job.id, callId: callResult.data.callId },
    };
  } catch (error) {
    console.error(
      `[recall.initiateRecall] clinicId=${clinicId} patientId=${patientId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * processRecallOutcome
 * Called after a recall call ends. Updates call outcome and inserts
 * a revenue_event if the patient booked an appointment.
 *
 * @param {string} clinicId
 * @param {string} retellCallId
 * @param {string} outcome       One of the calls.outcome CHECK values
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function processRecallOutcome(clinicId, retellCallId, outcome) {
  try {
    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("id, appointment_id, patient_id")
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId)
      .single();

    if (callErr || !call)
      throw new Error(`Call ${retellCallId} not found for clinic ${clinicId}`);

    await supabase
      .from("calls")
      .update({ outcome })
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId);

    if (outcome === "booked" && call.appointment_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("monthly_revenue_per_visit")
        .eq("id", clinicId)
        .single();

      const amountCents = (clinic?.monthly_revenue_per_visit || 150) * 100;

      await supabase.from("revenue_events").insert({
        clinic_id: clinicId,
        event_type: "recall_booked",
        amount_cents: amountCents,
        appointment_id: call.appointment_id,
        description: "Patient recalled via AI outbound call",
      });

      console.log(
        `[recall.processRecallOutcome] clinicId=${clinicId} callId=${retellCallId} booked amount=${amountCents}`,
      );
    }

    return { success: true, data: { outcome } };
  } catch (error) {
    console.error(
      `[recall.processRecallOutcome] clinicId=${clinicId} callId=${retellCallId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { getRecallCandidates, initiateRecall, processRecallOutcome };
