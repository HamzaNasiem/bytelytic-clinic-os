"use strict";

const express = require("express");
const { createClient } = require("@supabase/supabase-js");
const { google } = require("googleapis");
const env = require("../config/env");
const { supabase } = require("../db/client");
const { authenticate } = require("../middleware/auth.middleware");

const retellWebhook = require("./webhooks/retell.webhook");
const twilioWebhook = require("./webhooks/twilio.webhook");
const clinicsRoutes = require("./clinics/clinics.routes");
const patientsRoutes = require("./patients/patients.routes");
const appointmentsRoutes = require("./appointments/appointments.routes");
const dashboardRoutes = require("./dashboard/dashboard.routes");
const callsRoutes = require("./calls/calls.routes");
const waitlistRoutes = require("./waitlist/waitlist.routes");
const voiceSvc = require("../services/voice.service");

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// WEBHOOKS — no auth middleware (signature verified inside each router)
// ─────────────────────────────────────────────────────────────
router.use("/webhooks/retell", retellWebhook);
router.use("/webhooks/twilio", twilioWebhook);

// ─────────────────────────────────────────────────────────────
// AUTH ROUTES
// ─────────────────────────────────────────────────────────────

// POST /auth/signup — Public registration
router.post("/auth/signup", async (req, res, next) => {
  try {
    const {
      email,
      password,
      clinicName,
      timezone,
      specialty,
      city,
      doctorName,
      doctorCredentials,
      doctorPhone,
      businessHours,
      appointmentTypes,
    } = req.body;

    if (!email || !password || !clinicName) {
      return res.status(400).json({ error: "Email, password, and clinic name are required" });
    }

    const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const { data: authData, error: authErr } = await anonClient.auth.signUp({
      email,
      password,
    });

    if (authErr) return res.status(400).json({ error: authErr.message });

    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .insert({
        name: clinicName,
        owner_email: email,
        timezone: timezone || "America/Chicago",
        specialty: specialty || null,
        city: city || null,
        primary_doctor_name: doctorName || null,
        primary_doctor_credentials: doctorCredentials || null,
        primary_doctor_phone: doctorPhone || null,
        business_hours: businessHours || { "mon": "08:00-18:00", "tue": "08:00-18:00", "wed": "08:00-18:00", "thu": "08:00-18:00", "fri": "08:00-18:00" },
        appointment_types: appointmentTypes || [{ name: "General Checkup", duration: 30 }],
        is_active: true,
      })
      .select()
      .single();

    if (clinicErr) {
      console.error("[auth/signup] Failed to create clinic:", clinicErr.message);
      
      // Clean up the auth user if clinic creation fails
      // Note: We'd need admin client to delete user, but for now we just return a friendly error
      if (clinicErr.message.includes("clinics_owner_email_key")) {
        return res.status(400).json({ error: "This email is already registered. Please sign in instead." });
      }
      
      return res.status(500).json({ error: `Clinic setup failed: ${clinicErr.message}` });
    }

    return res.json({
      token: authData.session?.access_token || null, // Might be null if email confirmation is required
      clinicId: clinic.id,
      clinicName: clinic.name,
      timezone: clinic.timezone,
      message: "Signup successful"
    });
  } catch (error) {
    next(error);
  }
});

// POST /auth/login — email/password → Supabase JWT
router.post("/auth/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    // Use anon key for sign-in — service_role bypasses auth and must not be used here
    const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const { data, error } = await anonClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return res.status(401).json({ error: error.message });

    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("id, name, timezone, is_active")
      .eq("owner_email", email)
      .single();

    if (clinicErr || !clinic) {
      return res
        .status(403)
        .json({ error: "No clinic associated with this account" });
    }
    if (!clinic.is_active) {
      return res.status(403).json({ error: "Clinic account is inactive" });
    }

    return res.json({
      token: data.session.access_token,
      clinicId: clinic.id,
      clinicName: clinic.name,
      timezone: clinic.timezone,
    });
  } catch (error) {
    next(error);
  }
});

// GET /auth/me — current clinic info from JWT
router.get("/auth/me", authenticate, (req, res) => {
  res.json({ clinicId: req.clinicId, clinicName: req.clinicName });
});

