'use strict';

/**
 * Centralized Multi-Provider AI Orchestrator (Gemini -> Groq -> Mistral)
 *
 * Design Guarantees:
 * - Zero new npm packages: uses `@google/genai` for Gemini and native Node `fetch` + `AbortSignal.timeout` for Groq & Mistral.
 * - Task Type A (`generateJsonWithFallback`): Runs all configured providers in `AI_PROVIDER_ORDER` (default: gemini -> groq -> mistral).
 * - Task Type B (`searchWebJsonWithFallback`): Runs ONLY live-web-search-capable providers (gemini `googleSearch` -> groq `browser_search`).
 *   Mistral is ALWAYS skipped for Stage 2 TOC web verification so chapters are never hallucinated from memory.
 * - Security: NEVER logs raw API keys; scrubs potential secret tokens from any upstream error messages.
 */

const { GoogleGenAI } = require('@google/genai');

const SUPPORTED_PROVIDERS = ['gemini', 'groq', 'mistral'];
const WEB_SEARCH_PROVIDERS = new Set(['gemini', 'groq']);

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MISTRAL_CHAT_URL = 'https://api.mistral.ai/v1/chat/completions';

// ============================================================================
// 1. CONFIGURATION & SANITIZED LOGGING
// ============================================================================

function sanitizeLogMessage(raw) {
  const str = String(raw || '').replace(/\s+/g, ' ').trim();
  return str
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/([?&]key=)[^&\s]+/gi, '$1[REDACTED]')
    .replace(/\b(?:AIza[A-Za-z0-9_-]{10,}|AQ\.[A-Za-z0-9._-]{10,}|gsk_[A-Za-z0-9_-]{10,}|mstrl_[A-Za-z0-9_-]{10,})\b/g, '[REDACTED]')
    .slice(0, 260);
}

function getRequestTimeoutMs(overrideMs) {
  const candidate = Number(overrideMs || process.env.AI_REQUEST_TIMEOUT_MS || 25000);
  if (!Number.isFinite(candidate)) return 25000;
  return Math.max(3000, Math.min(120000, Math.round(candidate)));
}

function getProviderOrder(overrideOrder = null) {
  const rawList = Array.isArray(overrideOrder)
    ? overrideOrder
    : String(process.env.AI_PROVIDER_ORDER || 'gemini,groq,mistral').split(',');

  const cleaned = rawList
    .map((p) => String(p || '').trim().toLowerCase())
    .filter((p) => SUPPORTED_PROVIDERS.includes(p));

  const unique = [...new Set(cleaned)];
  return unique.length > 0 ? unique : ['gemini', 'groq', 'mistral'];
}

function parseModelList(primaryEnv, fallbackEnv, defaultModels) {
  const combined = [
    ...String(primaryEnv || '').split(','),
    ...String(fallbackEnv || '').split(','),
    ...(Array.isArray(defaultModels) ? defaultModels : []),
  ]
    .map((m) => String(m || '').trim())
    .filter(Boolean);
  return [...new Set(combined)];
}

function isNonPlaceholderKey(raw) {
  const key = String(raw || '').trim();
  if (key.length < 12) return '';
  if (/^(your_|replace_|placeholder|changeme|none|null|undefined)/i.test(key)) return '';
  return key;
}

function getValidGeminiApiKey() {
  const key = isNonPlaceholderKey(process.env.GEMINI_API_KEY);
  if (!key) return '';
  if (key.startsWith('AIza') || key.startsWith('AQ.')) return key;
  return '';
}

function getValidGroqApiKey() {
  return isNonPlaceholderKey(process.env.GROQ_API_KEY);
}

function getValidMistralApiKey() {
  return isNonPlaceholderKey(process.env.MISTRAL_API_KEY);
}

function getGeminiModelCandidates() {
  return parseModelList(
    process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite',
    process.env.GEMINI_FALLBACK_MODELS || 'gemini-3.8-flash',
    ['gemini-3.5-flash-lite', 'gemini-3.8-flash']
  );
}

function getGroqModelCandidates() {
  return parseModelList(
    process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
    process.env.GROQ_FALLBACK_MODELS || 'llama-3.3-70b-versatile',
    ['openai/gpt-oss-120b', 'llama-3.3-70b-versatile', 'openai/gpt-oss-20b']
  );
}

