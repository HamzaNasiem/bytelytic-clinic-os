"use strict";

const axios = require("axios");
const env = require("../config/env");

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const FREE_MODEL = "google/gemma-3-27b-it:free";

// Full fallback chain — tries every free model across both keys before giving up
function buildAttemptChain(callerModel) {
  const primary = env.openrouterApiKey;
  const backup = env.openrouterApiKeyBackup;

  if (callerModel) {
    const chain = [{ key: primary, model: callerModel }];
    if (backup) chain.push({ key: backup, model: callerModel });
    return chain;
  }

  // Free models in quality order — all tried on primary key, then backup key
  // Note: deepseek and qwen removed — 404 on OpenRouter free tier as of Apr 2026
  const FREE_MODELS = [
    "google/gemma-3-27b-it:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "google/gemma-4-26b-a4b-it:free",
    "mistralai/mistral-7b-instruct:free",
    "microsoft/phi-4-reasoning:free",
    "nvidia/llama-3.1-nemotron-nano-8b-instruct:free",
  ];

  const chain = FREE_MODELS.map((m) => ({ key: primary, model: m }));
  if (backup) {
    chain.push({ key: backup, model: "openrouter/auto" });
    FREE_MODELS.forEach((m) => chain.push({ key: backup, model: m }));
  }
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
