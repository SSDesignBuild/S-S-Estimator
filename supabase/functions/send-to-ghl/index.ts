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

const FUNCTION_VERSION = "v24b-estimate-live";

function normalizeMappingIndex(mappings: any[] = []) {
  const byKey = new Map<string, any>();
  for (const mapping of mappings) {
    const serviceKey = String(mapping?.serviceKey || mapping?.service_key || "").trim();
    if (!serviceKey) continue;
    byKey.set(serviceKey, {
      serviceKey,
      label: String(mapping?.label || mapping?.serviceName || serviceKey).trim() || serviceKey,
      productId: String(mapping?.productId || mapping?.product_id || "").trim(),
      priceIds: {
        volume: String(mapping?.priceIds?.volume || "").trim(),
        tier5: String(mapping?.priceIds?.tier5 || "").trim(),
        tier7_5: String(mapping?.priceIds?.tier7_5 || "").trim(),
        tier10: String(mapping?.priceIds?.tier10 || "").trim(),
        tier15: String(mapping?.priceIds?.tier15 || "").trim(),
      },
    });
  }
  return byKey;
}

function tierToMappingKey(tier: string | null | undefined) {
  if (tier === "volume") return "volume";
  if (tier === "tier5") return "tier5";
  if (tier === "tier7_5") return "tier7_5";
  if (tier === "tier10") return "tier10";
  return "tier15";
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
    const ghlMappings = normalizeMappingIndex(Array.isArray(payload?.ghlMappings) ? payload.ghlMappings : []);
    const locationId = quoteMeta.locationId || fallbackLocationId;

    console.log(JSON.stringify({
      tag: "send-to-ghl:start",
      functionVersion: FUNCTION_VERSION,
      hasToken: Boolean(token),
      quoteId: payload?.quoteId || null,
      locationId,
      lineItemCount: lineItems.length,
      mappingCount: ghlMappings.size,
      customerEmail: customer?.email || null,
      customerPhone: customer?.phone || null,
    }));

    if (!locationId) {
      return json({ message: "Missing GoHighLevel Location ID." }, 400);
    }

    const contactBody = {
      locationId,
      firstName: customer.name || "Quote Customer",
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      source: "S&S Estimator",
    };

    const contactRes = await fetch(`${baseUrl}/contacts/upsert`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(contactBody),
    });

    const contactRaw = await contactRes.text();
    let contactJson: Record<string, unknown> = {};
    try {
      contactJson = contactRaw ? JSON.parse(contactRaw) : {};
    } catch {
      contactJson = { raw: contactRaw };
    }

    console.log(JSON.stringify({ tag: "send-to-ghl:contact-upsert-response", status: contactRes.status, ok: contactRes.ok, body: contactJson }));

    if (!contactRes.ok) {
      return json({
        message: typeof contactJson?.message === "string" ? contactJson.message : "Contact upsert failed in GoHighLevel.",
        debug: contactJson,
      }, contactRes.status >= 400 && contactRes.status < 600 ? contactRes.status : 400);
    }

    const contactId = (contactJson?.contact as Record<string, unknown> | undefined)?.id || contactJson?.id || null;
    const mappingTierKey = tierToMappingKey(String(quoteMeta?.tier || "tier5"));

    const preparedItems = lineItems.map((item: any, index: number) => {
      const serviceKey = String(item?.service_key || item?.serviceKey || item?.service_name || `line-${index + 1}`).trim();
      const mapping = ghlMappings.get(serviceKey);
      const mappedPriceId = String(mapping?.priceIds?.[mappingTierKey] || "").trim();
      const quantity = Number(item?.quantity || 0) || 1;
      const amount = Number(item?.unit_price || item?.unitPrice || 0) || 0;
      const lineTotal = Number(item?.line_total || item?.lineTotal || amount * quantity) || 0;
      const base = {
        serviceKey,
        name: String(item?.service_name || item?.serviceName || mapping?.label || `Line item ${index + 1}`),
        description: String(item?.category || item?.source_type || "Estimator line item"),
        qty: quantity,
        quantity,
        rate: amount,
        unitPrice: amount,
        amount,
        lineTotal,
        price: amount,
        currency: "USD",
      };

      if (mapping?.productId && mappedPriceId) {
        return {
          ...base,
          type: "mapped",
          productId: mapping.productId,
          priceId: mappedPriceId,
          product: mapping.productId,
          price: mappedPriceId,
        };
      }

      return {
        ...base,
        type: "custom",
      };
    });

    const commonMeta = {
      locationId,
      contactId,
      altType: "contact",
      altId: contactId,
      title: `${quoteMeta.companyName || "S&S Design Build"} Estimate`,
      name: `${quoteMeta.companyName || "S&S Design Build"} Estimate`,
      issueDate: new Date().toISOString(),
      currency: "USD",
      subtotal: payload?.totals?.subtotal || 0,
      total: payload?.totals?.financingPrice || payload?.totals?.cashPrice || 0,
      pipelineId: quoteMeta?.pipelineId || undefined,
      opportunityStageId: quoteMeta?.opportunityStageId || undefined,
      businessDetails: {
        name: quoteMeta.companyName || "S&S Design Build",
      },
      customFields: {
        estimatorQuoteId: payload?.quoteId || null,
        tier: quoteMeta?.tier || null,
        city: quoteMeta?.city || null,
        county: quoteMeta?.county || null,
        financingPlanName: quoteMeta?.financingPlanName || null,
      },
    };

    const estimatePayloads = [
      {
        label: "lineItems+items",
        body: {
          ...commonMeta,
          items: preparedItems,
          lineItems: preparedItems,
        },
      },
      {
        label: "lineItems-only",
        body: {
          ...commonMeta,
          lineItems: preparedItems,
        },
      },
      {
        label: "items-only",
        body: {
          ...commonMeta,
          items: preparedItems,
        },
      },
    ];

    let estimateJson: Record<string, unknown> = {};
    let estimateStatus = 0;
    let estimateVariant = "";
    let estimateId: unknown = null;

    for (const variant of estimatePayloads) {
      console.log(JSON.stringify({ tag: "send-to-ghl:estimate-create-request", variant: variant.label, body: variant.body }));

      const estimateRes = await fetch(`${baseUrl}/invoices/estimate`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Version: "2021-07-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(variant.body),
      });

      const estimateRaw = await estimateRes.text();
      try {
        estimateJson = estimateRaw ? JSON.parse(estimateRaw) : {};
      } catch {
        estimateJson = { raw: estimateRaw };
      }
      estimateStatus = estimateRes.status;
      estimateVariant = variant.label;
      estimateId = (estimateJson?.estimate as Record<string, unknown> | undefined)?.id || estimateJson?.id || estimateJson?.estimateId || null;

      console.log(JSON.stringify({ tag: "send-to-ghl:estimate-create-response", variant: variant.label, status: estimateStatus, ok: estimateRes.ok, body: estimateJson, estimateId }));

      if (estimateRes.ok && estimateId) {
        break;
      }
    }

    if (!estimateId) {
      return json({
        message: "Estimate creation did not return an estimate ID from GoHighLevel.",
        contactId,
        triedVariant: estimateVariant,
        debug: estimateJson,
        mappedItemCount: preparedItems.filter((item) => item.type === "mapped").length,
        customItemCount: preparedItems.filter((item) => item.type === "custom").length,
        functionVersion: FUNCTION_VERSION,
      }, estimateStatus >= 400 && estimateStatus < 600 ? estimateStatus : 502);
    }

    return json({
      message: "GoHighLevel contact and estimate created successfully.",
      contactId,
      estimateId,
      mappedItemCount: preparedItems.filter((item) => item.type === "mapped").length,
      customItemCount: preparedItems.filter((item) => item.type === "custom").length,
      functionVersion: FUNCTION_VERSION,
      usedVariant: estimateVariant,
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json({ message: err instanceof Error ? err.message : "Unknown error" }, 500);
  }
});