function getGroqSearchModelCandidates() {
  // Only Groq gpt-oss models support the built-in `browser_search` tool
  const candidates = parseModelList(
    process.env.GROQ_SEARCH_MODEL || 'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    ['openai/gpt-oss-120b', 'openai/gpt-oss-20b']
  );
  return candidates.filter((m) => /gpt-oss/i.test(m));
}

function getMistralModelCandidates() {
  return parseModelList(
    process.env.MISTRAL_MODEL || 'mistral-small-latest',
    process.env.MISTRAL_FALLBACK_MODELS || 'ministral-8b-latest',
    ['mistral-small-latest', 'ministral-8b-latest']
  );
}

function createGeminiClient() {
  const apiKey = getValidGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function getProviderCapabilities() {
  const order = getProviderOrder();
  const configured = {
    gemini: Boolean(getValidGeminiApiKey()),
    groq: Boolean(getValidGroqApiKey()),
    mistral: Boolean(getValidMistralApiKey()),
  };
  const generationProviders = order.filter((p) => configured[p]);
  const webSearchProviders = order.filter((p) => WEB_SEARCH_PROVIDERS.has(p) && configured[p]);

  return {
    order,
    configured,
    generationProviders,
    webSearchProviders,
    hasAnyGenerationProvider: generationProviders.length > 0,
    hasAnyWebSearchProvider: webSearchProviders.length > 0,
  };
}

// ============================================================================
// 2. JSON EXTRACTION & TIMEOUT HELPERS
// ============================================================================

async function withTimeout(promiseFactory, timeoutMs, label = 'AI request') {
  let timer = null;
  try {
    return await Promise.race([
      promiseFactory(),
      new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`${label} timed out after ${timeoutMs}ms`);
          err.code = 'ETIMEDOUT';
          err.status = 408;
          reject(err);
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

function extractJsonObjectFromText(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;

  const cleaned = rawText
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/g, '')
    .trim();

  // Direct parse
  try {
    const direct = JSON.parse(cleaned);
    if (direct && typeof direct === 'object') return direct;
  } catch {
    // continue to extraction
  }

  // First '{' to last '}' slice
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try {
      const sliced = JSON.parse(cleaned.slice(start, end + 1));
      if (sliced && typeof sliced === 'object') return sliced;
    } catch {
      // continue to balanced brace scan
    }
  }

  // Balanced JSON object scan (handles trailing notes containing braces)
  if (start !== -1) {
    let depth = 0;
    let inStr = false;
    let escaped = false;
    for (let i = start; i < cleaned.length; i++) {
      const ch = cleaned[i];
      if (inStr) {
        if (escaped) {
          escaped = false;
        } else if (ch === '\\') {
          escaped = true;
        } else if (ch === '"') {
          inStr = false;
        }
        continue;
      }
      if (ch === '"') {
        inStr = true;
      } else if (ch === '{') {
        depth++;
      } else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            const candidate = JSON.parse(cleaned.slice(start, i + 1));
            if (candidate && typeof candidate === 'object') return candidate;
          } catch {
            // keep scanning
          }
          break;
        }
      }
    }
  }

  return null;
}

function extractUrlsRecursively(value, outSet = new Set(), depth = 0) {
  if (depth > 6 || value == null) return outSet;
  if (typeof value === 'string') {
    const matches = value.match(/https?:\/\/[^\s"'<>)\]]+/gi);
    if (matches) {
      for (const m of matches) {
        const cleaned = m.replace(/[.,;]+$/, '');
        if (/^https?:\/\/[^/]+/i.test(cleaned)) {
          outSet.add(cleaned);
        }
      }
    }
    return outSet;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      extractUrlsRecursively(item, outSet, depth + 1);
    }
    return outSet;
  }
  if (typeof value === 'object') {
    for (const key of Object.keys(value)) {
      extractUrlsRecursively(value[key], outSet, depth + 1);
    }
  }
  return outSet;
}

function classifyHttpStatus(err) {
  const status = Number(err?.status ?? err?.statusCode ?? err?.response?.status ?? 0);
  if (status > 0) return status;
  const msg = String(err?.message || '');
  const codeMatch = msg.match(/\b(400|401|402|403|404|408|429|500|502|503|504)\b/);
  if (codeMatch) return Number(codeMatch[1]);
  if (err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.code === 'ETIMEDOUT') return 408;
  return 0;
}

function isAuthErrorStatus(status, message = '') {
  if (status === 401 || status === 402 || status === 403) return true;
  return /API_KEY_INVALID|invalid api key|unauthorized|authentication failed|permission denied|subscription/i.test(String(message));
}

function extractAssistantText(payload) {
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part === 'string' ? part : (part?.text || '')))
      .join('\n')
      .trim();
  }
  return '';
}

