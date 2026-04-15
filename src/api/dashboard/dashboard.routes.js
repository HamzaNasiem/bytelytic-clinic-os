"use strict";

const express = require("express");
const { supabase } = require("../../db/client");
const revenueSvc = require("../../services/revenue.service");

const router = express.Router();

// GET /dashboard/stats — main overview card data
router.get("/stats", async (req, res, next) => {
  try {
    const now = new Date();
    const monthStart = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
    ).toISOString();
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      1,
    ).toISOString();
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

    const [revenueRes, callsRes, apptRes, todayApptRes] = await Promise.all([
      // Revenue recovered this month
      supabase
        .from("revenue_events")
        .select("amount_cents")
        .eq("clinic_id", req.clinicId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd),

      // Calls this month
      supabase
        .from("calls")
        .select("id, outcome, duration_seconds")
        .eq("clinic_id", req.clinicId)
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd),

      // AI-booked appointments this month
      supabase
        .from("appointments")
        .select("id, booked_by")
        .eq("clinic_id", req.clinicId)
        .eq("booked_by", "ai")
        .gte("created_at", monthStart)
        .lt("created_at", monthEnd),

      // Today's appointments
      supabase
        .from("appointments")
        .select("id, status")
        .eq("clinic_id", req.clinicId)
        .gte("datetime", todayStart)
        .lt("datetime", todayEnd),
    ]);

    const totalRevenueCents = (revenueRes.data || []).reduce(
      (s, e) => s + e.amount_cents,
      0,
    );
    const calls = callsRes.data || [];
    const answeredCalls = calls.filter((c) => c.outcome !== "no_answer").length;
    const answerRate = calls.length
      ? Math.round((answeredCalls / calls.length) * 100)
      : 0;
    const avgDuration = calls.length
      ? Math.round(
          calls.reduce((s, c) => s + (c.duration_seconds || 0), 0) /
            calls.length,
        )
      : 0;

    return res.json({
      data: {
        revenueRecoveredCents: totalRevenueCents,
        revenueRecoveredDollars: Math.round(totalRevenueCents / 100),
        callsAnswered: answeredCalls,
        callsTotal: calls.length,
        answerRatePercent: answerRate,
        appointmentsBookedByAi: (apptRes.data || []).length,
        avgCallDurationSeconds: avgDuration,
        todayAppointments: (todayApptRes.data || []).length,
        todayNoShows: (todayApptRes.data || []).filter(
          (a) => a.status === "no_show",
        ).length,
      },
    });
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/revenue — revenue breakdown by type + MoM
router.get("/revenue", async (req, res, next) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const result = await revenueSvc.getMonthlyStats(req.clinicId, month, year);

    if (!result.success) return res.status(500).json({ error: result.error });

    return res.json({ data: result.data });
  } catch (error) {
    next(error);
  }
});

// GET /dashboard/timeline — daily call + booking volume for last 30 days
router.get("/timeline", async (req, res, next) => {
  try {
    const days = Math.min(90, parseInt(req.query.days) || 30);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);

    const [callsRes, apptRes] = await Promise.all([
      supabase
        .from("calls")
        .select("created_at, outcome")
        .eq("clinic_id", req.clinicId)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: true }),
      supabase
        .from("appointments")
        .select("created_at, booked_by")
        .eq("clinic_id", req.clinicId)
        .gte("created_at", cutoff.toISOString())
        .order("created_at", { ascending: true }),
    ]);

    // Bucket into daily counts
    const byDay = {};

    for (const call of callsRes.data || []) {
      const day = call.created_at.slice(0, 10); // YYYY-MM-DD
      if (!byDay[day]) byDay[day] = { date: day, calls: 0, bookings: 0 };
      byDay[day].calls++;
    }

    for (const appt of apptRes.data || []) {
      const day = appt.created_at.slice(0, 10);
      if (!byDay[day]) byDay[day] = { date: day, calls: 0, bookings: 0 };
      if (appt.booked_by === "ai") byDay[day].bookings++;
    }

    const timeline = Object.values(byDay).sort((a, b) =>
      a.date.localeCompare(b.date),
    );

    return res.json({ data: timeline });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
