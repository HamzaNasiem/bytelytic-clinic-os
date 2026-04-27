"use strict";

const axios = require("axios");
const env = require("../config/env");

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const FREE_MODEL = "google/gemma-3-27b-it:free";

// Full fallback chain — interleaves backup key per-model for max reliability
function buildAttemptChain(callerModel) {
  const primary = env.openrouterApiKey;
  const backup = env.openrouterApiKeyBackup;

  if (callerModel) {
    const chain = [{ key: primary, model: callerModel }];
    if (backup) chain.push({ key: backup, model: callerModel });
    return chain;
  }

  // Free models — updated Apr 2026 (only models confirmed working on OpenRouter free tier)
  const FREE_MODELS = [
    "google/gemma-3-27b-it:free",          // Google Gemma 3 27B
    "google/gemma-4-26b-a4b-it:free",      // Google Gemma 4
    "qwen/qwen3-30b-a3b:free",             // Qwen3 30B (new Apr 2026)
    "qwen/qwq-32b:free",                   // Qwen QwQ 32B reasoning
    "deepseek/deepseek-r1-0528:free",      // DeepSeek R1 latest
    "deepseek/deepseek-chat-v3-0324:free", // DeepSeek Chat V3
    "meta-llama/llama-4-scout:free",       // Meta Llama 4 Scout
  ];

  // Interleave: try primary then backup for EACH model (not all primary then all backup)
  // This means if gemma-3 quota is exceeded on primary, we immediately try backup key
  const chain = [];
  for (const m of FREE_MODELS) {
    chain.push({ key: primary, model: m });
    if (backup) chain.push({ key: backup, model: m });
  }
  // Final fallback: openrouter/auto picks best available model
  if (backup) chain.push({ key: backup, model: "openrouter/auto" });
  if (primary) chain.push({ key: primary, model: "openrouter/auto" });
  return chain;
}

/**
 * chat
 * Sends a chat completion to OpenRouter with exhaustive free-model fallback.
 * Continues to next model on ANY failure (429, 400, 500, empty response).
 */
async function chat({ messages, maxTokens = 500, model = null }) {
  const attempts = buildAttemptChain(model);
  const errors = [];

  for (const attempt of attempts) {
    try {
      const response = await axios.post(
        `${OPENROUTER_BASE}/chat/completions`,
        {
          model: attempt.model,
          messages,
          max_tokens: maxTokens,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${attempt.key}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://bytelytic.com",
            "X-Title": "Bytelytic Clinic OS",
          },
          timeout: 30_000,
        },
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        errors.push(`${attempt.model}: empty response`);
        continue; // try next instead of throwing
      }
      return content.trim();
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error?.message || err.message;
      console.error(
        `[ai.chat] model=${attempt.model} key=...${attempt.key.slice(-6)} failed (${status || "timeout"}): ${msg}`,
      );
      errors.push(`${attempt.model}: ${status} ${msg}`);
      // Always continue to next model — never crash on a single model failure
    }
  }

  throw new Error(
    `[ai.chat] All ${attempts.length} models failed. ${errors.slice(-2).join(" | ")}`,
  );
}

module.exports = { chat, FREE_MODEL };
