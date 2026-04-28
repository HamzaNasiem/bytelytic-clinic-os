"use strict";

const cron = require("node-cron");
const { supabase } = require("../db/client");
const noshowSvc = require("../services/noshow.service");
const smsSvc = require("../services/sms.service");

// Number of high-risk appointments to send an extra confirmation SMS to
const TOP_RISK_COUNT = 3;

async function getActiveClinics() {
  const { data, error } = await supabase
    .from("clinics")
    .select("id")
    .eq("is_active", true);

  if (error) throw new Error(`getActiveClinics failed: ${error.message}`);
  return data || [];
}

async function processNoshowsForClinic(clinicId) {
  // Predict for tomorrow's appointments
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const predictResult = await noshowSvc.predictNoshows(clinicId, tomorrow);

  if (!predictResult.success) {
    console.error(
      `[noshow.job] clinicId=${clinicId} predictNoshows failed`,
      predictResult.error,
    );
    return;
  }

  const scores = predictResult.data;
  if (!scores.length) return;

  // Persist the calculated AI risk scores back to appointments table
  await Promise.all(
    scores.map((s) =>
      supabase
        .from("appointments")
        .update({ noshow_risk: s.riskScore })
        .eq("id", s.appointmentId)
    )
  );

  // Take top N highest-risk appointments
  const highRisk = scores
    .slice(0, TOP_RISK_COUNT)
    .filter((s) => s.riskScore >= 0.5);

  if (!highRisk.length) {
    console.info(
      `[noshow.job] clinicId=${clinicId} no high-risk appointments for tomorrow`,
    );
    return;
  }

  // Fetch appointment details for each high-risk slot and send extra confirmation SMS
  for (const scored of highRisk) {
    try {
      const { data: appt, error: apptErr } = await supabase
        .from("appointments")
        .select(
          "id, patient_name, patient_phone, appointment_type, datetime, patient_id, clinics(name, timezone)",
        )
        .eq("id", scored.appointmentId)
        .eq("clinic_id", clinicId)
        .single();

      if (apptErr || !appt) continue;

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
        `Hi ${appt.patient_name}! Just confirming your ${appt.appointment_type} ` +
        `at ${appt.clinics?.name || "your clinic"} tomorrow, ${formattedDate} at ${formattedTime}. ` +
        `Reply CONFIRM to confirm or CANCEL to cancel. —Bytelytic`;

      // Create job record for crash-safety / audit
      const { data: jobRow } = await supabase
        .from("jobs")
        .insert({
          clinic_id: clinicId,
          job_type: "sms_dispatch",
          status: "pending",
          details: { appointmentId: appt.id, riskScore: scored.riskScore, purpose: "noshow_confirmation" }
        })
        .select()
        .single();

      const smsResult = await smsSvc.send(
        clinicId,
        appt.patient_phone,
        body,
        "reminder",
        appt.id,
        appt.patient_id,
      );

      if (jobRow) {
        await supabase
          .from("jobs")
          .update({
            status: smsResult.success ? "done" : "failed",
            error: smsResult.error || null,
            completed_at: new Date().toISOString()
          })
          .eq("id", jobRow.id);
      }

      if (smsResult.success) {
        console.info(
          `[noshow.job] clinicId=${clinicId} extra confirmation sent apptId=${appt.id} risk=${scored.riskScore}`,
        );
      } else {
        console.error(
          `[noshow.job] clinicId=${clinicId} sms failed apptId=${appt.id}`,
          smsResult.error,
        );
      }
    } catch (e) {
      console.error(
        `[noshow.job] clinicId=${clinicId} apptId=${scored.appointmentId} threw`,
        e.message,
      );
    }
  }
}

async function run() {
  console.info("[noshow.job] run started");

  let clinics;
  try {
    clinics = await getActiveClinics();
  } catch (e) {
    console.error("[noshow.job] failed to get active clinics", e.message);
    return;
  }

  for (const clinic of clinics) {
    try {
      await processNoshowsForClinic(clinic.id);
    } catch (e) {
      console.error(`[noshow.job] clinicId=${clinic.id} failed`, e.message);
    }
  }

  console.info("[noshow.job] run complete");
}

function start() {
  // Daily at 6pm UTC — gives staff time to act on predictions before end of day
  cron.schedule("0 18 * * *", run, { timezone: "UTC" });
  console.info("[noshow.job] scheduled — daily 18:00 UTC");
}

module.exports = { start, run };
