import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3";

const META_PIXEL_ID = "1689154455241427";
const META_API_VERSION = "v20.0";

const BodySchema = z.object({
  concerns: z.array(z.string().min(1).max(60)).max(20).default([]),
  ageRange: z.string().min(1).max(40).nullable().optional(),
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(10).max(20),
  sourcePage: z.string().trim().max(200).default("/quiz"),
  eventId: z.string().trim().max(120).optional(),
  fbp: z.string().trim().max(200).optional(),
  fbc: z.string().trim().max(200).optional(),
  eventSourceUrl: z.string().trim().max(500).optional(),
  userAgent: z.string().trim().max(500).optional(),
  referrer: z.string().trim().max(500).optional(),
});

async function hashData(value: string): Promise<string> {
  if (!value) return "";
  const buf = new TextEncoder().encode(value.toLowerCase().trim());
  const digest = await crypto.subtle.digest("SHA-256", buf);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.length === 10 ? `1${digits}` : digits;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }
    const data = parsed.data;

    // 1. Persist the submission
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: inserted, error: dbError } = await supabase
      .from("quiz_submissions")
      .insert({
        concerns: data.concerns,
        age_range: data.ageRange ?? null,
        first_name: data.firstName,
        last_name: data.lastName,
        email: data.email,
        phone: data.phone,
        source_page: data.sourcePage,
        user_agent: data.userAgent ?? null,
        referrer: data.referrer ?? null,
      })
      .select("id, created_at")
      .single();

    if (dbError) {
      console.error("quiz_submissions insert failed", dbError);
      return json({ error: "Could not save your assessment. Please try again." }, 500);
    }

    const eventTime = Math.floor(Date.now() / 1000);
    const eventId = data.eventId || `quiz_${inserted.id}`;

    // 2. Meta Conversions API - Lead event
    const accessToken = Deno.env.get("META_CAPI_ACCESS_TOKEN");
    if (accessToken) {
      const userData: Record<string, string> = {
        em: await hashData(data.email),
        ph: await hashData(normalizePhone(data.phone)),
        fn: await hashData(data.firstName),
        ln: await hashData(data.lastName),
        country: await hashData("us"),
      };
      if (data.fbp) userData.fbp = data.fbp;
      if (data.fbc) userData.fbc = data.fbc;

      const payload = {
        data: [
          {
            event_name: "Lead",
            event_time: eventTime,
            action_source: "website",
            event_id: eventId,
            event_source_url: data.eventSourceUrl,
            user_data: userData,
            custom_data: {
              content_name: "Skin Assessment Quiz",
              concerns: data.concerns.join(", "),
              age_range: data.ageRange ?? "",
            },
          },
        ],
      };

      try {
        const res = await fetch(
          `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${accessToken}`,
          { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) },
        );
        console.log("Meta CAPI response:", res.status, await res.text());
      } catch (err) {
        console.error("Meta CAPI request failed", err);
      }
    } else {
      console.warn("META_CAPI_ACCESS_TOKEN not configured - skipping Lead event");
    }

    // 3. Zapier webhook (WhatsApp / SMS alerts)
    const zapUrl = Deno.env.get("ZAPIER_QUIZ_WEBHOOK_URL");
    if (zapUrl) {
      try {
        const res = await fetch(zapUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            submission_id: inserted.id,
            first_name: data.firstName,
            last_name: data.lastName,
            email: data.email,
            phone: data.phone,
            concerns: data.concerns,
            age_range: data.ageRange ?? "",
            source_page: data.sourcePage,
            timestamp: inserted.created_at,
          }),
        });
        console.log("Zapier webhook status:", res.status);
      } catch (err) {
        console.error("Zapier webhook failed", err);
      }
    } else {
      console.warn("ZAPIER_QUIZ_WEBHOOK_URL not configured - skipping alert");
    }

    return json({ success: true, id: inserted.id, eventId });
  } catch (err) {
    console.error("quiz-submit error", err);
    return json({ error: "Unexpected error" }, 500);
  }
});
