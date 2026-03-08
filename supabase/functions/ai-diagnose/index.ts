import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, area } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are a medical AI screening assistant. You analyze images of ${area} conditions.

IMPORTANT DISCLAIMER: You are providing AI-powered health awareness screening ONLY. You do NOT provide medical diagnosis or prescriptions. Only a verified doctor can provide medical advice and prescriptions.

Analyze the provided image and return a structured assessment using the tool provided.

Guidelines:
- condition: The likely condition name (scientific/medical name)
- definition: A clear, simple explanation of what this condition is
- causes: Array of 3-5 potential causes or triggers
- severity: "low", "medium", or "high" based on visual assessment
- confidence: 0-100 confidence percentage
- guidance: Array of 3-4 self-care suggestions (NO medication prescriptions)

Be professional but accessible. If the image is unclear or not a medical image, still provide your best assessment with lower confidence.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: `Please analyze this ${area} image and provide a health screening assessment.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_diagnosis",
              description: "Provide a structured health screening assessment",
              parameters: {
                type: "object",
                properties: {
                  condition: { type: "string", description: "Medical/scientific name of the condition" },
                  definition: { type: "string", description: "Simple explanation of the condition" },
                  causes: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-5 potential causes or triggers",
                  },
                  severity: { type: "string", enum: ["low", "medium", "high"], description: "Risk level" },
                  confidence: { type: "number", description: "Confidence percentage 0-100" },
                  guidance: {
                    type: "array",
                    items: { type: "string" },
                    description: "3-4 self-care suggestions (no prescriptions)",
                  },
                },
                required: ["condition", "definition", "causes", "severity", "confidence", "guidance"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_diagnosis" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add funds." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      throw new Error("No tool call response from AI");
    }

    const result = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-diagnose error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
