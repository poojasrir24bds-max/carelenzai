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
    const body = await req.json();
    const { phone } = body;

    if (!phone || !/^\+?\d{10,15}$/.test(phone.replace(/[\s-]/g, ""))) {
      return new Response(JSON.stringify({ error: "Invalid phone number. Use format: +91XXXXXXXXXX" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const cleanPhone = phone.replace(/[\s-]/g, "");

    // Generate 6-digit OTP
    const otp = String(Math.floor(100000 + Math.random() * 900000));
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    // Delete old OTPs for this phone
    await supabase.from("phone_otp").delete().eq("phone", cleanPhone);

    // Store new OTP
    const { error } = await supabase.from("phone_otp").insert({
      phone: cleanPhone,
      otp_code: otp,
      expires_at: expiresAt,
    });

    if (error) throw error;

    // In production, send SMS via Twilio/MSG91
    console.log(`📱 OTP for ${cleanPhone}: ${otp}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "OTP sent successfully",
        // FOR TESTING ONLY - remove in production
        debug_otp: otp,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
