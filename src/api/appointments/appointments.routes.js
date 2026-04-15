"use strict";

const express = require("express");
const { supabase } = require("../../db/client");
const calendarSvc = require("../../services/calendar.service");

const router = express.Router();

// GET /appointments — list appointments (filter by date, status)
router.get("/", async (req, res, next) => {
  try {
    const { status, date_from, date_to } = req.query;
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const from = (page - 1) * limit;

    let query = supabase
      .from("appointments")
      .select(
        "id, patient_name, patient_phone, appointment_type, datetime, duration_minutes, status, booked_by, reminder_sent, insurance_verified, created_at",
        { count: "exact" },
      )
      .eq("clinic_id", req.clinicId)
      .order("datetime", { ascending: true })
      .range(from, from + limit - 1);

    if (status) query = query.eq("status", status);
    if (date_from) query = query.gte("datetime", date_from);
    if (date_to) query = query.lte("datetime", date_to);

    const { data, error, count } = await query;

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ data, meta: { page, limit, total: count } });
  } catch (error) {
    next(error);
  }
});

// GET /appointments/today — today's schedule
router.get("/today", async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).toISOString();
    const todayEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
    ).toISOString();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, patient_name, patient_phone, appointment_type, datetime, duration_minutes, status, booked_by, reminder_sent",
      )
      .eq("clinic_id", req.clinicId)
      .gte("datetime", todayStart)
      .lt("datetime", todayEnd)
      .order("datetime", { ascending: true });

    if (error) return res.status(400).json({ error: error.message });

    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

// POST /appointments — manual booking by staff
router.post("/", async (req, res, next) => {
  try {
    const {
      patient_name,
      patient_phone,
      appointment_type,
      datetime,
      duration_minutes,
      notes,
    } = req.body;

    if (!patient_name || !patient_phone || !datetime) {
      return res
        .status(400)
        .json({
          error: "patient_name, patient_phone, and datetime are required",
        });
    }

    // Create Google Calendar event first
    const calResult = await calendarSvc.createEvent(req.clinicId, {
      patient_name,
      appointment_type: appointment_type || "Follow-up",
      datetime,
      duration_minutes: duration_minutes || 30,
      notes,
    });

    const { data, error } = await supabase
      .from("appointments")
      .insert({
        clinic_id: req.clinicId,
        patient_name,
        patient_phone,
        appointment_type: appointment_type || "Follow-up",
        datetime,
        duration_minutes: duration_minutes || 30,
        google_event_id: calResult.success
          ? calResult.data.googleEventId
          : null,
        status: "scheduled",
        booked_by: "staff",
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

// PUT /appointments/:id — update status (confirm, cancel, no-show)
router.put("/:id", async (req, res, next) => {
  try {
    const allowed = ["status", "notes", "insurance_verified", "revenue_amount"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    // Auto-set confirmed_at when status flips to confirmed
    if (updates.status === "confirmed" && !updates.confirmed_at) {
      updates.confirmed_at = new Date().toISOString();
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: "No valid fields to update" });
    }

    const { data, error } = await supabase
      .from("appointments")
      .update(updates)
      .eq("id", req.params.id)
      .eq("clinic_id", req.clinicId)
      .select()
      .single();

    if (error || !data)
      return res.status(404).json({ error: "Appointment not found" });

    return res.json({ data });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