// GET /auth/google — redirect to Google OAuth consent screen
// Accepts token via Authorization header OR ?token= query param
// (query param needed because browser window.location.href can't set headers)
router.get("/auth/google", async (req, res) => {
  try {
    // Support token from header OR query param
    let token = null;
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: "Missing token" });
    }

    // Verify token via Supabase
    const { createClient } = require("@supabase/supabase-js");
    const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const {
      data: { user },
      error,
    } = await anonClient.auth.getUser(token);
    if (error || !user) return res.status(401).json({ error: "Invalid token" });

    const oauth2Client = new google.auth.OAuth2(
      env.googleClientId,
      env.googleClientSecret,
      env.googleRedirectUri,
    );
    const url = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/calendar"],
      prompt: "consent",
      state: token, // pass token through OAuth flow to use in callback
    });
    res.redirect(url);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /auth/google/callback — Google redirects here with ?code=xxx&state=jwt_token
// state carries the JWT we passed in /auth/google so we know which clinic to update.
// No authenticate middleware — token arrives in state query param, not header.
router.get("/auth/google/callback", async (req, res, next) => {
  try {
    const { code, state: token, error: oauthError } = req.query;

    if (oauthError) {
      return res.status(400).send(`Google OAuth error: ${oauthError}`);
    }
    if (!code || !token) {
      return res.status(400).send("Missing code or state from Google redirect");
    }

    // Verify the JWT from state param to get clinicId
    const anonClient = createClient(env.supabaseUrl, env.supabaseAnonKey);
    const {
      data: { user },
      error: userErr,
    } = await anonClient.auth.getUser(token);
    if (userErr || !user) {
      return res.status(401).send("Invalid or expired token in state param");
    }

    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("owner_email", user.email)
      .single();
    if (clinicErr || !clinic) {
      return res.status(404).send("No clinic found for this account");
    }

    // Exchange auth code for tokens
    const oauth2Client = new google.auth.OAuth2(
      env.googleClientId,
      env.googleClientSecret,
      env.googleRedirectUri,
    );
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return res
        .status(400)
        .send(
          "No refresh_token returned. Go to myaccount.google.com/permissions, " +
            "revoke access for this app, then retry.",
        );
    }

    // Save refresh_token to clinic row
    await supabase
      .from("clinics")
      .update({ google_refresh_token: tokens.refresh_token })
      .eq("id", clinic.id);

    console.log(
      `[auth.google.callback] clinicId=${clinic.id} Google Calendar connected`,
    );

    // Show success page — clinic owner sees this in browser
    return res.send(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
        <h2>✅ Google Calendar Connected!</h2>
        <p><strong>${clinic.name}</strong> is now connected to Google Calendar.</p>
        <p>Appointments booked by AI will appear in your calendar automatically.</p>
        <p style="color:#666;font-size:14px">You can close this tab.</p>
      </body></html>
    `);
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────
// PROTECTED ROUTES — all require valid JWT
// req.clinicId is injected by authenticate — never trust body/params
// ─────────────────────────────────────────────────────────────
router.use("/clinics", authenticate, clinicsRoutes);
router.use("/patients", authenticate, patientsRoutes);
router.use("/appointments", authenticate, appointmentsRoutes);
router.use("/dashboard", authenticate, dashboardRoutes);
router.use("/calls", authenticate, callsRoutes);
router.use("/waitlist", authenticate, waitlistRoutes);

// POST /clinics/:id/create-agent — one-time Retell AI agent creation
router.post(
  "/clinics/:id/create-agent",
  authenticate,
  async (req, res, next) => {
    try {
      if (req.params.id !== req.clinicId) {
        return res.status(403).json({ error: "Access denied" });
      }
      const result = await voiceSvc.createAgent(req.clinicId);
      if (!result.success) return res.status(500).json({ error: result.error });
      return res.json({ data: result.data });
    } catch (error) {
      next(error);
    }
  },
);

// PUT /clinics/:id — allows updating twilio_number and other fields
router.put("/clinics/:id", authenticate, async (req, res, next) => {
  try {
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ error: "Access denied" });
    }
    const allowed = [
      "twilio_number",
      "name",
      "timezone",
      "business_hours",
      "appointment_types",
      "monthly_revenue_per_visit",
      "recall_days",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }
    const { data, error } = await supabase
      .from("clinics")
      .update(updates)
      .eq("id", req.clinicId)
      .select()
      .single();
    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
