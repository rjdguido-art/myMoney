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
  if (!sasUrl) {
    return NextResponse.json(
      { error: "Missing Azure Blob SAS configuration." },
      { status: 500 },
    );
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

  const parsedUrl = new URL(sasUrl);
  const baseUrl = `${parsedUrl.origin}${parsedUrl.pathname}`.replace(/\/$/, "");
  const query = parsedUrl.searchParams.toString();

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
