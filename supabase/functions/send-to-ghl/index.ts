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

const FUNCTION_VERSION = "v24n-contact-first-schema-fix";

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

function toE164(phone: unknown): string | undefined {
  const raw = safeString(phone, "").trim();
  if (!raw) return undefined;
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (digits.length === 10) return `+1${digits}`;
  if (raw.startsWith("+") && digits.length >= 10) return `+${digits}`;
  return undefined;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

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

    const locationPreflightRes = await fetch(`${baseUrl}/locations/${locationId}`, { method: "GET", headers: authHeaders });
    const locationPreflightJson = await readJsonSafe(locationPreflightRes);
    if (!locationPreflightRes.ok) {
      return json({
        message: "GoHighLevel location preflight failed before estimate create.",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        debug: locationPreflightJson,
      }, locationPreflightRes.status >= 400 && locationPreflightRes.status < 600 ? locationPreflightRes.status : 400);
    }

    const contactBody = omitNilDeep({
      locationId,
      firstName: safeString(customer.firstName || customer.name || "Quote", "Quote"),
      lastName: safeString(customer.lastName || "Customer", "Customer"),
      email: safeString(customer.email || "", "") || undefined,
      phone: toE164(customer.phone),
      source: "S&S Estimator",
    });

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
        const price = unitPrice > 0 ? unitPrice : lineTotal;
        return {
          name,
          qty: qty > 0 ? qty : 1,
          price,
          description: safeString(item?.category || item?.source_type || item?.unit || "", "").trim() || undefined,
        };
      })
      .filter((item) => item.name && !looksLikeSummaryItem(item.name) && item.price > 0);

    const fallbackAmount = safeNumber(quoteMeta?.cashPrice ?? quoteMeta?.subtotal ?? 0, 0);
    const itemsForEstimate = customItems.length > 0
      ? customItems
      : (fallbackAmount > 0 ? [{ name: "Estimator Quote", qty: 1, price: fallbackAmount, description: "Fallback line item" }] : []);

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

    const customerName = safeString(customer.name || customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Quote Customer", "Quote Customer");
    const nameParts = customerName.split(/\s+/).filter(Boolean);
    const e164 = toE164(customer.phone) || toE164(locationObj.phone) || "+16155495309";

    const estimateBody = omitNilDeep({
      altId: safeString(locationId, ""),
      altType: "location",
      contactId: safeString(contactId, ""),
      name: safeString(`${customerName} Estimate`, "Estimate").slice(0, 40),
      issueDate,
      expiryDate,
      currency,
      businessDetails: {
        name: safeString(quoteMeta.companyName || businessObj.name || locationObj.name || "S&S Design Build", "S&S Design Build"),
        email: safeString(quoteMeta.companyEmail || businessObj.email || locationObj.email || "sergio@snsdesignbuild.com", "sergio@snsdesignbuild.com"),
        phoneNo: toE164(quoteMeta.companyPhone || locationObj.phone) || "+16155495309",
        website: safeString(quoteMeta.companyWebsite || businessObj.website || locationObj.website || "https://www.snsdesignbuild.com/", "https://www.snsdesignbuild.com/"),
        address: {
          addressLine1: safeString(businessObj.address || locationObj.address || "", ""),
          city: safeString(businessObj.city || locationObj.city || "", ""),
          state: safeString(businessObj.state || locationObj.state || "", ""),
          country: safeString(businessObj.country || locationObj.country || "US", "US"),
          postalCode: safeString(businessObj.postalCode || locationObj.postalCode || "", ""),
        },
      },
      contactDetails: {
        name: customerName,
        firstName: safeString(nameParts[0] || customerName, customerName),
        lastName: safeString(nameParts.slice(1).join(" ") || "Customer", "Customer"),
        email: safeString(customer.email || quoteMeta.customerEmail || "sergio@snsdesignbuild.com", "sergio@snsdesignbuild.com"),
        phoneNo: e164,
        address: {
          addressLine1: safeString(customer.address || customer.street || "", ""),
          city: safeString(customer.city || quoteMeta.city || "", ""),
          state: safeString(customer.state || "", ""),
          country: safeString(customer.country || "US", "US"),
          postalCode: safeString(customer.postalCode || "", ""),
        },
      },
      frequencySettings: {
        enabled: false,
      },
      discount: {
        type: "percentage",
        value: 0,
      },
      items: itemsForEstimate,
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
        triedVariant: "contact-first-schema-fix",
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
      usedVariant: "contact-first-schema-fix",
      finalEstimateJson: estimateBody,
      finalItemsJson: estimateBody.items,
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json({ message: err instanceof Error ? err.message : "Unknown error", functionVersion: FUNCTION_VERSION }, 500);
  }
});
