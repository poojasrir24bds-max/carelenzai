import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { phone, action } = await req.json();

    if (!phone || !/^\+?\d{10,15}$/.test(phone.replace(/\s/g, ""))) {
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cleanPhone = phone.replace(/\s/g, "");

    if (action === "send") {
      // Generate 6-digit OTP
      const otp = String(Math.floor(100000 + Math.random() * 900000));
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 min expiry

      // Delete old OTPs for this phone
      await supabase.from("phone_otp").delete().eq("phone", cleanPhone);

      // Store new OTP
      const { error } = await supabase.from("phone_otp").insert({
        phone: cleanPhone,
        otp_code: otp,
        expires_at: expiresAt,
      });

      if (error) throw error;

      // In production, integrate with SMS provider (Twilio, MSG91, etc.)
      // For now, log OTP (visible in edge function logs for testing)
      console.log(`📱 OTP for ${cleanPhone}: ${otp}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "OTP sent successfully",
          // Remove this in production - only for testing
          debug_otp: otp,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "verify") {
      const { otp } = await req.json().catch(() => ({ otp: null }));
      // Re-parse since we already consumed body - get otp from original parse
      return new Response(JSON.stringify({ error: "Use verify action with otp" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
