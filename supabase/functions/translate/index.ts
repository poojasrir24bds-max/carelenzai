import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, targetLang, structuredResult } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    // If structuredResult is provided, translate all fields
    if (structuredResult) {
      const fullText = [
        `Condition: ${structuredResult.condition}`,
        `Definition: ${structuredResult.definition}`,
        `Severity description: ${structuredResult.severityDesc}`,
        `Causes: ${(structuredResult.causes || []).join(" | ")}`,
        `Guidance: ${(structuredResult.guidance || []).join(" | ")}`,
      ].join("\n");

      const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-lite",
          messages: [
            {
              role: "system",
              content: `You are a medical translator. Translate the following medical content to ${targetLang}. Return ONLY valid JSON with these exact keys: condition, definition, severityDesc, causes (array), guidance (array). Keep medical terms accurate but easy for patients to understand. Do not add any extra text outside the JSON.`,
            },
            { role: "user", content: fullText },
          ],
        }),
      });

      if (!response.ok) {
        const t = await response.text();
        console.error("Translation error:", response.status, t);
        throw new Error(`Translation failed: ${response.status}`);
      }

      const data = await response.json();
      let content = data.choices?.[0]?.message?.content || "";
      
      // Strip markdown code fences if present
      content = content.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      
      try {
        const translated = JSON.parse(content);
        return new Response(JSON.stringify({ translatedResult: translated }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch {
        console.error("Failed to parse translated JSON:", content);
        return new Response(JSON.stringify({ translated: content }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Simple text translation
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `You are a medical translator. Translate the following medical text to ${targetLang}. Keep it natural and easy to understand for a patient. Only return the translated text, nothing else.`,
          },
          { role: "user", content: text },
        ],
      }),
    });

    if (!response.ok) {
      const t = await response.text();
      console.error("Translation error:", response.status, t);
      throw new Error(`Translation failed: ${response.status}`);
    }

    const data = await response.json();
    const translated = data.choices?.[0]?.message?.content || text;

    return new Response(JSON.stringify({ translated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("translate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});