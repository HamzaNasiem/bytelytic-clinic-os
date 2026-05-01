"use strict";

const { supabase } = require("../db/client");
const voiceSvc = require("./voice.service");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getWaitlistCandidates
 * Returns all pending waitlist entries for a clinic, ordered by oldest first.
 *
 * @param {string} clinicId
 * @returns {{ success: boolean, data?: object[], error?: string }}
 */
async function getWaitlistCandidates(clinicId) {
  try {
    const { data, error } = await supabase
      .from("waitlist")
      .select(`
        id, clinic_id, patient_id, appointment_type, preferred_dates, status, created_at,
        patients ( name, phone )
      `)
      .eq("clinic_id", clinicId)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) throw new Error(`Waitlist fetch failed: ${error.message}`);

    return { success: true, data: data || [] };
  } catch (error) {
    console.error(`[waitlist.getWaitlistCandidates] clinicId=${clinicId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * offerSlot
 * Initiates an outbound Retell AI call to a waitlisted patient offering a newly opened slot.
 *
 * @param {string} clinicId
 * @param {string} waitlistId
 * @param {string} dateStr       The date/time of the cancelled slot that opened up.
 * @returns {{ success: boolean, data?: { jobId: string, callId: string }, error?: string }}
 */
async function offerSlot(clinicId, waitlistId, dateStr) {
  try {
    // 1. Fetch waitlist entry
    const { data: entry, error: entryErr } = await supabase
      .from("waitlist")
      .select(`
        id, patient_id, appointment_type,
        patients ( name, phone )
      `)
      .eq("id", waitlistId)
      .eq("clinic_id", clinicId)
      .single();

    if (entryErr || !entry) {
      throw new Error(`Waitlist entry ${waitlistId} not found`);
    }

    const patient = entry.patients;

    // 2. Insert into jobs for tracking
    const { data: job, error: jobErr } = await supabase
      .from("jobs")
      .insert({
        clinic_id: clinicId,
        job_type: "waitlist_offer",
        payload: {
          waitlistId,
          patientId: entry.patient_id,
          patientName: patient.name,
          phone: patient.phone,
          offeredSlot: dateStr,
          appointmentType: entry.appointment_type
        },
        status: "pending",
      })
      .select()
      .single();

    if (jobErr) throw new Error(`Job creation failed: ${jobErr.message}`);

    // 3. Trigger Retell AI Outbound Call
    // We pass prompt context specifically telling the AI this is a waitlist offer
    const callResult = await voiceSvc.makeOutboundCall(
      clinicId,
      patient.phone,
      "waitlist_offer",
      {
        patientId: entry.patient_id,
        patientName: patient.name,
        offeredSlot: dateStr,
        appointmentType: entry.appointment_type,
        waitlistId: waitlistId
      }
    );

    if (!callResult.success) {
      await supabase.from("jobs").update({
        status: "failed",
        error_message: callResult.error,
        ran_at: new Date().toISOString(),
      }).eq("id", job.id);

      return { success: false, error: callResult.error };
    }

    // Success
    await supabase.from("jobs").update({
      status: "done",
      ran_at: new Date().toISOString()
    }).eq("id", job.id);

    console.log(`[waitlist.offerSlot] clinicId=${clinicId} waitlistId=${waitlistId} callId=${callResult.data.callId}`);

    return {
      success: true,
      data: { jobId: job.id, callId: callResult.data.callId },
    };
  } catch (error) {
    console.error(`[waitlist.offerSlot] clinicId=${clinicId} waitlistId=${waitlistId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * processOfferOutcome
 * Called via Retell Webhook after the call completes.
 * If booked, update waitlist to fulfilled and log revenue event.
 *
 * @param {string} clinicId
 * @param {string} retellCallId
 * @param {string} outcome       (booked, not_interested, voicemail, failed)
 * @param {string} waitlistId
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function processOfferOutcome(clinicId, retellCallId, outcome, waitlistId) {
  try {
    const { data: call, error: callErr } = await supabase
      .from("calls")
      .select("id, appointment_id")
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId)
      .single();

    if (callErr || !call) throw new Error(`Call ${retellCallId} not found`);

    // Update call outcome
    await supabase.from("calls").update({ outcome }).eq("retell_call_id", retellCallId);

    if (outcome === "booked") {
      // 1. Fulfill waitlist
      await supabase.from("waitlist").update({ status: "fulfilled" }).eq("id", waitlistId);

      // 2. Add Revenue Event
      if (call.appointment_id) {
        const { data: clinic } = await supabase
          .from("clinics")
          .select("monthly_revenue_per_visit")
          .eq("id", clinicId)
          .single();

        const amountCents = (clinic?.monthly_revenue_per_visit || 150) * 100;

        await supabase.from("revenue_events").insert({
          clinic_id: clinicId,
          event_type: "noshow_slot_filled",
          amount_cents: amountCents,
          appointment_id: call.appointment_id,
          description: "Waitlist slot filled via AI outbound call",
        });
      }
      console.log(`[waitlist.processOfferOutcome] Slot FILLED waitlistId=${waitlistId}`);
    }

    return { success: true, data: { outcome } };
  } catch (error) {
    console.error(`[waitlist.processOfferOutcome]`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getWaitlistCandidates,
  offerSlot,
  processOfferOutcome
};
