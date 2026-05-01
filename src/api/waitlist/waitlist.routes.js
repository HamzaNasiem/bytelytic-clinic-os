"use strict";

const express = require("express");
const { supabase } = require("../../db/client");
const waitlistSvc = require("../../services/waitlist.service");

const router = express.Router();

// GET /waitlist — view current pending waitlist
router.get("/", async (req, res, next) => {
  try {
    const result = await waitlistSvc.getWaitlistCandidates(req.clinicId);
    if (!result.success) return res.status(400).json({ error: result.error });
    return res.json({ data: result.data });
  } catch (error) {
    next(error);
  }
});

// POST /waitlist — add patient to waitlist
router.post("/", async (req, res, next) => {
  try {
    const { patient_id, appointment_type, preferred_dates } = req.body;

    if (!patient_id || !appointment_type) {
      return res.status(400).json({ error: "patient_id and appointment_type are required" });
    }

    const { data, error } = await supabase
      .from("waitlist")
      .insert({
        clinic_id: req.clinicId,
        patient_id,
        appointment_type,
        preferred_dates: preferred_dates || []
      })
      .select()
      .single();

    if (error) return res.status(400).json({ error: error.message });
    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

// POST /waitlist/offer — trigger AI to call a waitlisted patient
router.post("/offer", async (req, res, next) => {
  try {
    const { waitlistId, dateStr } = req.body;

    if (!waitlistId || !dateStr) {
      return res.status(400).json({ error: "waitlistId and dateStr are required" });
    }

    const result = await waitlistSvc.offerSlot(req.clinicId, waitlistId, dateStr);

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    return res.json({ data: result.data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
