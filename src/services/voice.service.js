"use strict";

const Retell = require("retell-sdk");
const { supabase } = require("../db/client");
const env = require("../config/env");
const aiSvc = require("./ai.service");
const calendarSvc = require("./calendar.service");
const smsSvc = require("./sms.service");

// ─────────────────────────────────────────────────────────────
// RETELL CLIENT
// ─────────────────────────────────────────────────────────────

let _retell = null;
function getRetell() {
  if (!_retell) _retell = new Retell({ apiKey: env.retellApiKey });
  return _retell;
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

function buildSystemPrompt(clinic) {
  const hoursFormatted = Object.entries(clinic.business_hours || {})
    .map(([day, hours]) => `${day}: ${hours}`)
    .join(", ");

  const typesFormatted = (clinic.appointment_types || [])
    .map((t) => `${t.name} (${t.duration} min)`)
    .join(", ");

  return `You are the AI receptionist for ${clinic.name}, a clinic. Warm, professional, efficient.

Tasks: Book/reschedule/cancel appointments. Answer hours, location, insurance.
New patients: collect full name, DOB, phone, insurance provider.
Always confirm date + time + type before finalizing. Tell patient SMS confirmation follows.

Clinic hours: ${hoursFormatted}
Appointment types: ${typesFormatted}

Rules:
- Never give medical advice — say "The doctor will address that at your appointment"
- Call book_appointment function when all booking details are collected
- If patient asks about emergencies, advise them to call 911 or go to the nearest ER`;
}

/**
 * Uses OpenRouter to extract structured booking details from a call transcript.
 * Returns null if no booking intent found.
 */
async function extractBookingFromTranscript(
  transcript,
  clinicId,
  timezone = "America/Chicago",
) {
  const raw = await aiSvc.chat({
    maxTokens: 500,
    messages: [
      {
        role: "system",
        content:
          "You are a data extraction assistant. Always respond with valid JSON only. No markdown, no explanation.",
      },
      {
        role: "user",
        content: `Extract appointment booking data from this clinic call transcript.
The clinic is in timezone: ${timezone}
Today's reference date: ${new Date().toLocaleDateString("en-US", { timeZone: timezone, weekday: "long", year: "numeric", month: "long", day: "numeric" })}

Transcript:
"""
${transcript}
"""

Return a JSON object:
{
  "hasBookingIntent": true or false,
  "patientName":      "Full Name or null",
  "patientPhone":     "E.164 format e.g. +12025550100 or null",
  "dateOfBirth":      "YYYY-MM-DD or null",
  "insuranceProvider":"string or null",
  "appointmentType":  "e.g. Initial Eval, Follow-up, or null",
  "datetime":         "ISO 8601 with UTC offset e.g. 2026-04-18T10:00:00-05:00 or null — interpret the time as clinic local time (${timezone})",
  "durationMinutes":  30,
  "notes":            "any other info or null"
}

If no appointment was requested, set hasBookingIntent to false and all other fields to null.`,
      },
    ],
  });

  try {
    // Strip markdown fences if the model wraps its response anyway
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!parsed.hasBookingIntent) return null;

    // Sanitize phone — free LLMs sometimes return local formats or decimals
    if (parsed.patientPhone) {
      let p = parsed.patientPhone.replace(/[^\d+]/g, "");

      // Normalize common local formats → E.164
      // Pakistan: 03XXXXXXXXX or +03XXXXXXXXX → +923XXXXXXXXX
      if (/^\+?03\d{9}$/.test(p)) {
        p = "+92" + p.replace(/^\+?0/, "");
      }
      // US: 10-digit without country code → +1XXXXXXXXXX
      else if (/^\d{10}$/.test(p)) {
        p = "+1" + p;
      }
      // Add + if missing but has country code digits (11–15 digits)
      else if (/^\d{11,15}$/.test(p)) {
        p = "+" + p;
      }

      // Final validation: must be E.164 (+countrycode number, 10–15 digits total)
      parsed.patientPhone = /^\+\d{10,15}$/.test(p) ? p : null;
    }

    return parsed;
  } catch (e) {
    console.error(
      `[voice.extractBooking] clinicId=${clinicId} JSON parse failed`,
      e.message,
      "| raw:",
      raw.slice(0, 200),
    );
    return null;
  }
}