// ============================================================================
// 3. PROVIDER ADAPTERS
// ============================================================================

async function callGeminiJson({ model, prompt, systemPrompt, temperature = 0.5, timeoutMs }) {
  const ai = createGeminiClient();
  if (!ai) {
    const err = new Error('Gemini API key is not configured');
    err.status = 401;
    throw err;
  }

  const config = {
    responseMimeType: 'application/json',
    temperature,
  };
  if (systemPrompt) {
    config.systemInstruction = systemPrompt;
  }

  const response = await withTimeout(
    () => ai.models.generateContent({ model, contents: prompt, config }),
    timeoutMs,
    `gemini/${model}`
  );

  const rawText = String(response?.text || '').trim();
  const data = extractJsonObjectFromText(rawText);
  if (!data) {
    const err = new Error('Returned empty or unparseable JSON');
    err.status = 502;
    throw err;
  }

  return { data, rawText };
}

async function callGeminiWebSearch({ model, prompt, temperature = 0.1, timeoutMs }) {
  const ai = createGeminiClient();
  if (!ai) {
    const err = new Error('Gemini API key is not configured');
    err.status = 401;
    throw err;
  }

  const response = await withTimeout(
    () =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          temperature,
        },
      }),
    timeoutMs,
    `gemini-search/${model}`
  );

  const rawText = String(response?.text || '').trim();
  const data = extractJsonObjectFromText(rawText);
  if (!data) {
    const err = new Error('Web search response did not contain valid JSON');
    err.status = 502;
    throw err;
  }

  const groundingMeta = response?.candidates?.[0]?.groundingMetadata || {};
  const groundingChunks = Array.isArray(groundingMeta.groundingChunks)
    ? groundingMeta.groundingChunks
    : [];
  const groundedUrls = groundingChunks
    .map((c) => c?.web?.uri)
    .filter((u) => typeof u === 'string' && /^https?:\/\//i.test(u));

  const webSearchQueries = Array.isArray(groundingMeta.webSearchQueries)
    ? groundingMeta.webSearchQueries.filter(Boolean)
    : [];

  return {
    data,
    rawText,
    groundedUrls: [...new Set(groundedUrls)],
    executedSearch: groundedUrls.length > 0 || webSearchQueries.length > 0,
  };
}

async function callOpenAiCompatibleChat({
  provider,
  url,
  apiKey,
  model,
  prompt,
  systemPrompt,
  temperature = 0.5,
  maxTokens = 4096,
  timeoutMs,
  useJsonResponseFormat = true,
  tools = null,
}) {
  const messages = [];
  if (systemPrompt) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: prompt });

  const body = {
    model,
    messages,
    temperature,
  };

  if (provider === 'groq') {
    body.max_completion_tokens = maxTokens;
  } else {
    body.max_tokens = maxTokens;
  }

  // IMPORTANT: Never combine `response_format` with Groq `browser_search` tools
  if (Array.isArray(tools) && tools.length > 0) {
    body.tools = tools;
  } else if (useJsonResponseFormat) {
    body.response_format = { type: 'json_object' };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!res.ok) {
    let errText = '';
    try {
      const errJson = await res.json();
      errText = errJson?.error?.message || errJson?.message || JSON.stringify(errJson);
    } catch {
      errText = await res.text().catch(() => '');
    }
    const err = new Error(`HTTP ${res.status}: ${sanitizeLogMessage(errText || res.statusText)}`);
    err.status = res.status;
    throw err;
  }

  return res.json();
}

