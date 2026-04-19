import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("GHL_PRIVATE_INTEGRATION_TOKEN");
  const fallbackLocationId = Deno.env.get("GHL_LOCATION_ID") || null;
  const baseUrl = Deno.env.get("GHL_BASE_URL") || "https://services.leadconnectorhq.com";

  if (!token) {
    console.error("[send-to-ghl] Missing GHL_PRIVATE_INTEGRATION_TOKEN secret");
    return json({ message: "GoHighLevel token is not set in the Supabase Edge Function secrets yet." }, 400);
  }

  try {
    const payload = await req.json();
    const customer = payload?.customer || {};
    const quoteMeta = payload?.quoteMeta || {};
    const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];
    const locationId = quoteMeta.locationId || fallbackLocationId;

    console.log(
      JSON.stringify({
        tag: "send-to-ghl:start",
        hasToken: Boolean(token),
        hasPayload: Boolean(payload),
        quoteId: payload?.quoteId || null,
        locationId,
        lineItemCount: lineItems.length,
        customerEmail: customer?.email || null,
        customerPhone: customer?.phone || null,
      })
    );

    if (!locationId) {
      console.error("[send-to-ghl] Missing locationId in payload and secrets");
      return json({ message: "Missing GoHighLevel Location ID." }, 400);
    }

    const body = {
      locationId,
      firstName: customer.name || "Quote Customer",
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      source: "S&S Estimator",
    };

    console.log(JSON.stringify({ tag: "send-to-ghl:contact-upsert-request", url: `${baseUrl}/contacts/upsert`, body }));

    const contactRes = await fetch(`${baseUrl}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const rawText = await contactRes.text();
    let contactJson: Record<string, unknown> = {};
    try {
      contactJson = rawText ? JSON.parse(rawText) : {};
    } catch {
      contactJson = { raw: rawText };
    }

    console.log(
      JSON.stringify({
        tag: "send-to-ghl:contact-upsert-response",
        status: contactRes.status,
        ok: contactRes.ok,
        body: contactJson,
      })
    );

    if (!contactRes.ok) {
      return json(
        {
          message: typeof contactJson?.message === "string" ? contactJson.message : "Contact upsert failed in GoHighLevel.",
          debug: contactJson,
        },
        contactRes.status >= 400 && contactRes.status < 600 ? contactRes.status : 400
      );
    }

    return json({
      message: "GoHighLevel foundation is connected. Contact upsert worked. Estimate payload is ready for final mapping.",
      contactId: (contactJson?.contact as Record<string, unknown> | undefined)?.id || contactJson?.id || null,
      estimateId: null,
      preparedEstimate: {
        locationId,
        contactId: (contactJson?.contact as Record<string, unknown> | undefined)?.id || contactJson?.id || null,
        lineItems,
        quoteMeta,
        totals: payload?.totals || {},
      },
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json(
      {
        message: err instanceof Error ? err.message : "Unknown error",
      },
      500
    );
  }
});
