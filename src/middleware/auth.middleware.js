"use strict";

const { createClient } = require("@supabase/supabase-js");
const env = require("../config/env");
const { supabase } = require("../db/client");

// Separate client with anon key for JWT verification.
// The service_role client in db/client.js bypasses RLS and must never
// be used for auth token verification.
const authClient = createClient(env.supabaseUrl, env.supabaseAnonKey);

/**
 * authenticate
 * Verifies the Supabase JWT from the Authorization header.
 * Attaches req.clinicId and req.user — every protected route uses these.
 *
 * NEVER trust clinicId from req.body or req.params — always use req.clinicId.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res
        .status(401)
        .json({ error: "Missing or malformed Authorization header" });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error: authErr,
    } = await authClient.auth.getUser(token);

    if (authErr || !user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Map Supabase user → clinic row (owner_email is the link)
    const { data: clinic, error: clinicErr } = await supabase
      .from("clinics")
      .select("id, name, is_active")
      .eq("owner_email", user.email)
      .single();

    if (clinicErr || !clinic) {
      return res
        .status(403)
        .json({ error: "No clinic associated with this account" });
    }

    if (!clinic.is_active) {
      return res.status(403).json({ error: "Clinic account is inactive" });
    }

    req.clinicId = clinic.id;
    req.clinicName = clinic.name;
    req.user = user;

    next();
  } catch (error) {
    console.error("[auth.middleware]", error.message);
    return res.status(500).json({ error: "Authentication error" });
  }
}

module.exports = { authenticate };