async function callGroqJson({ model, prompt, systemPrompt, temperature = 0.5, maxTokens = 4096, timeoutMs }) {
  const apiKey = getValidGroqApiKey();
  if (!apiKey) {
    const err = new Error('Groq API key is not configured');
    err.status = 401;
    throw err;
  }

  const effectiveMaxTokens = /gpt-oss/i.test(model) ? Math.max(1024, maxTokens) : maxTokens;

  let payload;
  try {
    payload = await callOpenAiCompatibleChat({
      provider: 'groq',
      url: GROQ_CHAT_URL,
      apiKey,
      model,
      prompt,
      systemPrompt,
      temperature,
      maxTokens: effectiveMaxTokens,
      timeoutMs,
      useJsonResponseFormat: true,
    });
  } catch (err) {
    // Some Groq models reject response_format=json_object on certain prompts -> retry once with prompt-enforced JSON
    if (err.status === 400 && /response_format|json_object|json_validate_failed|failed to generate json/i.test(err.message)) {
      payload = await callOpenAiCompatibleChat({
        provider: 'groq',
        url: GROQ_CHAT_URL,
        apiKey,
        model,
        prompt,
        systemPrompt,
        temperature,
        maxTokens: effectiveMaxTokens,
        timeoutMs,
        useJsonResponseFormat: false,
      });
    } else {
      throw err;
    }
  }

  const rawText = extractAssistantText(payload);
  const data = extractJsonObjectFromText(rawText);
  if (!data) {
    const err = new Error('Returned empty or unparseable JSON');
    err.status = 502;
    throw err;
  }

  return { data, rawText };
}

