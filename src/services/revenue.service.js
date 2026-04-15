"use strict";

const { supabase } = require("../db/client");

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * recordEvent
 * Inserts a single revenue_event row. Always call this when AI books anything.
 *
 * @param {string}      clinicId
 * @param {string}      type           revenue_events.event_type CHECK value
 * @param {number}      amountCents    Integer USD cents
 * @param {string|null} appointmentId
 * @param {string|null} description
 * @returns {{ success: boolean, data?: { id: string }, error?: string }}
 */
async function recordEvent(
  clinicId,
  type,
  amountCents,
  appointmentId = null,
  description = null,
) {
  try {
    const { data, error } = await supabase
      .from("revenue_events")
      .insert({
        clinic_id: clinicId,
        event_type: type,
        amount_cents: amountCents,
        appointment_id: appointmentId,
        description,
      })
      .select()
      .single();

    if (error)
      throw new Error(`Failed to insert revenue event: ${error.message}`);

    console.log(
      `[revenue.recordEvent] clinicId=${clinicId} type=${type} amount=${amountCents}`,
    );
    return { success: true, data: { id: data.id } };
  } catch (error) {
    console.error(`[revenue.recordEvent] clinicId=${clinicId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * getMonthlyStats
 * Aggregates revenue_events for a given month and computes month-over-month change.
 *
 * @param {string} clinicId
 * @param {number} month   1–12
 * @param {number} year    e.g. 2026
 * @returns {{ success: boolean, data?: object, error?: string }}
 */
async function getMonthlyStats(clinicId, month, year) {
  try {
    const startDate = new Date(year, month - 1, 1).toISOString();
    const endDate = new Date(year, month, 1).toISOString(); // first day of next month

    const { data: events, error: eventsErr } = await supabase
      .from("revenue_events")
      .select("event_type, amount_cents, created_at")
      .eq("clinic_id", clinicId)
      .gte("created_at", startDate)
      .lt("created_at", endDate);

    if (eventsErr)
      throw new Error(`Failed to fetch revenue events: ${eventsErr.message}`);

    // Aggregate by event_type
    const breakdown = {};
    let totalCents = 0;

    for (const event of events || []) {
      if (!breakdown[event.event_type]) {
        breakdown[event.event_type] = { count: 0, amount_cents: 0 };
      }
      breakdown[event.event_type].count++;
      breakdown[event.event_type].amount_cents += event.amount_cents;
      totalCents += event.amount_cents;
    }

    // Fetch prior month for MoM comparison
    const prevStart = new Date(year, month - 2, 1).toISOString();
    const { data: prevEvents } = await supabase
      .from("revenue_events")
      .select("amount_cents")
      .eq("clinic_id", clinicId)
      .gte("created_at", prevStart)
      .lt("created_at", startDate);

    const prevTotalCents = (prevEvents || []).reduce(
      (sum, e) => sum + e.amount_cents,
      0,
    );
    const momChangePercent =
      prevTotalCents > 0
        ? Math.round(((totalCents - prevTotalCents) / prevTotalCents) * 100)
        : null;

    console.log(
      `[revenue.getMonthlyStats] clinicId=${clinicId} month=${month}/${year} total=${totalCents}`,
    );
    return {
      success: true,
      data: {
        totalCents,
        totalDollars: Math.round(totalCents / 100),
        breakdown,
        momChangePercent,
        month,
        year,
      },
    };
  } catch (error) {
    console.error(
      `[revenue.getMonthlyStats] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

module.exports = { recordEvent, getMonthlyStats };
