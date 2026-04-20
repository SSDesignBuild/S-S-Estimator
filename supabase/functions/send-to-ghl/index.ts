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

const FUNCTION_VERSION = "v24m-custom-items-schema-fix";

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

async function readJsonSafe(res: Response) {
  const raw = await res.text();
  try {
    return raw ? JSON.parse(raw) : {};
  } catch {
    return { raw };
  }
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
    const locationId = quoteMeta.locationId || fallbackLocationId;

    if (!locationId) {
      return json({ message: "Missing GoHighLevel Location ID.", functionVersion: FUNCTION_VERSION }, 400);
    }

    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Version: "2021-07-28",
      Accept: "application/json",
    };

    const locationPreflightUrl = `${baseUrl}/locations/${locationId}`;
    const locationPreflightRes = await fetch(locationPreflightUrl, { method: "GET", headers: authHeaders });
    const locationPreflightJson = await readJsonSafe(locationPreflightRes);
    if (!locationPreflightRes.ok) {
      return json({
        message: "GoHighLevel location preflight failed before estimate create.",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        debug: locationPreflightJson,
      }, locationPreflightRes.status >= 400 && locationPreflightRes.status < 600 ? locationPreflightRes.status : 400);
    }

    const contactBody = {
      locationId,
      firstName: safeString(customer.name || customer.firstName || "Quote", "Quote"),
      lastName: safeString(customer.lastName || "Customer", "Customer"),
      email: customer.email || undefined,
      phone: customer.phone || undefined,
      source: "S&S Estimator",
    };

    const contactRes = await fetch(`${baseUrl}/contacts/upsert`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(contactBody),
    });
    const contactJson = await readJsonSafe(contactRes);
    if (!contactRes.ok) {
      return json({
        message: typeof contactJson?.message === "string" ? contactJson.message : "Contact upsert failed in GoHighLevel.",
        debug: contactJson,
        functionVersion: FUNCTION_VERSION,
      }, contactRes.status >= 400 && contactRes.status < 600 ? contactRes.status : 400);
    }

    const contactId = safeString((contactJson?.contact as Record<string, unknown> | undefined)?.id || contactJson?.id || "", "");
    if (!contactId) {
      return json({ message: "GoHighLevel contact upsert did not return a contact ID.", functionVersion: FUNCTION_VERSION, debug: contactJson }, 502);
    }

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
          amount: unitPrice > 0 ? unitPrice : lineTotal,
          description,
          currency: "USD",
          taxes: [],
        };
      })
      .filter((item) => item.name && !looksLikeSummaryItem(item.name) && item.amount > 0);

    const itemsForEstimate = customItems.length > 0
      ? customItems
      : [{
          name: "Estimator Quote",
          qty: 1,
          amount: safeNumber(quoteMeta?.cashPrice ?? quoteMeta?.subtotal ?? 0, 0),
          description: "Fallback line item",
          currency: "USD",
          taxes: [],
        }].filter((item) => item.amount > 0);

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
    const currency = safeString(locationObj.currency || quoteMeta.currency || "USD", "USD");

    let estimateNumber: string | undefined;
    try {
      const numUrl = `${baseUrl}/invoices/estimate/number/generate?altId=${encodeURIComponent(locationId)}&altType=location`;
      const numRes = await fetch(numUrl, { method: "GET", headers: authHeaders });
      const numJson = await readJsonSafe(numRes);
      estimateNumber = safeString(numJson?.estimateNumber || numJson?.number || "", "") || undefined;
    } catch {
      estimateNumber = undefined;
    }

    const nameBase = safeString(quoteMeta.customerName || customer.name || "Quote Customer", "Quote Customer");
    const estimateName = safeString(`${nameBase} Estimate`, "Estimate").slice(0, 40) || "Estimate";

    const businessDetails = {
      name: safeString(quoteMeta.companyName || businessObj.name || locationObj.name || "S&S Design Build", "S&S Design Build"),
      address: safeString(businessObj.address || locationObj.address || "", ""),
      phoneNo: safeString(quoteMeta.companyPhone || locationObj.phone || "+16155555555", "+16155555555"),
      website: safeString(quoteMeta.companyWebsite || businessObj.website || locationObj.website || "https://www.snsdesignbuild.com/", "https://www.snsdesignbuild.com/"),
      logoUrl: safeString(businessObj.logoUrl || locationObj.logoUrl || "", ""),
      customValues: [],
    };

    const customerName = safeString(customer.name || customer.fullName || "Quote Customer", "Quote Customer");
    const nameParts = customerName.split(/\s+/).filter(Boolean);
    const contactDetails = {
      id: contactId,
      phoneNo: safeString(customer.phone || "+10000000000", "+10000000000"),
      email: safeString(customer.email || "no-email@snsdesignbuild.com", "no-email@snsdesignbuild.com"),
      customFields: [],
      name: customerName,
      address: {
        countryCode: safeString(customer.country || "US", "US"),
        addressLine1: safeString(customer.address || customer.street || "", ""),
        addressLine2: safeString(customer.address2 || "", ""),
        city: safeString(customer.city || quoteMeta.city || "", ""),
        state: safeString(customer.state || "", ""),
        postalCode: safeString(customer.postalCode || "", ""),
      },
      additionalEmails: [],
      companyName: safeString(customer.businessName || "", ""),
      firstName: safeString(nameParts[0] || customerName, customerName),
      lastName: safeString(nameParts.slice(1).join(" ") || "Customer", "Customer"),
    };

    const total = Number(itemsForEstimate.reduce((sum, item) => sum + safeNumber((item as any).amount, 0) * safeNumber((item as any).qty, 1), 0).toFixed(2));

    const estimateBody = omitNilDeep({
      altId: safeString(locationId, ""),
      altType: "location",
      contactId,
      name: estimateName,
      title: "ESTIMATE",
      estimateNumber,
      issueDate,
      expiryDate,
      currency,
      businessDetails,
      contactDetails,
      frequencySettings: {
        type: "one_time",
        value: 1,
        interval: 1,
        recurring: false,
      },
      discount: {
        type: "amount",
        value: 0,
      },
      items: itemsForEstimate,
      amount: total,
      total,
      totalSummary: {
        subTotal: total,
        discount: 0,
      },
      terms: "Valid for 30 days.",
      notes: safeString(`Created from S&S Estimator quote ${payload?.quoteId || ""}`.trim(), "Created from S&S Estimator"),
    }) as Record<string, unknown>;

    console.log(JSON.stringify({
      tag: "send-to-ghl:estimate-create-request",
      functionVersion: FUNCTION_VERSION,
      requestUrl: `${baseUrl}/invoices/estimate`,
      finalEstimateJson: estimateBody,
      finalItemsJson: estimateBody.items,
    }));

    const estimateRes = await fetch(`${baseUrl}/invoices/estimate`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(estimateBody),
    });

    const estimateJson = await readJsonSafe(estimateRes);
    const estimateId = safeString((estimateJson?.estimate as Record<string, unknown> | undefined)?.id || estimateJson?.id || estimateJson?.estimateId || "", "") || null;

    if (!estimateId) {
      return json({
        message: "Estimate creation did not return an estimate ID from GoHighLevel.",
        triedVariant: "custom-items-only-schema-fix",
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
      usedVariant: "custom-items-only-schema-fix",
      finalEstimateJson: estimateBody,
      finalItemsJson: estimateBody.items,
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json({ message: err instanceof Error ? err.message : "Unknown error", functionVersion: FUNCTION_VERSION }, 500);
  }
});
