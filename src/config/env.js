"use strict";

require("dotenv").config();

// ============================================================
// Required environment variables — app crashes immediately
// if any of these are missing. This prevents silent failures
// caused by misconfigured deployments.
// ============================================================

const REQUIRED_VARS = [
  // Supabase
  "SUPABASE_URL",
  "SUPABASE_SERVICE_KEY",
  "SUPABASE_ANON_KEY",

  // Retell AI
  "RETELL_API_KEY",
  // RETELL_WEBHOOK_SECRET is optional — if not set, signature verification is skipped (dev only)

  // Twilio
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_DEFAULT_NUMBER",

  // Google Calendar OAuth
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",
  "GOOGLE_REDIRECT_URI",

  // OpenRouter primary key (backup key is optional)
  "OPENROUTER_API_KEY",

  // App URLs
  "API_BASE_URL",
  "DASHBOARD_URL",
  "WEBHOOK_BASE_URL",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  console.error("\n========================================");
  console.error("  STARTUP FAILED — Missing env vars:");
  console.error("========================================");
  missing.forEach((key) => console.error(`  ✗  ${key}`));
  console.error("\nCopy .env.example to .env and fill in all values.");
  console.error("========================================\n");
  process.exit(1);
}

// ============================================================
// Exported config — all other modules import from here,
// never from process.env directly.
// ============================================================

const config = {
  // Server
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  isProd: process.env.NODE_ENV === "production",

  // Supabase
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY,
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY,

  // Retell AI
  retellApiKey: process.env.RETELL_API_KEY,
  retellWebhookSecret: process.env.RETELL_WEBHOOK_SECRET,

  // Twilio
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioDefaultNumber: process.env.TWILIO_DEFAULT_NUMBER,

  // Google Calendar
  googleClientId: process.env.GOOGLE_CLIENT_ID,
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
  googleRedirectUri: process.env.GOOGLE_REDIRECT_URI,

  // OpenRouter — primary + optional backup key for when free quota runs out
  openrouterApiKey: process.env.OPENROUTER_API_KEY,
  openrouterApiKeyBackup: process.env.OPENROUTER_API_KEY_BACKUP || null,

  // App URLs
  apiBaseUrl: process.env.API_BASE_URL,
  dashboardUrl: process.env.DASHBOARD_URL,
  // Email
  resendApiKey: process.env.RESEND_API_KEY,
};

config.SUPABASE_URL = config.supabaseUrl;
config.SUPABASE_SERVICE_KEY = config.supabaseServiceKey;
config.SUPABASE_ANON_KEY = config.supabaseAnonKey;
config.RETELL_API_KEY = config.retellApiKey;
config.RETELL_WEBHOOK_SECRET = config.retellWebhookSecret;
config.TWILIO_ACCOUNT_SID = config.twilioAccountSid;
config.TWILIO_AUTH_TOKEN = config.twilioAuthToken;
config.TWILIO_DEFAULT_NUMBER = config.twilioDefaultNumber;
config.GOOGLE_CLIENT_ID = config.googleClientId;
config.GOOGLE_CLIENT_SECRET = config.googleClientSecret;
config.GOOGLE_REDIRECT_URI = config.googleRedirectUri;
config.OPENROUTER_API_KEY = config.openrouterApiKey;
config.API_BASE_URL = config.apiBaseUrl;
config.DASHBOARD_URL = config.dashboardUrl;
config.WEBHOOK_BASE_URL = config.webhookBaseUrl;

module.exports = config;