async function callGroqWebSearch({ model, prompt, temperature = 0.1, timeoutMs }) {
  const apiKey = getValidGroqApiKey();
  if (!apiKey) {
    const err = new Error('Groq API key is not configured');
    err.status = 401;
    throw err;
  }

  // Strictly NO response_format when using Groq `browser_search` tool
  const payload = await callOpenAiCompatibleChat({
    provider: 'groq',
    url: GROQ_CHAT_URL,
    apiKey,
    model,
    prompt,
    systemPrompt:
      'You MUST use ONLY the browser_search tool to verify real published chapters/sections before answering. Never invoke any other tool name (do not call a tool named json). After searching, write your final answer directly in plain assistant message text containing a single valid JSON object with no extra commentary.',
    temperature,
    maxTokens: 4096,
    timeoutMs,
    useJsonResponseFormat: false,
    tools: [{ type: 'browser_search' }],
  });

  const message = payload?.choices?.[0]?.message || {};
  const rawText = extractAssistantText(payload);
  const data = extractJsonObjectFromText(rawText);
  if (!data) {
    const err = new Error('Groq browser_search response did not contain valid JSON');
    err.status = 502;
    throw err;
  }

  // Extract verified web URLs exclusively from executed_tools / annotations (never trusting ungrounded text alone)
  const executedTools = Array.isArray(message.executed_tools) ? message.executed_tools : [];
  const annotations = Array.isArray(message.annotations) ? message.annotations : [];
  const toolUrlSet = new Set();
  for (const tool of executedTools) {
    extractUrlsRecursively(tool, toolUrlSet);
  }
  for (const ann of annotations) {
    extractUrlsRecursively(ann, toolUrlSet);
  }

  const groundedUrls = [...toolUrlSet].filter((u) => /^https?:\/\//i.test(u));
  const executedSearch = executedTools.length > 0 || groundedUrls.length > 0;

  return {
    data,
    rawText,
    groundedUrls,
    executedSearch,
  };
}

async function callMistralJson({ model, prompt, systemPrompt, temperature = 0.5, maxTokens = 4096, timeoutMs }) {
  const apiKey = getValidMistralApiKey();
  if (!apiKey) {
    const err = new Error('Mistral API key is not configured');
    err.status = 401;
    throw err;
  }

  const payload = await callOpenAiCompatibleChat({
    provider: 'mistral',
    url: MISTRAL_CHAT_URL,
    apiKey,
    model,
    prompt,
    systemPrompt,
    temperature,
    maxTokens,
    timeoutMs,
    useJsonResponseFormat: true,
  });

  const rawText = extractAssistantText(payload);
  const data = extractJsonObjectFromText(rawText);
  if (!data) {
    const err = new Error('Returned empty or unparseable JSON');
    err.status = 502;
    throw err;
  }

  return { data, rawText };
}

// ============================================================================
// 4. PUBLIC FALLBACK CHAIN ORCHESTRATORS
// ============================================================================

/**
 * Task Type A: Structured JSON generation across `AI_PROVIDER_ORDER` (Gemini -> Groq -> Mistral).
 * Used for reference-grounded topic generation where verified TOCs are already supplied in the prompt.
 */
async function generateJsonWithFallback({
  prompt,
  systemPrompt = '',
  temperature = 0.5,
  maxTokens = 4096,
  timeoutMs,
  providerOrderOverride = null,
  taskLabel = 'json-generation',
} = {}) {
  const effectiveTimeout = getRequestTimeoutMs(timeoutMs);
  const order = getProviderOrder(providerOrderOverride);
  const attempts = [];

  for (const provider of order) {
    let models = [];
    let caller = null;

    if (provider === 'gemini') {
      if (!getValidGeminiApiKey()) {
        attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'not_configured' });
        continue;
      }
      models = getGeminiModelCandidates();
      caller = callGeminiJson;
    } else if (provider === 'groq') {
      if (!getValidGroqApiKey()) {
        attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'not_configured' });
        continue;
      }
      models = getGroqModelCandidates();
      caller = callGroqJson;
    } else if (provider === 'mistral') {
      if (!getValidMistralApiKey()) {
        attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'not_configured' });
        continue;
      }
      models = getMistralModelCandidates();
      caller = callMistralJson;
    } else {
      continue;
    }

    for (const model of models) {
      const started = Date.now();
      try {
        const result = await caller({
          model,
          prompt,
          systemPrompt,
          temperature,
          maxTokens,
          timeoutMs: effectiveTimeout,
        });
        const durationMs = Date.now() - started;
        attempts.push({ provider, model, ok: true, status: 200, durationMs });

        if (attempts.some((a) => !a.ok && !a.skipped)) {
          console.log(`[AI Provider:${taskLabel}] Fallback succeeded via ${provider}/${model} (${durationMs}ms).`);
        } else {
          console.log(`[AI Provider:${taskLabel}] Succeeded via ${provider}/${model} (${durationMs}ms).`);
        }

        return {
          ok: true,
          provider,
          model,
          data: result.data,
          rawText: result.rawText,
          attempts,
        };
      } catch (err) {
        const durationMs = Date.now() - started;
        const status = classifyHttpStatus(err);
        const reason = sanitizeLogMessage(err?.message || 'Unknown error');
        attempts.push({ provider, model, ok: false, status, reason, durationMs });

        console.warn(
          `[AI Provider:${taskLabel}] ${provider}/${model} failed (status=${status || 'ERR'}, ${durationMs}ms): ${reason} -> falling back`
        );

        // If auth failed (401/403), skip remaining models for this provider immediately
        if (isAuthErrorStatus(status, reason)) {
          break;
        }
      }
    }
  }

  return {
    ok: false,
    provider: null,
    model: null,
    data: null,
    rawText: '',
    attempts,
  };
}

/**
 * Task Type B: Live Web-Search-Grounded JSON Retrieval (`Gemini googleSearch -> Groq browser_search`).
 * CRITICAL ANTI-HALLUCINATION GUARD:
 * - Strictly skips `mistral` (no live web search capability).
 * - Requires live search grounding proof (`groundedUrls.length > 0`) whenever `data.found === true`.
 * - If a provider errors/times out or returns an ungrounded hallucination, automatically falls back to the next search provider.
 */
