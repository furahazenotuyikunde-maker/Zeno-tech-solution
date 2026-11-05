import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function constantTimeEqual(left: string, right: string) {
  let mismatch = left.length ^ right.length;
  const length = Math.max(left.length, right.length);
  for (let index = 0; index < length; index += 1) {
    mismatch |= (left.charCodeAt(index) || 0) ^ (right.charCodeAt(index) || 0);
  }
  return mismatch === 0;
}

serve(async (request) => {
  const expectedKey = Deno.env.get("ZENO_DEVICE_API_KEY");
  if (!expectedKey) return Response.json({ error: "Device API authentication is not configured." }, { status: 503 });

  const suppliedKey = request.headers.get("x-device-api-key") ??
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!constantTimeEqual(expectedKey, suppliedKey)) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const hotelId = url.searchParams.get("hotel_id");
  const readerId = url.searchParams.get("esp32_id");
  if (!hotelId || !readerId) {
    return Response.json({ error: "hotel_id and esp32_id are required." }, { status: 400 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    return Response.json({ error: "Supabase service access is not configured." }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data: reader, error: readerError } = await supabase.from("readers")
    .select("id").eq("hotel_id", hotelId).eq("reader_id", readerId).maybeSingle();
  if (readerError) return Response.json({ error: "Could not verify reader." }, { status: 500 });
  if (!reader) return Response.json({ error: "Reader not registered.", allowed: false }, { status: 404 });

  const { data: hotel, error } = await supabase.from("hotels")
    .select("subscription_status, trial_ends_at").eq("id", hotelId).maybeSingle();
  if (error) return Response.json({ error: "Could not verify hotel subscription." }, { status: 500 });
  if (!hotel) return Response.json({ error: "Hotel not found.", allowed: false }, { status: 404 });

  const allowed = hotel.subscription_status === "active" ||
    (hotel.subscription_status === "trialing" && new Date(hotel.trial_ends_at).getTime() > Date.now());
  return Response.json({
    allowed,
    expired: !allowed,
    hotel_id: hotelId,
    reader_id: readerId,
    subscription_status: hotel.subscription_status,
    trial_ends_at: hotel.trial_ends_at,
  }, { status: allowed ? 200 : 402, headers: { "Cache-Control": "no-store" } });
});
