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

const FUNCTION_VERSION = "v24l-custom-items-only";

function safeString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function omitNilDeep(input: unknown): unknown {
  if (Array.isArray(input)) {
    return input.map(omitNilDeep).filter((v) => v !== undefined);
  }
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      const cleaned = omitNilDeep(v);
      if (cleaned !== undefined) out[k] = cleaned;
    }
    return out;
  }
  if (input === null || input === undefined) return undefined;
  return input;
}

function looksLikeSummaryItem(name: string) {
  const n = name.trim().toLowerCase();
  return [
    "subtotal",
    "sales tax",
    "sales tax on 40%",
    "tax",
    "cash price",
    "financing price",
    "optional deposit",
    "amount being financed",
    "amount being financed after deposit",
    "monthly payment",
    "financed sale amount",
    "total no financing",
  ].includes(n);
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const token = Deno.env.get("GHL_PRIVATE_INTEGRATION_TOKEN");
  const fallbackLocationId = Deno.env.get("GHL_LOCATION_ID") || null;
  const baseUrl = Deno.env.get("GHL_BASE_URL") || "https://services.leadconnectorhq.com";

  if (!token) {
    return json({ message: "GoHighLevel token is not set in the Supabase Edge Function secrets yet." }, 400);
  }

  try {
    const payload = await req.json();
    const customer = payload?.customer || {};
    const quoteMeta = payload?.quoteMeta || {};
    const lineItems = Array.isArray(payload?.lineItems) ? payload.lineItems : [];
    const quoteMetaLocationId = quoteMeta.locationId || null;
    const locationId = quoteMetaLocationId || fallbackLocationId;

    if (!locationId) {
      return json({ message: "Missing GoHighLevel Location ID.", functionVersion: FUNCTION_VERSION }, 400);
    }

    const locationPreflightUrl = `${baseUrl}/locations/${locationId}`;
    const locationPreflightRes = await fetch(locationPreflightUrl, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        Accept: "application/json",
      },
    });
    const locationPreflightRaw = await locationPreflightRes.text();
    let locationPreflightJson: Record<string, unknown> = {};
    try {
      locationPreflightJson = locationPreflightRaw ? JSON.parse(locationPreflightRaw) : {};
    } catch {
      locationPreflightJson = { raw: locationPreflightRaw };
    }

    if (!locationPreflightRes.ok) {
      return json({
        message: "GoHighLevel location preflight failed before estimate create.",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        locationPreflightUrl,
        debug: locationPreflightJson,
      }, locationPreflightRes.status >= 400 && locationPreflightRes.status < 600 ? locationPreflightRes.status : 400);
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
        Accept: "application/json",
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

    if (!contactRes.ok) {
      return json({
        message: typeof contactJson?.message === "string" ? contactJson.message : "Contact upsert failed in GoHighLevel.",
        debug: contactJson,
        functionVersion: FUNCTION_VERSION,
      }, contactRes.status >= 400 && contactRes.status < 600 ? contactRes.status : 400);
    }

    const contactId = (contactJson?.contact as Record<string, unknown> | undefined)?.id || contactJson?.id || null;

    const customItems = lineItems
      .map((item: any, index: number) => {
        const name = safeString(item?.service_name || item?.serviceName || item?.name || `Line Item ${index + 1}`, `Line Item ${index + 1}`).trim();
        const qty = safeNumber(item?.quantity ?? 0, 0);
        const unitPrice = safeNumber(item?.unit_price ?? item?.unitPrice ?? 0, 0);
        const lineTotal = safeNumber(item?.line_total ?? item?.lineTotal ?? qty * unitPrice, qty * unitPrice);
        const description = safeString(item?.category || item?.source_type || item?.unit || "", "").trim();
        return {
          name,
          qty: qty > 0 ? qty : 1,
          price: unitPrice > 0 ? unitPrice : lineTotal,
          description,
          lineTotal,
        };
      })
      .filter((item) => item.name && !looksLikeSummaryItem(item.name) && item.price > 0);

    const itemsForEstimate = customItems.length > 0
      ? customItems.map((item) => ({
          name: item.name,
          qty: item.qty,
          price: item.price,
          description: item.description || undefined,
        }))
      : [{
          name: "Estimator Quote",
          qty: 1,
          price: safeNumber(quoteMeta?.cashPrice ?? quoteMeta?.subtotal ?? 0, 0),
          description: "Fallback line item",
        }].filter((item) => item.price > 0);

    if (itemsForEstimate.length === 0) {
      return json({
        message: "No non-summary quoted items were available to send to GoHighLevel.",
        functionVersion: FUNCTION_VERSION,
        finalItemsJson: itemsForEstimate,
      }, 400);
    }

    const today = new Date();
    const issueDate = today.toISOString().slice(0, 10);
    const expiryDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

    const locationObj = (locationPreflightJson?.location as Record<string, unknown> | undefined) || {};
    const businessObj = (locationObj?.business as Record<string, unknown> | undefined) || {};

    const estimateName = safeString(`${quoteMeta.companyName || businessObj.name || "S&S Design Build"} Estimate`, "Estimate").slice(0, 40) || "Estimate";

    const businessDetails = omitNilDeep({
      name: safeString(quoteMeta.companyName || businessObj.name || locationObj.name || "S&S Design Build", "S&S Design Build"),
      email: safeString(quoteMeta.companyEmail || businessObj.email || locationObj.email || "support@snsdesignbuild.com", "support@snsdesignbuild.com"),
      phone: safeString(quoteMeta.companyPhone || locationObj.phone || "+16155555555", "+16155555555"),
      website: safeString(quoteMeta.companyWebsite || businessObj.website || locationObj.website || "https://www.snsdesignbuild.com/", "https://www.snsdesignbuild.com/"),
      address: safeString(businessObj.address || locationObj.address || "", ""),
      city: safeString(businessObj.city || locationObj.city || "", ""),
      state: safeString(businessObj.state || locationObj.state || "", ""),
      country: safeString(businessObj.country || locationObj.country || "US", "US"),
      postalCode: safeString(businessObj.postalCode || locationObj.postalCode || "", ""),
    });

    const customerName = safeString(customer.name || customer.fullName || "Quote Customer", "Quote Customer");
    const nameParts = customerName.split(/\s+/).filter(Boolean);
    const contactDetails = omitNilDeep({
      id: safeString(contactId, ""),
      name: customerName,
      firstName: safeString(nameParts[0] || customerName, customerName),
      lastName: safeString(nameParts.slice(1).join(" ") || "Customer", "Customer"),
      email: safeString(customer.email || "no-email@snsdesignbuild.com", "no-email@snsdesignbuild.com"),
      phone: safeString(customer.phone || "+10000000000", "+10000000000"),
      address: safeString(customer.address || "", ""),
      city: safeString(customer.city || quoteMeta.city || "", ""),
      state: safeString(customer.state || "", ""),
      country: safeString(customer.country || "US", "US"),
      postalCode: safeString(customer.postalCode || "", ""),
    });

    const frequencySettings = omitNilDeep({
      type: "one_time",
      value: 1,
      interval: 1,
      recurring: false,
    });

    const discount = omitNilDeep({
      type: "amount",
      value: 0,
    });

    const estimateBody = omitNilDeep({
      altId: safeString(locationId, ""),
      altType: "location",
      contactId: safeString(contactId, ""),
      name: estimateName,
      issueDate: safeString(issueDate, ""),
      expiryDate: safeString(expiryDate, ""),
      currency: safeString(locationObj.currency || "USD", "USD"),
      items: itemsForEstimate,
      terms: "Valid for 30 days.",
      notes: safeString(`Estimator Quote ${payload?.quoteId || ""}`.trim(), "Estimator Quote"),
      businessDetails,
      contactDetails,
      frequencySettings,
      discount,
    }) as Record<string, unknown>;

    const estimateRes = await fetch(`${baseUrl}/invoices/estimate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Version: "2021-07-28",
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(estimateBody),
    });

    const estimateRaw = await estimateRes.text();
    let estimateJson: Record<string, unknown> = {};
    try {
      estimateJson = estimateRaw ? JSON.parse(estimateRaw) : {};
    } catch {
      estimateJson = { raw: estimateRaw };
    }

    const estimateId = (estimateJson?.estimate as Record<string, unknown> | undefined)?.id || estimateJson?.id || estimateJson?.estimateId || null;

    if (!estimateId) {
      return json({
        message: "Estimate creation did not return an estimate ID from GoHighLevel.",
        triedVariant: "custom-items-only-final-path",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        usedContactId: contactId,
        debug: estimateJson,
        finalEstimateJson: estimateBody,
        finalItemsJson: estimateBody.items,
      }, estimateRes.status >= 400 && estimateRes.status < 600 ? estimateRes.status : 502);
    }

    return json({
      message: "GoHighLevel contact and estimate created successfully.",
      contactId,
      estimateId,
      functionVersion: FUNCTION_VERSION,
      usedVariant: "custom-items-only-final-path",
      finalEstimateJson: estimateBody,
      finalItemsJson: estimateBody.items,
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json({ message: err instanceof Error ? err.message : "Unknown error", functionVersion: FUNCTION_VERSION }, 500);
  }
});
