const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
}

function safeString(value: unknown, fallback = "") {
  if (value === null || value === undefined) return fallback;
  return String(value);
}

function sanitizeDriveName(value: unknown, fallback = "Job Photos") {
  const cleaned = safeString(value, fallback).replace(/[\\/:*?"<>|#{}%~&]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 140) || fallback;
}

function base64Url(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function pemToArrayBuffer(pem: string) {
  const base64 = pem.replace(/-----BEGIN PRIVATE KEY-----/g, "").replace(/-----END PRIVATE KEY-----/g, "").replace(/\s+/g, "");
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

async function getAccessToken(serviceAccount: Record<string, string>) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/drive.file",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };
  const encoder = new TextEncoder();
  const unsigned = `${base64Url(encoder.encode(JSON.stringify(header)).buffer)}.${base64Url(encoder.encode(JSON.stringify(claim)).buffer)}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToArrayBuffer(serviceAccount.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, encoder.encode(unsigned));
  const assertion = `${unsigned}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error_description || data?.error || "Google token request failed");
  return data.access_token as string;
}

async function findOrCreateFolder(accessToken: string, parentId: string, name: string) {
  const escaped = name.replace(/'/g, "\\'");
  const query = [`mimeType='application/vnd.google-apps.folder'`, `name='${escaped}'`, "trashed=false"];
  if (parentId) query.push(`'${parentId}' in parents`);
  const searchUrl = new URL("https://www.googleapis.com/drive/v3/files");
  searchUrl.searchParams.set("q", query.join(" and "));
  searchUrl.searchParams.set("fields", "files(id,name,webViewLink)");
  const searchResponse = await fetch(searchUrl, { headers: { Authorization: `Bearer ${accessToken}` } });
  const searchData = await searchResponse.json();
  if (!searchResponse.ok) throw new Error(searchData?.error?.message || "Google Drive folder search failed");
  if (searchData.files?.[0]?.id) return searchData.files[0];

  const metadata: Record<string, unknown> = { name, mimeType: "application/vnd.google-apps.folder" };
  if (parentId) metadata.parents = [parentId];
  const createResponse = await fetch("https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink", {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(metadata)
  });
  const createData = await createResponse.json();
  if (!createResponse.ok) throw new Error(createData?.error?.message || "Google Drive folder create failed");
  return createData;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  try {
    const rawServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
    const rootFolderId = Deno.env.get("GOOGLE_DRIVE_PHOTO_FOLDER_ID") || "";
    if (!rawServiceAccount) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT_JSON Supabase secret.");
    if (!rootFolderId) throw new Error("Missing GOOGLE_DRIVE_PHOTO_FOLDER_ID Supabase secret.");

    const body = await req.json();
    const base64 = safeString(body.base64);
    if (!base64) throw new Error("Missing photo base64 payload.");
    const mimeType = safeString(body.mimeType, "image/jpeg");
    const jobName = sanitizeDriveName(body.jobName, "Job Photos");
    const address = sanitizeDriveName(body.address, "No Address");
    const takenAt = safeString(body.takenAt, new Date().toISOString());
    const fileName = sanitizeDriveName(body.fileName, `${jobName} - ${takenAt.slice(0, 10)}.jpg`);
    const folderName = sanitizeDriveName(`${jobName} - ${address}`.replace(/ - No Address$/, ""), jobName);

    const serviceAccount = JSON.parse(rawServiceAccount);
    const accessToken = await getAccessToken(serviceAccount);
    const folder = await findOrCreateFolder(accessToken, rootFolderId, folderName);

    const metadata = {
      name: fileName,
      parents: [folder.id],
      description: [
        `Job: ${jobName}`,
        `Address: ${safeString(body.address) || "Not entered"}`,
        `Taken: ${takenAt}`,
        `GPS: ${body.latitude ?? ""}, ${body.longitude ?? ""}`,
        body.note ? `Note: ${body.note}` : ""
      ].filter(Boolean).join("\n")
    };

    const boundary = `sns_photo_${crypto.randomUUID()}`;
    const binary = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
    const encoder = new TextEncoder();
    const multipartStart = encoder.encode(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`);
    const multipartEnd = encoder.encode(`\r\n--${boundary}--`);
    const uploadBody = new Uint8Array(multipartStart.length + binary.length + multipartEnd.length);
    uploadBody.set(multipartStart, 0);
    uploadBody.set(binary, multipartStart.length);
    uploadBody.set(multipartEnd, multipartStart.length + binary.length);

    const uploadResponse = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,parents", {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": `multipart/related; boundary=${boundary}` },
      body: uploadBody
    });
    const uploadData = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploadData?.error?.message || "Google Drive photo upload failed");

    return jsonResponse({
      fileId: uploadData.id,
      fileName: uploadData.name,
      webViewLink: uploadData.webViewLink,
      folderId: folder.id,
      folderName: folder.name
    });
  } catch (error) {
    console.error("upload-job-photo failed", error);
    return jsonResponse({ error: error?.message || "Photo upload failed" }, 500);
  }
});
