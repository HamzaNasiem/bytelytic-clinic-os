"use strict";

const express = require("express");
const { supabase } = require("../../db/client");

const router = express.Router();

// GET /calls — list all calls for this clinic
router.get("/", async (req, res, next) => {
  try {
    const limit = Math.min(200, parseInt(req.query.limit) || 50);
    const { direction, outcome, patient_id, from_number, appointment_id } = req.query;

    let query = supabase
      .from("calls")
      .select(
        "id, direction, call_type, from_number, to_number, patient_id, patient_name, duration_seconds, outcome, status, transcript, recording_url, started_at, ended_at, appointment_id, created_at, patients(id, name, phone)",
        { count: "exact" }
      )
      .eq("clinic_id", req.clinicId)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (direction)      query = query.eq("direction", direction);
    if (outcome)        query = query.eq("outcome", outcome);
    if (patient_id)     query = query.eq("patient_id", patient_id);
    if (from_number)    query = query.eq("from_number", from_number);
    if (appointment_id) query = query.eq("appointment_id", appointment_id);

    const { data, error, count } = await query;
    if (error) return res.status(400).json({ error: error.message });

    return res.json({ data, meta: { total: count, limit } });
  } catch (error) {
    next(error);
  }
});

// GET /calls/:id — single call with transcript + linked appointment
router.get("/:id", async (req, res, next) => {
  try {
    const { data: call, error } = await supabase
      .from("calls")
      .select("*, appointments(id, appointment_type, datetime, status), patients(id, name, phone)")
      .eq("id", req.params.id)
      .eq("clinic_id", req.clinicId)
      .single();

    if (error || !call) return res.status(404).json({ error: "Call not found" });

    return res.json({ data: call });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
