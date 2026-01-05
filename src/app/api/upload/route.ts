import { NextResponse } from "next/server";

const MAX_FILE_SIZE_MB = 5;

function sanitizeFileExtension(name: string) {
  const parts = name.split(".");
  if (parts.length < 2) return "";
  const ext = parts.pop() ?? "";
  return ext.replace(/[^a-zA-Z0-9]/g, "").slice(0, 8).toLowerCase();
}

export async function POST(request: Request) {
  const sasUrl = process.env.AZURE_BLOB_SAS_URL ?? process.env.AzureBlob;
  const baseUrlEnv =
    process.env.AZURE_BLOB_CONTAINER_URL ??
    process.env.AZURE_BLOB_BASE_URL ??
    process.env.AZURE_BLOB_URL;
  if (!sasUrl) {
    return NextResponse.json(
      { error: "Missing Azure Blob SAS configuration." },
      { status: 500 },
    );
  }

  const normalizedSas = sasUrl.trim().replace(/^\?/, "");
  let baseUrl = "";
  let query = "";

  if (/^https?:\/\//i.test(normalizedSas)) {
    const parsedUrl = new URL(normalizedSas);
    baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/$/, "");
    query = parsedUrl.searchParams.toString();
  } else {
    if (!baseUrlEnv) {
      return NextResponse.json(
        {
          error:
            "Azure Blob base URL is missing. Set AZURE_BLOB_CONTAINER_URL to your container URL.",
        },
        { status: 500 },
      );
    }
    baseUrl = baseUrlEnv.trim().replace(/\/$/, "");
    query = normalizedSas;
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided." }, { status: 400 });
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_SIZE_MB}MB).` },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json(
      { error: "Azure Blob SAS query string is missing." },
      { status: 500 },
    );
  }

  const ext = sanitizeFileExtension(file.name);
  const blobName = `profile-${crypto.randomUUID()}${ext ? `.${ext}` : ""}`;
  const uploadUrl = `${baseUrl}/${encodeURIComponent(blobName)}?${query}`;

  const contentType = file.type || "application/octet-stream";
  const buffer = await file.arrayBuffer();

  const uploadRes = await fetch(uploadUrl, {
    method: "PUT",
    headers: {
      "x-ms-blob-type": "BlockBlob",
      "Content-Type": contentType,
    },
    body: buffer,
  });

  if (!uploadRes.ok) {
    const message = await uploadRes.text().catch(() => "");
    return NextResponse.json(
      { error: message || "Upload failed." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    url: `${baseUrl}/${encodeURIComponent(blobName)}?${query}`,
  });
}
