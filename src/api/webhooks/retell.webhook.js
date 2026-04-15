"use strict";

const crypto = require("crypto");
const express = require("express");
const env = require("../../config/env");
const voiceSvc = require("../../services/voice.service");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// SIGNATURE VERIFICATION
// Retell signs every webhook with HMAC-SHA256 using the
// RETELL_WEBHOOK_SECRET. Reject anything that doesn't match.
// ─────────────────────────────────────────────────────────────
function verifyRetellSignature(req) {
  const secret = env.retellWebhookSecret;
  if (!secret) return true; // skip if secret not configured in dev

  const signature = req.headers["x-retell-signature"] || "";
  const payload = JSON.stringify(req.body);
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("hex");

  // timingSafeEqual requires equal-length buffers — guard against malformed sigs
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}

// ─────────────────────────────────────────────────────────────
// POST /webhooks/retell
//
// CRITICAL RULE (CLAUDE.md): always return 200 immediately.
// If we return 4xx/5xx Retell will retry → duplicate bookings.
// Process the event async AFTER the response is sent.
// ─────────────────────────────────────────────────────────────
router.post("/", (req, res) => {
  // 1. ACK immediately — Retell requires a fast response
  res.sendStatus(200);

  // 2. Verify signature — discard silently if invalid
  try {
    if (!verifyRetellSignature(req)) {
      console.warn("[retell.webhook] invalid signature — discarding event");
      return;
    }
  } catch (e) {
    console.warn("[retell.webhook] signature check error:", e.message);
    return;
  }

  const raw = req.body;

  // Retell v4 wraps all call data inside raw.call — flatten it here
  // so voice.service.js can read event.transcript, event.call_id etc. directly
  const callData = raw.call || {};
  const event = {
    ...callData,
    event: raw.event,
  };

  const eventType = raw.event;
  const callStatus = callData.call_status;
  const callId = callData.call_id;

  console.info(
    `[retell.webhook] event=${eventType} call_id=${callId} status=${callStatus}`,
  );

  // call_analyzed fires after call_ended and has the richest transcript — use it
  if (eventType === "call_analyzed") {
    handleCallEnded(event);
  } else if (eventType === "call_ended" || callStatus === "ended") {
    handleCallEnded(event);
  } else if (eventType === "call_started" || callStatus === "ongoing") {
    handleCallStarted(event);
  } else {
    console.info(`[retell.webhook] unhandled event="${eventType}" — skipping`);
  }
});

// ─────────────────────────────────────────────────────────────
// ASYNC HANDLERS (fire-and-forget — response already sent)
// ─────────────────────────────────────────────────────────────

async function handleCallStarted(event) {
  try {
    const result = await voiceSvc.handleCallEvent({
      ...event,
      call_status: "initiated",
    });
    if (!result.success) {
      console.error("[retell.webhook] handleCallStarted error:", result.error);
    }
  } catch (e) {
    console.error("[retell.webhook] handleCallStarted threw:", e.message);
  }
}

async function handleCallEnded(event) {
  try {
    const result = await voiceSvc.handleCallEvent({
      ...event,
      call_status: "ended",
    });
    if (result.success) {
      console.info(
        `[retell.webhook] call processed action=${result.data?.action} apptId=${result.data?.appointmentId || "none"}`,
      );
    } else {
      console.error("[retell.webhook] handleCallEnded error:", result.error);
    }
  } catch (e) {
    console.error("[retell.webhook] handleCallEnded threw:", e.message);
  }
}

module.exports = router;
