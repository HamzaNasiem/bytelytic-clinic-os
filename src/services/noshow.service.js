"use strict";

const { supabase } = require("../db/client");
const aiSvc = require("./ai.service");
const voiceSvc = require("./voice.service");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * predictNoshows
 * Uses Claude to score each appointment's no-show risk (0.0–1.0).
 * Returns results sorted by risk descending so callers take top N.
 *
 * @param {string}      clinicId
 * @param {string|Date} date
 * @returns {{ success: boolean, data?: object[], error?: string }}
 */
async function predictNoshows(clinicId, date) {
  try {
    const dateStr = new Date(date).toISOString().split("T")[0];
    const dayStart = `${dateStr}T00:00:00.000Z`;
    const dayEnd = `${dateStr}T23:59:59.999Z`;

    const { data: appointments, error: apptErr } = await supabase
      .from("appointments")
      .select(
        `
        id, patient_name, patient_phone, appointment_type, datetime, status,
        patients ( no_show_count, total_visits, preferred_time )
      `,
      )
      .eq("clinic_id", clinicId)
      .in("status", ["scheduled", "confirmed"])
      .gte("datetime", dayStart)
      .lte("datetime", dayEnd);

    if (apptErr)
      throw new Error(`Failed to fetch appointments: ${apptErr.message}`);
    if (!appointments?.length) return { success: true, data: [] };

    const raw = await aiSvc.chat({
      maxTokens: 800,
      messages: [
        {
          role: "user",
          content: `You are predicting no-show risk for a physical therapy clinic.\n\nAppointments for ${dateStr}:\n${JSON.stringify(appointments, null, 2)}\n\nScore each appointment's no-show risk from 0.0 to 1.0 based on:\n- Patient no_show_count vs total_visits ratio (higher ratio = more risk)\n- Early morning slots before 9am local time have higher risk\n- Patients with 0 prior visits (new patients) have moderate-high risk\n\nReturn a JSON array only (no markdown):\n[\n  { "appointmentId": "<uuid>", "riskScore": 0.0, "reason": "<brief>" }\n]`,
        },
      ],
    });

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const scores = JSON.parse(cleaned);

    scores.sort((a, b) => b.riskScore - a.riskScore);

    console.log(
      `[noshow.predictNoshows] clinicId=${clinicId} date=${dateStr} scored=${scores.length}`,
    );
    return { success: true, data: scores };
  } catch (error) {
    console.error(
      `[noshow.predictNoshows] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * fillFromWaitlist
 * When a slot opens, finds the longest-overdue patients and calls them
 * via Retell to offer the slot. Stops after the first successful call.
 *
 * @param {string} clinicId
 * @param {string} slot  ISO datetime of the open slot
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function fillFromWaitlist(clinicId, slot) {
  try {
    const { data: patients, error: patErr } = await supabase
      .from("patients")
      .select("id, name, phone")
      .eq("clinic_id", clinicId)
      .eq("recall_opted_out", false)
      .not("last_visit_date", "is", null)
      .order("last_visit_date", { ascending: true }) // longest overdue first
      .limit(5);

    if (patErr) throw new Error(`Failed to fetch waitlist: ${patErr.message}`);

    if (!patients?.length) {
      return {
        success: true,
        data: { filled: false, reason: "no_waitlist_candidates" },
      };
    }

    for (const patient of patients) {
      const callResult = await voiceSvc.makeOutboundCall(
        clinicId,
        patient.phone,
        "recall",
        {
          patientId: patient.id,
          patientName: patient.name,
          slotDatetime: slot,
          message: "slot_available",
        },
      );

      if (callResult.success) {
        console.log(
          `[noshow.fillFromWaitlist] clinicId=${clinicId} slot=${slot} patientId=${patient.id} callId=${callResult.data.callId}`,
        );
        return {
          success: true,
          data: {
            filled: true,
            patientId: patient.id,
            callId: callResult.data.callId,
          },
        };
      }

      console.error(
        `[noshow.fillFromWaitlist] clinicId=${clinicId} call failed patientId=${patient.id}`,
        callResult.error,
      );
    }

    return {
      success: true,
      data: { filled: false, reason: "all_calls_failed" },
    };
  } catch (error) {
    console.error(
      `[noshow.fillFromWaitlist] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { predictNoshows, fillFromWaitlist };
