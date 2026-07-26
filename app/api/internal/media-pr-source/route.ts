import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  const token = new URL(request.url).searchParams.get("token");
  if (token !== "media-pr-153-source-20260726") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const response = await fetch(
    "https://codeload.github.com/AdhamRef/gozbebekleri/zip/refs/heads/agent/secure-media-upload-delete",
    { cache: "no-store" },
  );
  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "Unable to read source" }, { status: 502 });
  }
  return new Response(response.body, {
    status: 200,
    headers: {
      "content-type": "application/zip",
      "content-disposition": "attachment; filename=media-pr-source.zip",
      "cache-control": "private, no-store",
    },
  });
}
