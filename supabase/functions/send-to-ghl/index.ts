import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("GHL_PRIVATE_INTEGRATION_TOKEN");

  if (!token) {
    return new Response(
      JSON.stringify({
        message: "GoHighLevel token is not set in the Supabase Edge Function secrets yet.",
      }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();
    const customer = payload?.customer || {};
    const quoteMeta = payload?.quoteMeta || {};
    const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];

    // Step 10 foundation: upsert contact first.
    const contactRes = await fetch("https://services.leadconnectorhq.com/contacts/upsert", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        locationId: quoteMeta.locationId,
        firstName: customer.name || "Quote Customer",
        email: customer.email || undefined,
        phone: customer.phone || undefined,
        source: "S&S Estimator",
      }),
    });

    const contactJson = await contactRes.json().catch(() => ({}));
    if (!contactRes.ok) {
      return new Response(JSON.stringify({
        message: contactJson?.message || "Contact upsert failed in GoHighLevel.",
        debug: contactJson,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Estimate creation endpoint/body can vary as HighLevel evolves.
    // For Step 10 foundation we return the prepared payload so you can finish final field mapping next.
    return new Response(
      JSON.stringify({
        message: "GoHighLevel foundation is connected. Contact upsert worked. Estimate payload is ready for final mapping.",
        contactId: contactJson?.contact?.id || contactJson?.id || null,
        estimateId: null,
        preparedEstimate: {
          locationId: quoteMeta.locationId || null,
          contactId: contactJson?.contact?.id || contactJson?.id || null,
          lineItems,
          quoteMeta,
          totals: payload?.totals || {},
        },
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ message: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
