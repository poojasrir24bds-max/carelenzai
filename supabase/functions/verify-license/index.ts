import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Indian Medical License format patterns
const MEDICAL_LICENSE_PATTERNS = [
  /^[A-Z]{2,3}-\d{4,8}$/i,           // State prefix format: TN-12345, KA-123456
  /^ML-\d{4,8}$/i,                     // ML- prefix format
  /^IMR-\d{4,10}$/i,                   // Indian Medical Register
  /^NMC-\d{4,10}$/i,                   // National Medical Commission
  /^MCI-\d{4,10}$/i,                   // Medical Council of India
  /^\d{5,10}$/,                         // Pure numeric registration
  /^[A-Z]{1,4}\d{4,10}$/i,            // Alphanumeric: TN12345
  /^DOC-\d{3,6}$/i,                    // DOC prefix
];

// Indian Dental License format patterns (Dental Council of India)
const DENTAL_LICENSE_PATTERNS = [
  /^DCI-\d{4,10}$/i,                   // Dental Council of India
  /^SDC-\d{4,10}$/i,                   // State Dental Council
  /^[A-Z]{2}-D-\d{4,8}$/i,            // State dental format: TN-D-12345
  /^[A-Z]{2,3}-\d{4,8}$/i,            // State prefix (shared with medical)
  /^BDS-\d{4,10}$/i,                   // BDS registration
  /^MDS-\d{4,10}$/i,                   // MDS registration
  /^\d{5,10}$/,                         // Pure numeric registration
  /^[A-Z]{1,4}\d{4,10}$/i,            // Alphanumeric
];

// State medical council codes
const VALID_STATE_CODES = [
  'TN', 'KA', 'KL', 'AP', 'TS', 'MH', 'GJ', 'RJ', 'UP', 'MP',
  'WB', 'BR', 'OR', 'PB', 'HR', 'JK', 'HP', 'UK', 'AS', 'GA',
  'DL', 'CH', 'JH', 'CG', 'MN', 'ML', 'MZ', 'NL', 'SK', 'TR', 'AR'
];

interface VerificationResult {
  isValid: boolean;
  formatValid: boolean;
  stateCodeValid: boolean | null;
  riskLevel: 'low' | 'medium' | 'high';
  notes: string[];
}

function verifyLicense(licenseNumber: string, doctorId: string, specialization: string = ''): VerificationResult {
  const trimmed = licenseNumber.trim().toUpperCase();
  const notes: string[] = [];
  const isDentist = specialization.toLowerCase() === 'dentist';
  
  // Check format based on specialization
  const patterns = isDentist ? DENTAL_LICENSE_PATTERNS : MEDICAL_LICENSE_PATTERNS;
  const formatValid = patterns.some(p => p.test(trimmed));
  if (!formatValid) {
    notes.push(`License number format does not match any known Indian ${isDentist ? 'dental' : 'medical'} license pattern`);
  } else {
    notes.push(`License number format matches a valid ${isDentist ? 'dental' : 'medical'} pattern`);
  }
  
  // Check state code if applicable
  let stateCodeValid: boolean | null = null;
  const stateMatch = trimmed.match(/^([A-Z]{2})-/);
  if (stateMatch) {
    stateCodeValid = VALID_STATE_CODES.includes(stateMatch[1]);
    if (stateCodeValid) {
      notes.push(`State code ${stateMatch[1]} is a valid Indian state medical council code`);
    } else {
      notes.push(`State code ${stateMatch[1]} is not recognized as a valid Indian state code`);
    }
  }
  
  // Check doctor ID format
  if (doctorId && doctorId.trim()) {
    const docIdValid = /^DOC-\d{3,6}$/i.test(doctorId.trim());
    if (docIdValid) {
      notes.push("Doctor ID format is valid");
    } else {
      notes.push("Doctor ID format is non-standard (expected DOC-XXX)");
    }
  }
  
  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' = 'high';
  if (formatValid && (stateCodeValid === true || stateCodeValid === null)) {
    riskLevel = 'low';
  } else if (formatValid) {
    riskLevel = 'medium';
  }
  
  const isValid = formatValid && stateCodeValid !== false;

  return { isValid, formatValid, stateCodeValid, riskLevel, notes };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { licenseNumber, doctorId, doctorProfileId } = await req.json();

    if (!licenseNumber) {
      return new Response(JSON.stringify({ error: "License number is required" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { licenseNumber, doctorId, doctorProfileId, specialization } = await req.json();

    const result = verifyLicense(licenseNumber, doctorId || '', specialization || '');

    // Save verification result to database
    if (doctorProfileId) {
      const supabaseAdmin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      await supabaseAdmin.from("doctor_profiles").update({
        license_verification_status: result.isValid ? 'api_verified' : 'api_flagged',
        license_verification_notes: result.notes.join('; '),
      }).eq("id", doctorProfileId);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
