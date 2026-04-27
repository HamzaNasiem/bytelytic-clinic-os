"use strict";

const twilio = require("twilio");
const { supabase } = require("../db/client");
const env = require("../config/env");
const aiSvc = require("./ai.service");

// ─────────────────────────────────────────────────────────────
// CLIENTS (lazy-initialised)
// ─────────────────────────────────────────────────────────────

let _twilioClient = null;
function getTwilioClient() {
  if (!_twilioClient) {
    _twilioClient = twilio(env.twilioAccountSid, env.twilioAuthToken);
  }
  return _twilioClient;
}

// In development, 555-xxxx and other non-routable test numbers are blocked by Twilio.
// Instead of crashing, we log the SMS to console so the flow can be tested end-to-end.
// In production (NODE_ENV=production) this check is skipped — all numbers are real.
function isTestNumber(phone) {
  if (env.isProd) return false;
  return /^\+1\d{3}555\d{4}$/.test(phone) || /^(\+1)?5555555555$/.test(phone);
}

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

async function getClinicFromNumber(clinicId) {
  const { data: clinic } = await supabase
    .from("clinics")
    .select("twilio_number")
    .eq("id", clinicId)
    .single();
  return clinic?.twilio_number || env.twilioDefaultNumber;
}

async function saveSmsRecord({
  clinicId,
  patientId = null,
  twilioSid,
  direction,
  fromNumber,
  toNumber,
  body,
  smsType,
  appointmentId = null,
  status = "sent",
  patientReply = null,
  replySentiment = null,
}) {
  const { error } = await supabase.from("sms_messages").insert({
    clinic_id: clinicId,
    patient_id: patientId,
    twilio_sid: twilioSid,
    direction,
    from_number: fromNumber,
    to_number: toNumber,
    body,
    sms_type: smsType,
    appointment_id: appointmentId,
    status,
    patient_reply: patientReply,
    reply_sentiment: replySentiment,
  });

  if (error) {
    console.error(
      `[sms.saveSmsRecord] clinicId=${clinicId} DB insert failed`,
      error.message,
    );
  }
}

// Returns one of: 'positive' | 'negative' | 'neutral' | 'concern'
async function classifySentiment(replyText) {
  try {
    const sentiment = await aiSvc.chat({
      maxTokens: 10,
      messages: [
        {
          role: "user",
          content: `Classify this patient SMS reply into exactly one word: positive, negative, neutral, or concern.\n\nReply: "${replyText}"\n\nReturn only the single word, lowercase.`,
        },
      ],
    });
    const clean = sentiment.trim().toLowerCase();
    const valid = ["positive", "negative", "neutral", "concern"];
    return valid.includes(clean) ? clean : "neutral";
  } catch (e) {
    console.error("[sms.classifySentiment] AI call failed", e.message);
    return "neutral";
  }
}

