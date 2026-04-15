"use strict";

const express = require("express");
const twilio = require("twilio");
const env = require("../../config/env");
const smsSvc = require("../../services/sms.service");
const { supabase } = require("../../db/client");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SIGNATURE VERIFICATION
// Twilio signs every webhook POST with the full public URL + params.
// 4xx on failure is safe here — Twilio does NOT retry on invalid sig.
// ─────────────────────────────────────────────────────────────
function buildWebhookUrl(req, path = "") {
  const base = env.webhookBaseUrl || `${req.protocol}://${req.get("host")}`;
  return `${base}/webhooks/twilio${path}`;
}

function verifyTwilioSignature(req, webhookPath) {
  if (!env.twilioAuthToken) return true; // skip in local dev if not configured

  const webhookUrl = buildWebhookUrl(req, webhookPath);
  const signature = req.headers["x-twilio-signature"] || "";

  return twilio.validateRequest(
    env.twilioAuthToken,
    signature,
    webhookUrl,
    req.body,
  );
}

// ─────────────────────────────────────────────────────────────
// RESOLVE CLINIC FROM "TO" NUMBER
// ─────────────────────────────────────────────────────────────
async function resolveClinicId(toNumber) {
  if (!toNumber) return null;

  const { data: clinic } = await supabase
    .from("clinics")
    .select("id")
    .eq("twilio_number", toNumber)
    .single();

  return clinic?.id || null;
}

// ─────────────────────────────────────────────────────────────
// POST /webhooks/twilio/sms
//
// CRITICAL RULE (CLAUDE.md): return 200 immediately.
// Respond with empty TwiML (no auto-reply) — sms.service handles reply.
// ─────────────────────────────────────────────────────────────
router.post("/sms", async (req, res) => {
  // ACK with empty TwiML — Twilio stops waiting for a reply SMS
  res.set("Content-Type", "text/xml");
  res.send("<Response></Response>");

  // Verify signature after sending so Twilio doesn't retry on our processing delay
  if (!verifyTwilioSignature(req, "/sms")) {
    console.warn("[twilio.webhook/sms] invalid signature — discarding");
    return;
  }

  const { From, To, Body, MessageSid } = req.body;

  if (!From || !Body) {
    console.warn("[twilio.webhook/sms] missing From or Body — discarding");
    return;
  }

  console.info(
    `[twilio.webhook/sms] from=${From} sid=${MessageSid} body="${Body.slice(0, 60)}"`,
  );

  const clinicId = await resolveClinicId(To);

  if (!clinicId) {
    console.warn(`[twilio.webhook/sms] no clinic found for number=${To}`);
    return;
  }

  handleInboundSms(From, Body, clinicId, MessageSid);
});

// ─────────────────────────────────────────────────────────────
// POST /webhooks/twilio/status
// Delivery status callbacks — update sms_messages.status
// ─────────────────────────────────────────────────────────────
router.post("/status", async (req, res) => {
  res.sendStatus(200);

  if (!verifyTwilioSignature(req, "/status")) {
    console.warn("[twilio.webhook/status] invalid signature — discarding");
    return;
  }

  const { MessageSid, MessageStatus } = req.body;
  if (!MessageSid || !MessageStatus) return;

  console.info(
    `[twilio.webhook/status] sid=${MessageSid} status=${MessageStatus}`,
  );

  // Map Twilio states to our schema values — ignore intermediate states
  const statusMap = {
    delivered: "delivered",
    sent: "sent",
    failed: "failed",
    undelivered: "failed",
  };
  const mapped = statusMap[MessageStatus];
  if (!mapped) return;

  try {
    // No clinic_id filter here — twilio_sid is globally unique (UNIQUE constraint)
    await supabase
      .from("sms_messages")
      .update({ status: mapped })
      .eq("twilio_sid", MessageSid);
  } catch (e) {
    console.error("[twilio.webhook/status] DB update failed:", e.message);
  }
});

// ─────────────────────────────────────────────────────────────
// ASYNC HANDLER — isolated so one failure doesn't affect others
// ─────────────────────────────────────────────────────────────
async function handleInboundSms(from, body, clinicId, twilioSid) {
  try {
    const result = await smsSvc.handleInbound(from, body, clinicId, twilioSid);

    if (result.success) {
      console.info(
        `[twilio.webhook/sms] handled clinicId=${clinicId} intent=${result.data?.intent} sentiment=${result.data?.sentiment}`,
      );
    } else {
      console.error("[twilio.webhook/sms] handleInbound error:", result.error);
    }
  } catch (e) {
    console.error("[twilio.webhook/sms] handleInboundSms threw:", e.message);
  }
}

module.exports = router;
