// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

function toHex(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha512(text: string) {
  const data = new TextEncoder().encode(text);
  const buf = await crypto.subtle.digest("SHA-512", data);
  return toHex(buf);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  const ct = req.headers.get("content-type") || "";
  let payload: any = {};
  try {
    if (ct.includes("application/x-www-form-urlencoded")) {
      payload = Object.fromEntries(new URLSearchParams(await req.text()));
    } else if (ct.includes("application/json")) {
      payload = await req.json();
    } else {
      // Attempt to parse as JSON; fallback to raw text
      try { payload = await req.json(); } catch { payload = { raw: await req.text() }; }
    }
  } catch (_) {
    // ignore parse errors, keep payload as {}
  }

  const master = Deno.env.get("PAYDUNYA_MASTER_KEY") ?? "";
  const receivedHash = (payload.hash || payload.signature || "").toString().toLowerCase();
  const expected = master ? (await sha512(master)).toLowerCase() : "";
  const ok = Boolean(master) && Boolean(receivedHash) && receivedHash === expected;

  console.log("[paydunya-ipn] received", {
    ok,
    contentType: ct,
    keys: Object.keys(payload || {}),
    status: payload?.status,
    token: payload?.token,
  });

  // Always 200 to avoid retries; actual business logic will be added in next PR
  return new Response("OK", {
    status: 200,
    headers: { "Access-Control-Allow-Origin": "*" },
  });
});