async function searchWebJsonWithFallback({
  prompt,
  temperature = 0.1,
  timeoutMs,
  providerOrderOverride = null,
  taskLabel = 'toc-web-search',
} = {}) {
  const effectiveTimeout = getRequestTimeoutMs(timeoutMs);
  const order = getProviderOrder(providerOrderOverride);
  const attempts = [];
  let honestNegativeResult = null;

  for (const provider of order) {
    if (!WEB_SEARCH_PROVIDERS.has(provider)) {
      attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'no_live_web_search' });
      continue;
    }

    let models = [];
    let caller = null;
    let tocSource = null;

    if (provider === 'gemini') {
      if (!getValidGeminiApiKey()) {
        attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'not_configured' });
        continue;
      }
      models = getGeminiModelCandidates();
      caller = callGeminiWebSearch;
      tocSource = 'gemini_web_search';
    } else if (provider === 'groq') {
      if (!getValidGroqApiKey()) {
        attempts.push({ provider, model: null, ok: false, skipped: true, reason: 'not_configured' });
        continue;
      }
      models = getGroqSearchModelCandidates();
      caller = callGroqWebSearch;
      tocSource = 'groq_web_search';
    }

    for (const model of models) {
      const started = Date.now();
      try {
        const result = await caller({
          model,
          prompt,
          temperature,
          timeoutMs: effectiveTimeout,
        });
        const durationMs = Date.now() - started;

        const claimsFound = result.data?.found === true;
        const hasGroundedUrls = Array.isArray(result.groundedUrls) && result.groundedUrls.length > 0;

        if (claimsFound && !hasGroundedUrls) {
          // Anti-hallucination hard rejection: claimed `found: true` without live web search evidence!
          attempts.push({
            provider,
            model,
            ok: false,
            status: 422,
            reason: 'ungrounded_toc_rejected_zero_search_urls',
            durationMs,
          });
          console.warn(
            `[AI Provider:${taskLabel}] Rejected ungrounded response from ${provider}/${model} (0 search URLs) -> falling back`
          );
          break;
        }

        if (claimsFound && hasGroundedUrls) {
          attempts.push({
            provider,
            model,
            ok: true,
            status: 200,
            groundedUrlsCount: result.groundedUrls.length,
            durationMs,
          });
          console.log(
            `[AI Provider:${taskLabel}] Verified live web search via ${provider}/${model} (${result.groundedUrls.length} URLs, ${durationMs}ms).`
          );
          return {
            ok: true,
            found: true,
            provider,
            model,
            tocSource,
            data: result.data,
            groundedUrls: result.groundedUrls,
            executedSearch: result.executedSearch,
            attempts,
          };
        }

        // Honest negative (`found: false`) — record it; if the provider genuinely ran web search, accept it cleanly
        attempts.push({
          provider,
          model,
          ok: true,
          status: 200,
          found: false,
          executedSearch: result.executedSearch,
          durationMs,
        });

        honestNegativeResult = {
          ok: true,
          found: false,
          provider,
          model,
          tocSource,
          data: result.data,
          groundedUrls: result.groundedUrls,
          executedSearch: result.executedSearch,
          attempts,
        };

        if (result.executedSearch) {
          return honestNegativeResult;
        }
        // If the provider returned found:false WITHOUT even running a search tool, allow fallback to next search provider
        console.warn(
          `[AI Provider:${taskLabel}] ${provider}/${model} returned found=false without executing search -> trying next search provider`
        );
        break;
      } catch (err) {
        const durationMs = Date.now() - started;
        const status = classifyHttpStatus(err);
        const reason = sanitizeLogMessage(err?.message || 'Unknown error');
        attempts.push({ provider, model, ok: false, status, reason, durationMs });

        console.warn(
          `[AI Provider:${taskLabel}] ${provider}/${model} search failed (status=${status || 'ERR'}, ${durationMs}ms): ${reason} -> falling back`
        );

        if (isAuthErrorStatus(status, reason)) {
          break;
        }
      }
    }
  }

  if (honestNegativeResult) {
    return honestNegativeResult;
  }

  return {
    ok: false,
    found: false,
    provider: null,
    model: null,
    tocSource: null,
    data: null,
    groundedUrls: [],
    executedSearch: false,
    attempts,
  };
}

module.exports = {
  SUPPORTED_PROVIDERS,
  WEB_SEARCH_PROVIDERS,
  sanitizeLogMessage,
  getRequestTimeoutMs,
  getProviderOrder,
  getValidGeminiApiKey,
  getValidGroqApiKey,
  getValidMistralApiKey,
  getGeminiModelCandidates,
  getGroqModelCandidates,
  getGroqSearchModelCandidates,
  getMistralModelCandidates,
  createGeminiClient,
  getProviderCapabilities,
  extractJsonObjectFromText,
  generateJsonWithFallback,
  searchWebJsonWithFallback,
};
