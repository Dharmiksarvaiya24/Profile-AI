import { GoogleGenAI } from "@google/genai";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { SYSTEM, CANARY, REFUSAL } from "../lib/profile";

export const runtime = "nodejs";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const redis = Redis.fromEnv();

// Rate Limits
const perMinute = new Ratelimit({
  redis,    
  limiter: Ratelimit.slidingWindow(10, "1 m"),
  prefix: "chat:min",
});
const perDay = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(60, "1 d"),
  prefix: "chat:day",
});
const globalDay = new Ratelimit({
  redis,
  limiter: Ratelimit.fixedWindow(1500, "1 d"), 
  prefix: "chat:global",
});

const MAX_CHARS = 100; 
const MAX_TURNS = 10;
const MAX_OUTPUT_TOKENS = 800;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGIN ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
if (process.env.NODE_ENV !== "production") {
  ALLOWED_ORIGINS.push("http://localhost:3000");
}

const SUSPICIOUS = [
  /\b(ignore|disregard|forget|override|bypass|skip|cancel|dismiss)\b.{0,80}\b(previous|prior|above|earlier|system|developer|instructions?|rules?)\b/i,
  /\b(reveal|show|print|repeat|output|dump|leak|expose|display|quote|copy)\b.{0,80}\b(system|developer|hidden|secret|internal|original)\b.{0,40}\b(prompt|instruction|message|rule|policy|context)\b/i,
  /\b(what|which|tell me|show me|give me)\b.{0,50}\b(system|developer|hidden|internal|secret)\b.{0,30}\b(prompt|instructions?|rules?|message|context)\b/i,
  /\b(repeat|reproduce|recite|quote|copy|output)\b.{0,40}\b(everything|all|the text|the message|instructions?)\b.{0,30}\b(above|before|earlier|previously)\b/i,
  /\b(you are now|act as|pretend to be|roleplay as|assume the role|switch to)\b/i,
  /\b(developer mode|debug mode|admin mode|god mode|jailbreak)\b/i,
  /\bDAN\b/i,
  /\b(system message|developer message|developer instruction|hidden instruction|internal instruction)\b/i,
  /\b(ignore|override|replace|change|modify)\b.{0,60}\b(your|the)\b.{0,30}\b(instructions?|rules?|constraints?|policy)\b/i,
  /\b(base64|base-64|rot13|hex(?:adecimal)?|binary|unicode|ascii)\b.{0,60}\b(prompt|instruction|system|secret|hidden|rules?|message)\b/i,
  /\b(reveal|show|extract|dump|leak|expose)\b.{0,60}\b(secret|token|key|password|canary|internal|hidden)\b/i,
  /\b(what were you told|what have you been told|what are your instructions|what are your rules)\b/i,
  /\b(according to your hidden|according to your system|from your internal)\b/i,
];

// ---------- Output check ----------
const ALLOWED_HOSTS = [
  "dharmik.engineer",
  "github.com",
  "linkedin.com",
  "tridentdesigning.in",
];

function replyLooksSafe(text: string) {
  if (!text || text.length > 4000) return false;
  if (text.includes(CANARY)) return false;
  if (text.includes("```")) return false;
  if (/<script|<iframe|javascript:/i.test(text)) return false;

  const urls = text.match(/https?:\/\/[^\s)]+/gi) ?? [];
  for (const u of urls) {
    try {
      const host = new URL(u).hostname.replace(/^www\./, "");
      if (!ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h))) return false;
    } catch {
      return false;
    }
  }
  return true;
}

const reply = (text: string, status = 200) =>
  new Response(JSON.stringify({ reply: text }), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const streamReply = (text: string) =>
  new Response(text, {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });

export async function POST(req: Request) {
  const origin = req.headers.get("origin") ?? "";
  const host = req.headers.get("host") ?? "";
  const isDev = process.env.NODE_ENV !== "production";
  const isAllowedDev = isDev && (!origin || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const isSameHost = origin && host && (origin.endsWith(host) || origin.includes(host));
  const isAllowed = isAllowedDev || isSameHost || ALLOWED_ORIGINS.includes(origin);

  if (!isAllowed) return reply("Forbidden", 403);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "anon";
  try {
    const [a, b, c] = await Promise.all([
      perMinute.limit(ip),
      perDay.limit(ip),
      globalDay.limit("all"),
    ]);
    if (!a.success || !b.success || !c.success) {
      return reply("Too many requests. Please try again later.", 429);
    }
  } catch (e) {
    console.error("ratelimit error", e);
    return reply("Service unavailable. Please try again later.", 503);
  }

  const body = await req.json().catch(() => null);
  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return reply("Bad request", 400);
  }

  let history = body.messages.slice(-MAX_TURNS).map((m: any) => ({
    role: m?.role === "assistant" ? "model" : "user",
    parts: [{ text: String(m?.content ?? "").slice(0, MAX_CHARS) }],
  }));

  while (history.length && history[0].role !== "user") history.shift();
  if (!history.length || history[history.length - 1].role !== "user") {
    return reply("Bad request", 400);
  }

  const last: string = history[history.length - 1].parts[0].text.trim();
  if (!last) return reply("Bad request", 400);

  if (SUSPICIOUS.some((re) => re.test(last))) return reply(REFUSAL);

  let requested = (process.env.GEMINI_MODEL || "gemini-3.5-flash").trim();
  if (requested.endsWith("-light")) {
    requested = requested.replace(/-light$/, "-lite");
  }

  const candidateModels = [
    requested === "gemini-flash-lite-latest" ? "gemini-3.5-flash" : requested,
    "gemini-3.5-flash",
    "gemini-3.6-flash",
    "gemini-flash-lite-latest",
  ].filter(
    (m, idx, arr) =>
      Boolean(m) &&
      m !== "gemini-2.5-flash" &&
      m !== "gemini-2.0-flash" &&
      m !== "gemini-2.0-flash-lite" &&
      m !== "gemini-3.5-flash-lite" &&
      arr.indexOf(m) === idx
  );

  try {
    let streamResult: any = null;
    let lastErr: any = null;

    for (const model of candidateModels) {
      try {
        streamResult = await ai.models.generateContentStream({
          model,
          contents: history,
          config: {
            systemInstruction: SYSTEM,
            maxOutputTokens: MAX_OUTPUT_TOKENS,
            temperature: 0.3,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });
        if (streamResult) break;
      } catch (err) {
        lastErr = err;
        console.warn(`Model ${model} failed, trying next candidate:`, (err as any)?.message || err);
      }
    }

    if (!streamResult) {
      console.error("All Gemini model candidates failed:", lastErr);
      return reply("Something went wrong. Please try again.", 500);
    }

    // Stream chunks directly from Gemini for ultra-fast time-to-first-token
    const encoder = new TextEncoder();
    let accumulated = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of streamResult) {
            const chunkText = chunk.text ?? "";
            if (!chunkText) continue;
            accumulated += chunkText;

            if (accumulated.includes(CANARY)) {
              console.warn("canary triggered during stream", { ip, message: last });
              controller.enqueue(encoder.encode(REFUSAL));
              controller.close();
              return;
            }

            controller.enqueue(encoder.encode(chunkText));
          }
          controller.close();
        } catch (err) {
          controller.error(err);
        }
      },
    });

    return new Response(readable, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (e) {
    console.error("gemini error", e);
    return reply("Something went wrong. Please try again.", 500);
  }
}