// Detects patient intent from inbound SMS body using OpenRouter + appointment context.
async function detectIntent(body, clinicId) {
  try {
    const { data: appointments } = await supabase
      .from("appointments")
      .select("id, datetime, appointment_type, status, patient_name")
      .eq("clinic_id", clinicId)
      .in("status", ["scheduled", "confirmed"])
      .order("datetime", { ascending: true })
      .limit(5);

    const apptContext = appointments?.length
      ? JSON.stringify(appointments, null, 2)
      : "No upcoming appointments found.";

    const raw = await aiSvc.chat({
      maxTokens: 200,
      messages: [
        {
          role: "user",
          content: `You are interpreting a patient SMS to a clinic.\n\nUpcoming appointments:\n${apptContext}\n\nPatient SMS: "${body}"\n\nRespond with JSON only (no markdown):\n{\n  "intent": "confirm" | "cancel" | "reschedule" | "question" | "other",\n  "appointmentId": "<uuid or null>",\n  "details": "<brief explanation>"\n}`,
        },
      ],
    });

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/```\s*$/i, "")
      .trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error(`[sms.detectIntent] clinicId=${clinicId}`, e.message);
    return {
      intent: "other",
      appointmentId: null,
      details: "Could not parse intent",
    };
  }
}

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * send
 * Sends an outbound SMS via Twilio and persists the record.
 *
 * @param {string}      clinicId
 * @param {string}      toPhone
 * @param {string}      body
 * @param {string}      type          sms_type CHECK value
 * @param {string|null} appointmentId
 * @param {string|null} patientId
 * @returns {{ success: boolean, data?: { sid: string }, error?: string }}
 */
async function send(
  clinicId,
  toPhone,
  body,
  type = "general",
  appointmentId = null,
  patientId = null,
) {
  try {
    const fromNumber = await getClinicFromNumber(clinicId);

    // Dev-mode: skip Twilio for test/fake numbers, log instead
    if (isTestNumber(toPhone)) {
      console.log(`[sms.send][DEV] clinicId=${clinicId} to=${toPhone}`);
      console.log(`[sms.send][DEV] BODY: ${body}`);
      await saveSmsRecord({
        clinicId,
        patientId,
        twilioSid: `dev_${Date.now()}`,
        direction: "outbound",
        fromNumber,
        toNumber: toPhone,
        body,
        smsType: type,
        appointmentId,
        status: "dev_logged",
      });
      return { success: true, data: { sid: `dev_${Date.now()}`, dev: true } };
    }

    const client = getTwilioClient();
    let twilioSid = null;
    let smsStatus = "failed";
    try {
      const message = await client.messages.create({ from: fromNumber, to: toPhone, body });
      twilioSid = message.sid;
      smsStatus = "sent";
      console.log(`[sms.send] clinicId=${clinicId} to=${toPhone} sid=${message.sid}`);
    } catch (twilioErr) {
      console.error(`[sms.send] Twilio error clinicId=${clinicId} to=${toPhone}`, twilioErr.message);
      // Still save to sms_messages so Comms Log shows the attempt
    }

    await saveSmsRecord({
      clinicId,
      patientId,
      twilioSid: twilioSid || `failed_${Date.now()}`,
      direction: "outbound",
      fromNumber,
      toNumber: toPhone,
      body,
      smsType: type,
      appointmentId,
      status: smsStatus,
    });

    return { success: smsStatus === "sent", data: { sid: twilioSid } };
  } catch (error) {
    console.error(`[sms.send] clinicId=${clinicId} to=${toPhone}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * handleInbound
 * Processes an inbound patient SMS from the Twilio webhook.
 * Detects intent, updates appointment status, persists the message.
 *
 * @param {string} from       Patient E.164 number
 * @param {string} body       Raw SMS text
 * @param {string} clinicId
 * @param {string} twilioSid  For deduplication
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function handleInbound(from, body, clinicId, twilioSid = null) {
  try {
    const { data: patient } = await supabase
      .from("patients")
      .select("id")
      .eq("clinic_id", clinicId)
      .eq("phone", from)
      .single();

    const patientId = patient?.id || null;

    const [sentiment, intentResult] = await Promise.all([
      classifySentiment(body),
      detectIntent(body, clinicId),
    ]);

    const { intent, appointmentId: detectedApptId } = intentResult;

    if (detectedApptId) {
      if (intent === "confirm") {
        await supabase
          .from("appointments")
          .update({
            status: "confirmed",
            confirmed_at: new Date().toISOString(),
          })
          .eq("id", detectedApptId)
          .eq("clinic_id", clinicId);
        console.log(
          `[sms.handleInbound] clinicId=${clinicId} appointment confirmed apptId=${detectedApptId}`,
        );
      } else if (intent === "cancel") {
        await supabase
          .from("appointments")
          .update({ status: "cancelled" })
          .eq("id", detectedApptId)
          .eq("clinic_id", clinicId);
        console.log(
          `[sms.handleInbound] clinicId=${clinicId} appointment cancelled apptId=${detectedApptId}`,
        );
      }
    }

    const fromNumber = await getClinicFromNumber(clinicId);
    await saveSmsRecord({
      clinicId,
      patientId,
      twilioSid,
      direction: "inbound",
      fromNumber: from,
      toNumber: fromNumber,
      body,
      smsType: "general",
      appointmentId: detectedApptId,
      status: "received",
      patientReply: body,
      replySentiment: sentiment,
    });

    return {
      success: true,
      data: { intent, sentiment, appointmentId: detectedApptId },
    };
  } catch (error) {
    console.error(
      `[sms.handleInbound] clinicId=${clinicId} from=${from}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * sendReminder
 * Sends a 24-hour appointment reminder SMS. Marks reminder_sent = true.
 *
 * @param {string} appointmentId
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function sendReminder(appointmentId) {
  try {
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select(
        `
        id, clinic_id, patient_name, patient_phone,
        appointment_type, datetime, reminder_sent, patient_id,
        clinics ( name, timezone )
      `,
      )
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appt)
      throw new Error(`Appointment ${appointmentId} not found`);

    if (appt.reminder_sent) {
      return {
        success: true,
        data: { skipped: true, reason: "reminder already sent" },
      };
    }

    const clinicId = appt.clinic_id;
    const clinicName = appt.clinics?.name || "your clinic";
    const tz = appt.clinics?.timezone || "America/Chicago";
    const apptDate = new Date(appt.datetime);

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

    const body =
      `Hi ${appt.patient_name}! Reminder: you have a ${appt.appointment_type} ` +
      `at ${clinicName} tomorrow, ${formattedDate} at ${formattedTime}. ` +
      `Reply CONFIRM to confirm or CANCEL to cancel. —Bytelytic`;

    const result = await send(
      clinicId,
      appt.patient_phone,
      body,
      "reminder",
      appointmentId,
      appt.patient_id,
    );

    if (result.success) {
      await supabase
        .from("appointments")
        .update({ reminder_sent: true })
        .eq("id", appointmentId)
        .eq("clinic_id", clinicId);
    }

    return result;
  } catch (error) {
    console.error(
      `[sms.sendReminder] appointmentId=${appointmentId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * sendFollowup
 * Sends a post-visit follow-up SMS ~2 days after a completed appointment.
 *
 * @param {string} appointmentId
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function sendFollowup(appointmentId) {
  try {
    const { data: appt, error: apptErr } = await supabase
      .from("appointments")
      .select(
        `
        id, clinic_id, patient_name, patient_phone,
        appointment_type, patient_id,
        clinics ( name )
      `,
      )
      .eq("id", appointmentId)
      .single();

    if (apptErr || !appt)
      throw new Error(`Appointment ${appointmentId} not found`);

    const clinicId = appt.clinic_id;
    const clinicName = appt.clinics?.name || "your clinic";

    const body =
      `Hi ${appt.patient_name}! This is ${clinicName} checking in after your recent ` +
      `${appt.appointment_type}. How are you feeling? Please reply and let us know — ` +
      `we care about your recovery. —Bytelytic`;

    return await send(
      clinicId,
      appt.patient_phone,
      body,
      "followup",
      appointmentId,
      appt.patient_id,
    );
  } catch (error) {
    console.error(
      `[sms.sendFollowup] appointmentId=${appointmentId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { send, handleInbound, sendReminder, sendFollowup };
