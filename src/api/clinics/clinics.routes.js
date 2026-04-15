"use strict";

const express = require("express");
const { supabase } = require("../../db/client");

const router = express.Router();

// POST /clinics — onboard a new clinic (admin use during Phase 4)
router.post("/", async (req, res, next) => {
  try {
    const { name, owner_email, phone_number, timezone } = req.body;

    if (!name || !owner_email) {
      return res
        .status(400)
        .json({ error: "name and owner_email are required" });
    }

    const { data, error } = await supabase
      .from("clinics")
      .insert({ name, owner_email, phone_number, timezone })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });

    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
});

// GET /clinics/:id — get clinic settings
router.get("/:id", async (req, res, next) => {
  try {
    // Clinic owners can only see their own clinic
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { data, error } = await supabase
      .from("clinics")
      .select(
        "id, name, owner_email, phone_number, twilio_number, timezone, business_hours, appointment_types, recall_days, monthly_revenue_per_visit, is_active, created_at",
      )
      .eq("id", req.clinicId)
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Clinic not found" });

    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

// PUT /clinics/:id — update settings (hours, types, recall config)
router.put("/:id", async (req, res, next) => {
  try {
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const allowed = [
      "name",
      "phone_number",
      "twilio_number",
      "timezone",
      "business_hours",
      "appointment_types",
      "recall_days",
      "monthly_revenue_per_visit",
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