// Private helper — throws on failure; callers are responsible for catching.
async function upsertPatient(
  clinicId,
  { patientName, patientPhone, dateOfBirth, insuranceProvider },
) {
  const { data: existing } = await supabase
    .from("patients")
    .select("*")
    .eq("clinic_id", clinicId)
    .eq("phone", patientPhone)
    .single();

  if (existing) {
    const updates = {};
    if (patientName && !existing.name) updates.name = patientName;
    if (dateOfBirth && !existing.date_of_birth)
      updates.date_of_birth = dateOfBirth;
    if (insuranceProvider && !existing.insurance_provider)
      updates.insurance_provider = insuranceProvider;

    if (Object.keys(updates).length > 0) {
      await supabase
        .from("patients")
        .update(updates)
        .eq("id", existing.id)
        .eq("clinic_id", clinicId);
    }
    return existing;
  }

  const { data: newPatient, error } = await supabase
    .from("patients")
    .insert({
      clinic_id: clinicId,
      name: patientName || "Unknown",
      phone: patientPhone,
      date_of_birth: dateOfBirth || null,
      insurance_provider: insuranceProvider || null,
    })
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert patient: ${error.message}`);
  return newPatient;
}

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * createAgent
 * Creates a Retell LLM + Agent for a clinic using its DB settings.
 * New Retell API flow: create LLM first → create agent with llm_id.
 * Saves agentId + llmId back to clinics table.
 */
async function createAgent(clinicId) {
  try {
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("*")
      .eq("id", clinicId)
      .single();

    if (clinicErr || !clinic) throw new Error(`Clinic ${clinicId} not found`);

    const retell = getRetell();
    const systemPrompt = buildSystemPrompt(clinic);

    // ── Step 1: Create the LLM ──────────────────────────────────
    const llm = await retell.llm.create({
      model: "gpt-4o-mini",
      general_prompt: systemPrompt,
      general_tools: [
        {
          type: "end_call",
          name: "end_call",
          description:
            "End the call after booking is confirmed or the patient has no further needs.",
        },
      ],
      begin_message: `Thank you for calling ${clinic.name}. This is your AI receptionist. How can I help you today?`,
    });

    const llmId = llm.llm_id;
    console.log(`[voice.createAgent] clinicId=${clinicId} llmId=${llmId}`);

    // ── Step 2: Create the Agent using the LLM id ──────────────
    const agent = await retell.agent.create({
      agent_name: `${clinic.name} — Bytelytic Agent`,
      voice_id: "11labs-Adrian", // Retell built-in voice
      response_engine: {
        type: "retell-llm",
        llm_id: llmId,
      },
      ambient_sound: "coffee-shop",
      responsiveness: 1,
      interruption_sensitivity: 1,
      enable_backchannel: true,
      backchannel_frequency: 0.9,
      backchannel_words: ["okay", "got it", "sure", "of course"],
      reminder_trigger_ms: 10000,
      reminder_max_count: 2,
      normalize_for_speech: true,
      end_call_after_silence_ms: 600000,
    });

    const agentId = agent.agent_id;

    // ── Step 3: Persist both IDs to DB ─────────────────────────
    await supabase
      .from("clinics")
      .update({ retell_agent_id: agentId, retell_llm_id: llmId })
      .eq("id", clinicId);

    console.log(`[voice.createAgent] clinicId=${clinicId} agentId=${agentId}`);
    return { success: true, data: { agentId, llmId } };
  } catch (error) {
    console.error(`[voice.createAgent] clinicId=${clinicId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * handleCallEvent
 * Core webhook handler. On call_ended + transcript:
 *  1. Extract booking via OpenRouter
 *  2. Check Google Calendar availability
 *  3. Upsert patient + insert appointment + call record
 *  4. Send confirmation SMS
 *  5. Insert revenue_event
 */
async function handleCallEvent(event) {
  let clinicId = null;

  try {
    const toNumber = event.to_number || event.metadata?.to_number || null;

    clinicId = event.metadata?.clinic_id || null;

    // 1. Lookup by Twilio number (real phone calls)
    if (!clinicId && toNumber) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id")
        .eq("twilio_number", toNumber)
        .single();
      clinicId = clinic?.id || null;
    }

    // 2. Lookup by Retell agent_id (web calls / Test Audio — no to_number)
    if (!clinicId && event.agent_id) {
      const { data: clinic } = await supabase
        .from("clinics")
        .select("id")
        .eq("retell_agent_id", event.agent_id)
        .single();
      clinicId = clinic?.id || null;
    }

    // 3. Fallback: only one active clinic in DB (dev/test mode)
    if (!clinicId) {
      const { data: clinics } = await supabase
        .from("clinics")
        .select("id")
        .eq("is_active", true)
        .limit(1);
      clinicId = clinics?.[0]?.id || null;
    }

    if (!clinicId) {
      console.warn(
        "[voice.handleCallEvent] clinicId=null could not resolve from event",
      );
      return { success: false, error: "clinicId not found in event or DB" };
    }

    // Fetch clinic early — timezone needed for transcript extraction
    const { data: clinicRow } = await supabase
      .from("clinics")
      .select("timezone")
      .eq("id", clinicId)
      .single();
    const clinicTimezone = clinicRow?.timezone || "America/Chicago";

    const retellCallId = event.call_id;
    const callStatus = event.call_status;
    const direction = event.direction || "inbound";
    const fromNumber = event.from_number || null;
    const durationSeconds = event.duration_ms
      ? Math.round(event.duration_ms / 1000)
      : null;
    const transcript = event.transcript || null;
    const recordingUrl = event.recording_url || null;
    const startedAt = event.start_timestamp
      ? new Date(event.start_timestamp).toISOString()
      : null;
    const endedAt = event.end_timestamp
      ? new Date(event.end_timestamp).toISOString()
      : null;

    const { data: callRow } = await supabase
      .from("calls")
      .upsert(
        {
          clinic_id: clinicId,
          retell_call_id: retellCallId,
          direction,
          call_type: "booking",
          from_number: fromNumber,
          to_number: toNumber,
          duration_seconds: durationSeconds,
          status: callStatus,
          transcript,
          recording_url: recordingUrl,
          started_at: startedAt,
          ended_at: endedAt,
        },
        { onConflict: "retell_call_id" },
      )
      .select()
      .single();

    if (callStatus !== "ended" || !transcript || event._recordOnly) {
      return {
        success: true,
        data: { callId: callRow?.id, action: event._recordOnly ? "record_only" : "call_recorded_only" },
      };
    }

    // ── Booking extraction ──────────────────────────────────────
    const booking = await extractBookingFromTranscript(
      transcript,
      clinicId,
      clinicTimezone,
    );

    if (!booking) {
      console.log(
        `[voice.handleCallEvent] clinicId=${clinicId} no booking intent callId=${retellCallId}`,
      );
      await supabase
        .from("calls")
        .update({ outcome: "completed", call_type: "general" })
        .eq("retell_call_id", retellCallId)
        .eq("clinic_id", clinicId);
      return {
        success: true,
        data: { callId: callRow?.id, action: "no_booking_intent" },
      };
    }

    const {
      patientName,
      patientPhone,
      dateOfBirth,
      insuranceProvider,
      appointmentType,
      datetime,
      durationMinutes = 30,
      notes,
    } = booking;

    if (!patientPhone || !datetime) {
      console.warn(
        `[voice.handleCallEvent] clinicId=${clinicId} incomplete booking data`,
      );
      return {
        success: true,
        data: { callId: callRow?.id, action: "incomplete_booking", booking },
      };
    }

    // ── Idempotency guard: if this call already has an appointment, skip ──
    const { data: existingCallRow } = await supabase
      .from("calls")
      .select("appointment_id")
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId)
      .single();
    if (existingCallRow?.appointment_id) {
      console.log(
        `[voice.handleCallEvent] already booked callId=${retellCallId} apptId=${existingCallRow.appointment_id} — skipping duplicate`,
      );
      return {
        success: true,
        data: { action: "already_booked", appointmentId: existingCallRow.appointment_id },
      };
    }

    const targetDate = new Date(datetime);
    const slotsResult = await calendarSvc.getAvailableSlots(
      clinicId,
      targetDate,
      durationMinutes,
    );

    let finalDatetime = datetime;
    let slotAvailable = true;

    if (slotsResult.success && slotsResult.data.length > 0) {
      const requestedMs = targetDate.getTime();
      const closest = slotsResult.data.reduce(
        (best, slot) => {
          const diff = Math.abs(new Date(slot).getTime() - requestedMs);
          return diff < best.diff ? { slot, diff } : best;
        },
        { slot: slotsResult.data[0], diff: Infinity },
      );
      finalDatetime = closest.slot;
    } else if (slotsResult.success && slotsResult.data.length === 0) {
      slotAvailable = false;
      console.warn(
        `[voice.handleCallEvent] clinicId=${clinicId} no slots available date=${datetime}`,
      );
    }

    const patient = await upsertPatient(clinicId, {
      patientName,
      patientPhone,
      dateOfBirth,
      insuranceProvider,
    });

    let googleEventId = null;
    if (slotAvailable) {
      const calResult = await calendarSvc.createEvent(clinicId, {
        patient_name: patientName,
        appointment_type: appointmentType || "Follow-up",
        datetime: finalDatetime,
        duration_minutes: durationMinutes,
        notes,
      });
      if (calResult.success) {
        googleEventId = calResult.data.googleEventId;
      } else {
        console.warn(
          `[voice.handleCallEvent] clinicId=${clinicId} calendar event failed`,
          calResult.error,
        );
      }
    }

    // ── Save patient info to call record NOW (before upsert) so Call Logs always shows name ──
    await supabase
      .from("calls")
      .update({
        patient_id: patient.id,
        patient_name: patientName,       // ← saved early so Unknown never shows
        outcome: "attempted_booking",
        call_type: "booking",
      })
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId);

    // ── UPSERT appointment ── constraint 'appt_retell_call_unique' on retell_call_id
    // ignoreDuplicates:true = if same call fires twice, silently skip the second one
    const { data: appointment, error: apptErr } = await supabase
      .from("appointments")
      .upsert(
        {
          clinic_id: clinicId,
          retell_call_id: retellCallId,
          patient_id: patient.id,
          patient_name: patientName,
          patient_phone: patientPhone,
          appointment_type: appointmentType || "Follow-up",
          datetime: finalDatetime,
          duration_minutes: durationMinutes,
          google_event_id: googleEventId,
          status: "scheduled",
          booked_by: "ai",
          notes,
        },
        { onConflict: "retell_call_id", ignoreDuplicates: true }
      )
      .select()
      .single();

    if (apptErr)
      throw new Error(`Failed to upsert appointment: ${apptErr.message}`);

    // Update call with appointment id now that appointment exists
    await supabase
      .from("calls")
      .update({ appointment_id: appointment.id, outcome: "booked" })
      .eq("retell_call_id", retellCallId)
      .eq("clinic_id", clinicId);

    const { data: clinic } = await supabase
      .from("clinics")
      .select("name, timezone, monthly_revenue_per_visit")
      .eq("id", clinicId)
      .single();

    const tz = clinic?.timezone || "America/Chicago";
    const apptDate = new Date(finalDatetime);
    const formattedDate = apptDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      timeZone: tz,
    });
    const formattedTime = apptDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });

    const confirmationBody =
      `Hi ${patientName}! Your ${appointmentType || "appointment"} at ${clinic?.name || "your clinic"} ` +
      `is confirmed for ${formattedDate} at ${formattedTime}. ` +
      `Reply CONFIRM to confirm or CANCEL to cancel. —Bytelytic`;

    await smsSvc.send(
      clinicId,
      patientPhone,
      confirmationBody,
      "confirmation",
      appointment.id,
      patient.id,
    );

    // UPSERT revenue event — retell_call_id unique prevents double-counting
    const revenueAmountCents = (clinic?.monthly_revenue_per_visit || 150) * 100;
    await supabase.from("revenue_events").upsert(
      {
        clinic_id: clinicId,
        retell_call_id: retellCallId,     // ← unique key
        event_type: "missed_call_recovered",
        amount_cents: revenueAmountCents,
        appointment_id: appointment.id,
        description: `Inbound call booked by AI — ${appointmentType || "appointment"} for ${patientName}`,
      },
      { onConflict: "retell_call_id", ignoreDuplicates: true }
    );

    console.log(
      `[voice.handleCallEvent] clinicId=${clinicId} BOOKED patient=${patientName} apptId=${appointment.id}`,
    );
    return {
      success: true,
      data: {
        action: "appointment_booked",
        appointmentId: appointment.id,
        patientId: patient.id,
        googleEventId,
        datetime: finalDatetime,
      },
    };
  } catch (error) {
    console.error(
      `[voice.handleCallEvent] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * makeOutboundCall
 * Initiates an outbound Retell call (recall & reminder jobs).
 */
async function makeOutboundCall(clinicId, phone, purpose, context = {}) {
  try {
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("retell_agent_id, twilio_number, name")
      .eq("id", clinicId)
      .single();

    if (clinicErr || !clinic) throw new Error(`Clinic ${clinicId} not found`);
    if (!clinic.retell_agent_id)
      throw new Error(
        `Clinic ${clinicId} has no Retell agent — run createAgent() first`,
      );
    if (!clinic.twilio_number)
      throw new Error(`Clinic ${clinicId} has no Twilio number assigned`);

    const retell = getRetell();

    const call = await retell.call.createPhoneCall({
      agent_id: clinic.retell_agent_id,
      from_number: clinic.twilio_number,
      to_number: phone,
      metadata: { clinic_id: clinicId, purpose, ...context },
      retell_llm_dynamic_variables: {
        clinic_name: clinic.name,
        call_purpose: purpose,
        patient_name: context.patientName || "",
      },
    });

    const retellCallId = call.call_id;

    await supabase.from("calls").insert({
      clinic_id: clinicId,
      patient_id: context.patientId || null,
      retell_call_id: retellCallId,
      direction: "outbound",
      call_type: purpose,
      from_number: clinic.twilio_number,
      to_number: phone,
      status: "initiated",
    });

    console.log(
      `[voice.makeOutboundCall] clinicId=${clinicId} purpose=${purpose} to=${phone} callId=${retellCallId}`,
    );
    return { success: true, data: { callId: retellCallId } };
  } catch (error) {
    console.error(
      `[voice.makeOutboundCall] clinicId=${clinicId} to=${phone}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { createAgent, handleCallEvent, makeOutboundCall };
