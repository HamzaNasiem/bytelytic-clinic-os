"use strict";

const { google } = require("googleapis");
const { supabase } = require("../db/client");
const env = require("../config/env");

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Build an authenticated Google OAuth2 client for a clinic.
 * Each clinic has its own refresh_token so calendars stay isolated.
 */
async function getAuthClient(clinicId) {
  const { data: clinic, error } = await supabase
    .from("clinics")
    .select(
      "google_refresh_token, google_calendar_id, timezone, business_hours",
    )
    .eq("id", clinicId)
    .single();

  if (error || !clinic) throw new Error(`Clinic ${clinicId} not found`);
  if (!clinic.google_refresh_token)
    throw new Error(`Clinic ${clinicId} has no Google refresh token`);

  const oauth2Client = new google.auth.OAuth2(
    env.googleClientId,
    env.googleClientSecret,
    env.googleRedirectUri,
  );
  oauth2Client.setCredentials({ refresh_token: clinic.google_refresh_token });

  return { oauth2Client, clinic };
}

function parseBusinessHours(rangeStr) {
  const [startStr, endStr] = rangeStr.split("-");
  const [startHour, startMin] = startStr.split(":").map(Number);
  const [endHour, endMin] = endStr.split(":").map(Number);
  return { startHour, startMin, endHour, endMin };
}

function getDayKey(date, timezone) {
  const dayName = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: timezone,
  }).format(date);
  return dayName.slice(0, 3).toLowerCase(); // "Mon" → "mon"
}

// ─────────────────────────────────────────────────────────────
// EXPORTED SERVICE FUNCTIONS
// ─────────────────────────────────────────────────────────────

/**
 * getAvailableSlots
 * Returns open time slots for a given date that fit within the clinic's
 * business hours and do not overlap existing Google Calendar events.
 *
 * @param {string}      clinicId
 * @param {string|Date} date
 * @param {number}      durationMinutes  Default 30
 * @returns {{ success: boolean, data?: string[], error?: string }}
 */
async function getAvailableSlots(clinicId, date, durationMinutes = 30) {
  try {
    const { oauth2Client, clinic } = await getAuthClient(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const dayDate = new Date(date);
    const dayKey = getDayKey(dayDate, clinic.timezone);
    const hours = clinic.business_hours?.[dayKey];

    if (!hours) {
      return { success: true, data: [] }; // clinic closed that day
    }

    const { startHour, startMin, endHour, endMin } = parseBusinessHours(hours);

    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: clinic.timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    const localDateStr = formatter.format(dayDate);

    const dayStart = new Date(
      `${localDateStr}T${String(startHour).padStart(2, "0")}:${String(startMin).padStart(2, "0")}:00`,
    );
    const dayEnd = new Date(
      `${localDateStr}T${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}:00`,
    );

    const eventsRes = await calendar.events.list({
      calendarId: clinic.google_calendar_id || "primary",
      timeMin: dayStart.toISOString(),
      timeMax: dayEnd.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const busy = (eventsRes.data.items || [])
      .filter((e) => e.start?.dateTime && e.end?.dateTime)
      .map((e) => ({
        start: new Date(e.start.dateTime),
        end: new Date(e.end.dateTime),
      }));

    const slots = [];
    const slotMs = durationMinutes * 60 * 1000;
    let cursor = new Date(dayStart);

    while (cursor.getTime() + slotMs <= dayEnd.getTime()) {
      const slotEnd = new Date(cursor.getTime() + slotMs);
      const overlaps = busy.some((b) => cursor < b.end && slotEnd > b.start);
      if (!overlaps) slots.push(cursor.toISOString());
      cursor = new Date(cursor.getTime() + slotMs);
    }

    return { success: true, data: slots };
  } catch (error) {
    console.error(
      `[calendar.getAvailableSlots] clinicId=${clinicId}`,
      error.message,
    );
    return { success: false, error: error.message };
  }
}

/**
 * createEvent
 * Creates a Google Calendar event and returns the event ID.
 *
 * @param {string} clinicId
 * @param {object} appointment  { patient_name, appointment_type, datetime, duration_minutes, notes }
 * @returns {{ success: boolean, data?: { googleEventId: string }, error?: string }}
 */
async function createEvent(clinicId, appointment) {
  try {
    const { oauth2Client, clinic } = await getAuthClient(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    const startTime = new Date(appointment.datetime);
    const endTime = new Date(
      startTime.getTime() + (appointment.duration_minutes || 30) * 60 * 1000,
    );

    const res = await calendar.events.insert({
      calendarId: clinic.google_calendar_id || "primary",
      sendUpdates: "none",
      resource: {
        summary: `${appointment.appointment_type} — ${appointment.patient_name}`,
        description: appointment.notes || "Booked by Bytelytic Clinic OS AI",
        start: {
          dateTime: startTime.toISOString(),
          timeZone: clinic.timezone || "America/Chicago",
        },
        end: {
          dateTime: endTime.toISOString(),
          timeZone: clinic.timezone || "America/Chicago",
        },
        reminders: {
          useDefault: false,
          overrides: [{ method: "popup", minutes: 30 }],
        },
      },
    });

    const googleEventId = res.data.id;
    console.log(
      `[calendar.createEvent] clinicId=${clinicId} eventId=${googleEventId}`,
    );
    return { success: true, data: { googleEventId } };
  } catch (error) {
    console.error(`[calendar.createEvent] clinicId=${clinicId}`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * cancelEvent
 * Deletes a Google Calendar event. Treats 404/410 as success (idempotent).
 *
 * @param {string} clinicId
 * @param {string} googleEventId
 * @returns {{ success: boolean, error?: string }}
 */
async function cancelEvent(clinicId, googleEventId) {
  try {
    const { oauth2Client, clinic } = await getAuthClient(clinicId);
    const calendar = google.calendar({ version: "v3", auth: oauth2Client });

    await calendar.events.delete({
      calendarId: clinic.google_calendar_id || "primary",
      eventId: googleEventId,
      sendUpdates: "none",
    });

    console.log(
      `[calendar.cancelEvent] clinicId=${clinicId} eventId=${googleEventId} deleted`,
    );
    return { success: true };
  } catch (error) {
    if (error.code === 404 || error.code === 410) {
      console.warn(
        `[calendar.cancelEvent] clinicId=${clinicId} event already gone eventId=${googleEventId}`,
      );
      return { success: true };
    }
    console.error(`[calendar.cancelEvent] clinicId=${clinicId}`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = { getAvailableSlots, createEvent, cancelEvent };
