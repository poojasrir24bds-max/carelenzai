import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { imageBase64, scanType } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const systemPrompt = `You are an expert dental AI assistant designed for dental students and professionals. You analyze dental images (intraoral photos, X-rays, clinical photos) with high precision.

IMPORTANT DISCLAIMER: You are providing AI-powered dental screening ONLY for educational purposes. You do NOT provide official medical/dental diagnosis. Only a licensed dentist can provide diagnosis and treatment plans.

Analyze the provided dental image and return a structured assessment using the tool provided.

Guidelines:
- Use the FDI (Fédération Dentaire Internationale) tooth numbering system
- teeth_identified: Array of objects with tooth_number (FDI), condition, and description
- conditions_found: Array of detected conditions (caries, plaque, gingivitis, calculus, fractures, restorations, etc.)
- overall_assessment: A comprehensive summary of the dental image
- clinical_notes: Educational clinical notes useful for dental students (3-5 points)
- severity: "normal", "mild", "moderate", or "severe"
- confidence: 0-100 confidence percentage
- recommendations: Array of 3-5 clinical recommendations (educational, not prescriptive)

Be thorough, educational, and professional. If the image quality is poor, note it with lower confidence.`;

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
              { type: "text", text: `Please analyze this dental ${scanType || "clinical"} image. Identify dental structures, conditions, and provide educational notes.` },
              { type: "image_url", image_url: { url: `data:image/jpeg;base64,${imageBase64}` } },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "provide_dental_analysis",
              description: "Provide structured dental image analysis",
              parameters: {
                type: "object",
                properties: {
                  teeth_identified: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        tooth_number: { type: "string", description: "FDI tooth number" },
                        condition: { type: "string", description: "Condition of the tooth" },
                        description: { type: "string", description: "Detailed description" },
                      },
                      required: ["tooth_number", "condition", "description"],
                      additionalProperties: false,
                    },
                    description: "Teeth identified with FDI numbering",
                  },
                  conditions_found: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of dental conditions detected",
                  },
                  overall_assessment: { type: "string", description: "Comprehensive dental assessment" },
                  clinical_notes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Educational clinical notes for dental students",
                  },
                  severity: { type: "string", enum: ["normal", "mild", "moderate", "severe"] },
                  confidence: { type: "number", description: "Confidence 0-100" },
                  recommendations: {
                    type: "array",
                    items: { type: "string" },
                    description: "Clinical recommendations (educational)",
                  },
                },
                required: ["teeth_identified", "conditions_found", "overall_assessment", "clinical_notes", "severity", "confidence", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "provide_dental_analysis" } },
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
    if (!toolCall) throw new Error("No tool call response from AI");

    const result = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dental-analyze error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
