"use strict";

const express = require("express");
const { supabase } = require("../../db/client");

const router = express.Router();

// GET /patients — list all patients for this clinic (with pagination)
router.get("/", async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const from = (page - 1) * limit;
    const search = req.query.search?.trim();

    let query = supabase
      .from("patients")
      .select(
        "id, name, phone, email, last_visit_date, total_visits, no_show_count, recall_opted_out, created_at",
        { count: "exact" },
      )
      .eq("clinic_id", req.clinicId)
      .order("created_at", { ascending: false })
      .range(from, from + limit - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    const { data, error, count } = await query;

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ data, meta: { page, limit, total: count } });
  } catch (error) {
    next(error);
  }
});

// GET /patients/:id — single patient + full visit history
router.get("/:id", async (req, res, next) => {
  try {
    const { data: patient, error: patErr } = await supabase
      .from("patients")
      .select("*")
      .eq("id", req.params.id)
      .eq("clinic_id", req.clinicId)
      .single();

    if (patErr || !patient)
      return res.status(404).json({ error: "Patient not found" });

    // Fetch history in parallel — all filtered by clinic_id
    const [apptRes, callRes, smsRes] = await Promise.all([
      supabase
        .from("appointments")
        .select(
          "id, appointment_type, datetime, status, booked_by, revenue_amount",
        )
        .eq("clinic_id", req.clinicId)
        .eq("patient_id", req.params.id)
        .order("datetime", { ascending: false })
        .limit(20),
      supabase
        .from("calls")
        .select(
          "id, direction, call_type, duration_seconds, outcome, started_at",
        )
        .eq("clinic_id", req.clinicId)
        .eq("patient_id", req.params.id)
        .order("started_at", { ascending: false })
        .limit(20),
      supabase
        .from("sms_messages")
        .select("id, direction, sms_type, body, status, created_at")
        .eq("clinic_id", req.clinicId)
        .eq("patient_id", req.params.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    return res.json({
      data: {
        patient,
        appointments: apptRes.data || [],
        calls: callRes.data || [],
        smsMessages: smsRes.data || [],
      },
    });
  } catch (error) {
    next(error);
  }
});

// POST /patients — create patient manually
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, date_of_birth, insurance_provider, notes } =
      req.body;

    if (!name || !phone) {
      return res.status(400).json({ error: "name and phone are required" });
    }

    const { data, error } = await supabase
      .from("patients")
      .insert({
        clinic_id: req.clinicId,
        name,
        phone,
        email,
        date_of_birth,
        insurance_provider,
        notes,
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

// PUT /patients/:id — update patient info
router.put("/:id", async (req, res, next) => {
  try {
    const allowed = [
      "name",
      "email",
      "date_of_birth",
      "insurance_provider",
      "insurance_member_id",
      "preferred_time",
      "notes",
      "recall_opted_out",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const { data, error } = await supabase
      .from("patients")
      .update(updates)
      .eq("id", req.params.id)
      .eq("clinic_id", req.clinicId)
      .select()
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Patient not found" });

    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
