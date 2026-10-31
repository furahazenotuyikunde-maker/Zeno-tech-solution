import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

/**
 * Edge Function: check-sub
 * URL: /check-sub
 * Query params: hotel_id (uuid), esp32_id (string)
 * Returns JSON { allowed: boolean, expired: boolean }
 */
serve(async (req) => {
  const url = new URL(req.url);
  const hotelId = url.searchParams.get("hotel_id");
  const esp32Id = url.searchParams.get("esp32_id");

  if (!hotelId) {
    return new Response(JSON.stringify({ error: "hotel_id required" }), { status: 400 });
  }

  // Supabase client (Edge Functions have automatic access to the database via Deno KV?)
  // We'll use the Supabase client library for Deno.
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: hotel, error } = await supabase
    .from("hotels")
    .select("subscription_status, trial_ends_at")
    .eq("id", hotelId)
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: "hotel not found" }), { status: 404 });
  }

  const now = new Date();
  const trialEnds = new Date(hotel.trial_ends_at);
  const active = hotel.subscription_status === "active" || (hotel.subscription_status === "trialing" && trialEnds > now);

  return new Response(
    JSON.stringify({ allowed: active, expired: !active }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});
