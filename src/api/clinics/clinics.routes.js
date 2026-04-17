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

// POST /clinics/:id/factory-reset — completely wipe clinic's daily operational data
router.post("/:id/factory-reset", async (req, res, next) => {
  try {
    if (req.params.id !== req.clinicId) {
      return res.status(403).json({ error: "Access denied" });
    }

    const { confirmation } = req.body;
    if (confirmation !== "DELETE EVERYTHING") {
      return res.status(400).json({ error: "Invalid confirmation phrase" });
    }

    // Delete sequentially to respect foreign key constraints:
    // 1. sms_messages (references appointments and patients)
    // 2. revenue_events (references appointments/patients)
    // 3. calls (references patients)
    // 4. appointments (references patients)
    // 5. patients (root)
    
    let error;

    const res1 = await supabase.from("sms_messages").delete().eq("clinic_id", req.clinicId);
    if (res1.error) throw new Error(res1.error.message);

    const res2 = await supabase.from("revenue_events").delete().eq("clinic_id", req.clinicId);
    if (res2.error) throw new Error(res2.error.message);

    const res3 = await supabase.from("calls").delete().eq("clinic_id", req.clinicId);
    if (res3.error) throw new Error(res3.error.message);

    const res4 = await supabase.from("appointments").delete().eq("clinic_id", req.clinicId);
    if (res4.error) throw new Error(res4.error.message);

    const res5 = await supabase.from("patients").delete().eq("clinic_id", req.clinicId);
    if (res5.error) throw new Error(res5.error.message);

    return res.json({ success: true, message: "Factory reset complete." });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
