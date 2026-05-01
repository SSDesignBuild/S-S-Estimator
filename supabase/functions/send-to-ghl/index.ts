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

const FUNCTION_VERSION = "v24x-ghl-title-required-terms-preserved";
const GHL_SERVICES_TAX_CATEGORY_ID = "6852749d6e0bd39dd76d14b4";
const CONTACT_BASE_URL = "https://services.leadconnectorhq.com";
const ESTIMATE_BASE_URL = "https://backend.leadconnectorhq.com";

function safeString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function safeNumber(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
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

function formatYyyyMmDd(date = new Date()) {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}
function textToHtmlDescription(text: unknown) {
  const raw = safeString(text, "").trim();
  if (!raw) return "<p></p>";
  const blocks = raw.split(/\n\s*\n/).map((block) => block.trim()).filter(Boolean);
  return blocks.map((block) => {
    const line = block
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replace(/\n/g, "<br/>");
    return `<p>${line}</p>`;
  }).join("");
}

function getPath(obj: any, path: string) {
  return path.split(".").reduce((acc, key) => (acc && typeof acc === "object" ? acc[key] : undefined), obj);
}

function firstStringFromPaths(obj: any, paths: string[]) {
  for (const path of paths) {
    const value = getPath(obj, path);
    const text = safeString(value, "").trim();
    if (text) return text;
  }
  return "";
}

async function fetchGhlEstimateDefaults(locationId: string, authHeaders: Record<string, string>) {
  const defaults: Record<string, unknown> = {};
  const attempts: Array<{ label: string; url: string }> = [
    {
      label: "invoice-settings",
      url: `${ESTIMATE_BASE_URL}/invoices/settings?altId=${encodeURIComponent(locationId)}&altType=location`,
    },
    {
      label: "estimate-templates",
      url: `${ESTIMATE_BASE_URL}/invoices/estimate/template?altId=${encodeURIComponent(locationId)}&altType=location`,
    },
  ];

  for (const attempt of attempts) {
    try {
      const res = await fetch(attempt.url, { method: "GET", headers: authHeaders });
      const body = await readJsonSafe(res);
      defaults[`${attempt.label}Status`] = res.status;
      defaults[`${attempt.label}Body`] = body;

      if (!res.ok) continue;

      const data: any = body;
      const terms = firstStringFromPaths(data, [
        "estimate.termsNotes",
        "estimate.termsAndNotes",
        "estimate.terms",
        "estimate.notes",
        "estimateSettings.termsNotes",
        "estimateSettings.termsAndNotes",
        "estimateSettings.terms",
        "settings.estimate.termsNotes",
        "settings.estimate.termsAndNotes",
        "settings.estimate.terms",
        "termsNotes",
        "termsAndNotes",
        "terms",
        "notes",
      ]);
      if (terms && !defaults.termsNotes) defaults.termsNotes = terms;

      const title = firstStringFromPaths(data, [
        "estimate.title",
        "estimate.name",
        "estimateSettings.title",
        "estimateSettings.name",
        "settings.estimate.title",
        "settings.estimate.name",
        "title",
        "name",
      ]);
      if (title && !defaults.title) defaults.title = title;

      const templates = Array.isArray(data?.templates) ? data.templates
        : Array.isArray(data?.estimateTemplates) ? data.estimateTemplates
        : Array.isArray(data?.data) ? data.data
        : Array.isArray(data) ? data
        : [];
      const defaultTemplate = templates.find((template: any) => template?.isDefault || template?.default || template?.name === "Default") || templates[0];
      if (defaultTemplate) {
        const templateTerms = firstStringFromPaths(defaultTemplate, ["termsNotes", "termsAndNotes", "terms", "notes"]);
        const templateTitle = firstStringFromPaths(defaultTemplate, ["title", "name"]);
        if (templateTerms && !defaults.termsNotes) defaults.termsNotes = templateTerms;
        if (templateTitle && !defaults.title) defaults.title = templateTitle;
      }
    } catch (err) {
      defaults[`${attempt.label}Error`] = err instanceof Error ? err.message : String(err);
    }
  }

  defaults.title = safeString(defaults.title || Deno.env.get("GHL_DEFAULT_ESTIMATE_TITLE") || "S&S Design Build Estimate", "S&S Design Build Estimate").trim();
  defaults.termsNotes = safeString(defaults.termsNotes || Deno.env.get("GHL_DEFAULT_TERMS_NOTES") || "", "").trim();
  return defaults;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const token = Deno.env.get("GHL_PRIVATE_INTEGRATION_TOKEN");
  const fallbackLocationId = Deno.env.get("GHL_LOCATION_ID") || null;

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

    // 1) Prove the PIT can read the location and gather business details.
    const locationPreflightRes = await fetch(`${CONTACT_BASE_URL}/locations/${locationId}`, { method: "GET", headers: authHeaders });
    const locationPreflightJson = await readJsonSafe(locationPreflightRes);
    if (!locationPreflightRes.ok) {
      return json({
        message: "GoHighLevel location preflight failed before estimate create.",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        debug: locationPreflightJson,
      }, locationPreflightRes.status >= 400 && locationPreflightRes.status < 600 ? locationPreflightRes.status : 400);
    }

    const locationObj = (locationPreflightJson?.location as Record<string, unknown> | undefined) || {};
    const businessObj = (locationObj?.business as Record<string, unknown> | undefined) || {};

    // 2) Upsert contact in the sub-account.
    const contactBody = {
      locationId,
      firstName: safeString(customer.firstName || customer.name || "Quote", "Quote"),
      lastName: safeString(customer.lastName || "Customer", "Customer"),
      email: safeString(customer.email || "", "") || undefined,
      phone: toE164(customer.phone),
      source: "S&S Estimator",
    };

    const contactRes = await fetch(`${CONTACT_BASE_URL}/contacts/upsert`, {
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

    // 3) Ask GHL to generate the next estimate number/prefix, like the UI does.
    const generateUrl = `${ESTIMATE_BASE_URL}/invoices/estimate/generate?altId=${encodeURIComponent(locationId)}&altType=location`;
    const generateRes = await fetch(generateUrl, { method: "GET", headers: authHeaders });
    const generateJson = await readJsonSafe(generateRes);
    // Don't fail hard if this endpoint changes; just continue without the number.
    const estimateNumber = safeNumber(
      (generateJson as any)?.estimateNumber ?? (generateJson as any)?.number ?? (generateJson as any)?.nextNumber,
      0,
    );
    const estimateNumberPrefix = safeString(
      (generateJson as any)?.estimateNumberPrefix ?? (generateJson as any)?.prefix ?? "EST-",
      "EST-",
    );

    const ghlEstimateDefaults = await fetchGhlEstimateDefaults(locationId, authHeaders);

    // 4) Build custom items ONLY from real estimator service rows.
    const customItems = lineItems
      .map((item: any, index: number) => {
        const name = safeString(item?.service_name || item?.serviceName || item?.name || `Line Item ${index + 1}`, `Line Item ${index + 1}`).trim();
        const qty = safeNumber(item?.quantity ?? 0, 0);
        const unitPrice = safeNumber(item?.unit_price ?? item?.unitPrice ?? 0, 0);
        const lineTotal = safeNumber(item?.line_total ?? item?.lineTotal ?? qty * unitPrice, qty * unitPrice);
        // HighLevel expects amount to be the per-unit price, not the extended line total.
        const amount = unitPrice > 0 ? unitPrice : (qty > 0 ? lineTotal / qty : lineTotal);
        return {
          // Do not send an empty taxes array. In HighLevel, manually configured taxes are selected in the estimate UI,
          // while automatic taxes require a tax category/default tax category and valid customer address details.
          // Mark every estimator item as taxable and provide the Services category so existing GHL tax settings can apply.
          taxInclusive: false,
          taxable: true,
          isTaxable: true,
          taxCategoryId: safeString(item?.taxCategoryId || quoteMeta.taxCategoryId || GHL_SERVICES_TAX_CATEGORY_ID, GHL_SERVICES_TAX_CATEGORY_ID),
          taxCategoryName: safeString(item?.taxCategoryName || quoteMeta.taxCategoryName || "Services", "Services"),
          attachments: [],
          description: textToHtmlDescription(item?.description || item?.category || item?.source_type || ""),
          currency: safeString(locationObj.currency || quoteMeta.currency || "USD", "USD") || "USD",
          amount,
          qty: qty > 0 ? qty : 1,
          name,
          type: "one_time",
        };
      })
      .filter((item) => item.name && !looksLikeSummaryItem(item.name) && item.amount > 0);

    if (customItems.length === 0) {
      return json({
        message: "No non-summary quoted items were available to send to GoHighLevel.",
        functionVersion: FUNCTION_VERSION,
        finalItemsJson: customItems,
      }, 400);
    }

    const today = new Date();
    const expiry = new Date(today);
    expiry.setDate(expiry.getDate() + 30);

    const customerName = safeString(customer.name || customer.fullName || `${customer.firstName || ""} ${customer.lastName || ""}`.trim() || "Quote Customer", "Quote Customer");
    const e164Phone = toE164(customer.phone) || toE164(locationObj.phone) || "+16155495309";
    const currency = safeString(locationObj.currency || quoteMeta.currency || "USD", "USD") || "USD";

    const estimateTitle = safeString(
      quoteMeta.estimateName || quoteMeta.title || ghlEstimateDefaults.title || "S&S Design Build Estimate",
      "S&S Design Build Estimate",
    ).trim() || "S&S Design Build Estimate";
    const termsNotes = safeString(quoteMeta.termsNotes || ghlEstimateDefaults.termsNotes || "", "").trim();

    const estimateBody: Record<string, unknown> = {
      altId: safeString(locationId, ""),
      altType: "location",
      // HighLevel's backend requires title on API-created estimates.
      // The manual New Estimate screen fills this in client-side before saving; the API does not.
      title: estimateTitle,
      name: estimateTitle,
      attachments: [],
      autoInvoice: { enabled: false, directPayments: false },
      businessDetails: {
        logoUrl: safeString(locationObj.logoUrl || "", "") || undefined,
        name: safeString(quoteMeta.companyName || businessObj.name || locationObj.name || "S&S Design Build", "S&S Design Build"),
        address: {
          addressLine1: safeString(businessObj.address || locationObj.address || "", ""),
          city: safeString(businessObj.city || locationObj.city || "", ""),
          state: safeString(businessObj.state || locationObj.state || "", ""),
          countryCode: safeString(businessObj.country || locationObj.country || "US", "US"),
          postalCode: safeString(businessObj.postalCode || locationObj.postalCode || "", ""),
        },
        phoneNo: toE164(quoteMeta.companyPhone || locationObj.phone) || "+16155495309",
        website: safeString(quoteMeta.companyWebsite || businessObj.website || locationObj.website || "https://www.snsdesignbuild.com/", "https://www.snsdesignbuild.com/"),
        customValues: [],
      },
      contactDetails: {
        id: contactId,
        name: customerName,
        email: safeString(customer.email || quoteMeta.customerEmail || "", "") || undefined,
        additionalEmails: [],
        customFields: [],
      },
      currency,
      discount: {
        type: "percentage",
        value: 0,
      },
      ...(estimateNumber > 0 ? { estimateNumber } : {}),
      estimateNumberPrefix,
      expiryDate: formatYyyyMmDd(expiry),
      frequencySettings: {
        enabled: false,
      },
      issueDate: formatYyyyMmDd(today),
      items: customItems,
      liveMode: true,
      meta: {},
      opportunityDetails: null,
      ...(termsNotes ? {
        termsNotes,
        termsAndNotes: termsNotes,
      } : {}),
    };

    console.log(JSON.stringify({
      tag: "send-to-ghl:estimate-create-request",
      functionVersion: FUNCTION_VERSION,
      requestUrl: `${ESTIMATE_BASE_URL}/invoices/estimate/`,
      generateUrl,
      generateJson,
      finalEstimateJson: estimateBody,
      finalItemsJson: customItems,
      ghlEstimateDefaults,
      usedLocationId: locationId,
      usedContactId: contactId,
    }));

    const estimateRes = await fetch(`${ESTIMATE_BASE_URL}/invoices/estimate/`, {
      method: "POST",
      headers: { ...authHeaders, "Content-Type": "application/json" },
      body: JSON.stringify(estimateBody),
    });

    const estimateJson = await readJsonSafe(estimateRes);
    const estimateId = safeString((estimateJson as any)?._id || (estimateJson as any)?.id || (estimateJson as any)?.estimateId || "", "") || null;

    if (!estimateId) {
      return json({
        message: "Estimate creation did not return an estimate ID from GoHighLevel.",
        triedVariant: "ghl-fixed-item-math",
        functionVersion: FUNCTION_VERSION,
        usedLocationId: locationId,
        usedContactId: contactId,
        debug: estimateJson,
        finalEstimateJson: estimateBody,
        finalItemsJson: customItems,
      }, estimateRes.status >= 400 && estimateRes.status < 600 ? estimateRes.status : 502);
    }

    return json({
      message: "GoHighLevel contact and estimate created successfully.",
      contactId,
      estimateId,
      functionVersion: FUNCTION_VERSION,
      usedVariant: "ghl-fixed-item-math",
      finalEstimateJson: estimateBody,
      finalItemsJson: customItems,
      ghlEstimateDefaults,
      debug: estimateJson,
    });
  } catch (err) {
    console.error("[send-to-ghl] Unhandled error", err);
    return json({ message: err instanceof Error ? err.message : "Unknown error", functionVersion: FUNCTION_VERSION }, 500);
  }
});
