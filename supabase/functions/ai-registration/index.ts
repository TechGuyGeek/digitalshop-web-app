// AI Registration service - provider-agnostic backend.
// Switch provider via the AI_PROVIDER secret:
//   AI_PROVIDER=lovable    (default) -> uses Lovable AI Gateway
//   AI_PROVIDER=gpsshops             -> forwards to https://ai.gpsshops.com
//
// Request body:  { messages: [{ role: "user"|"assistant"|"system", content: string }], partial?: Registration }
// Response body: { registration, missing_fields, complete, reply }

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

type Role = "system" | "user" | "assistant";
interface ChatMessage { role: Role; content: string }

interface Registration {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string;
  password: string;
  gender: string;
}

interface RegistrationAIResponse {
  registration: Registration;
  missing_fields: string[];
  complete: boolean;
  reply: string;
}

const EMPTY: Registration = {
  first_name: "",
  last_name: "",
  email: "",
  mobile_number: "",
  password: "",
  gender: "",
};

const SYSTEM_PROMPT = `You are a friendly registration assistant for GPS Shops.
Collect the user's: first_name, last_name, email, mobile_number, password, gender.
Always reply with a JSON object matching this exact schema and nothing else:
{
  "registration": { "first_name": string, "last_name": string, "email": string, "mobile_number": string, "password": string, "gender": string },
  "missing_fields": string[],
  "complete": boolean,
  "reply": string
}
Carry forward any values already known. "complete" is true only when every field is filled.
"reply" is a short message to show the user (ask for the next missing field, or confirm completion).`;

function mergeRegistration(partial: Partial<Registration> | undefined): Registration {
  return { ...EMPTY, ...(partial ?? {}) };
}

function computeMissing(reg: Registration): string[] {
  return (Object.keys(EMPTY) as (keyof Registration)[]).filter((k) => !reg[k] || !String(reg[k]).trim());
}

function safeParse(text: string): Partial<RegistrationAIResponse> | null {
  if (!text) return null;
  // strip ```json fences if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1) return null;
  try { return JSON.parse(cleaned.slice(start, end + 1)); } catch { return null; }
}

function normalize(raw: Partial<RegistrationAIResponse> | null, prior: Registration): RegistrationAIResponse {
  const registration = mergeRegistration({ ...prior, ...(raw?.registration ?? {}) });
  const missing_fields = computeMissing(registration);
  return {
    registration,
    missing_fields,
    complete: missing_fields.length === 0,
    reply: raw?.reply ?? (missing_fields.length === 0
      ? "All set — your details are complete."
      : `Please provide your ${missing_fields[0].replace(/_/g, " ")}.`),
  };
}

// ---------- Providers ----------

interface AIProvider {
  generate(messages: ChatMessage[], partial: Registration): Promise<RegistrationAIResponse>;
}

const lovableProvider: AIProvider = {
  async generate(messages, partial) {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("Missing LOVABLE_API_KEY");

    const sys: ChatMessage = {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nKnown so far: ${JSON.stringify(partial)}`,
    };

    const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [sys, ...messages],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Lovable AI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    const text: string = data?.choices?.[0]?.message?.content ?? "";
    return normalize(safeParse(text), partial);
  },
};

const gpsshopsProvider: AIProvider = {
  async generate(messages, partial) {
    const base = Deno.env.get("GPSSHOPS_AI_URL") ?? "https://ai.gpsshops.com";
    const url = base.replace(/\/$/, "") + "/registration";
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const key = Deno.env.get("GPSSHOPS_AI_KEY");
    if (key) headers["Authorization"] = `Bearer ${key}`;

    const res = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({ messages, partial }),
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`gpsshops AI error ${res.status}: ${body}`);
    }
    const data = await res.json();
    // gpsshops endpoint is expected to already return the contract shape.
    return normalize(data, partial);
  },
};

function pickProvider(): AIProvider {
  const name = (Deno.env.get("AI_PROVIDER") ?? "lovable").toLowerCase();
  switch (name) {
    case "gpsshops": return gpsshopsProvider;
    case "lovable":
    default: return lovableProvider;
  }
}

// ---------- HTTP entry ----------

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const messages: ChatMessage[] = Array.isArray(body?.messages) ? body.messages : [];
    const partial = mergeRegistration(body?.partial);

    if (messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages array is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const provider = pickProvider();
    const result = await provider.generate(messages, partial);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = /429/.test(message) ? 429 : /402/.test(message) ? 402 : 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});