import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.VERCEL_ENV !== "preview") {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
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
      "content-disposition": "attachment; filename=media-worktree.zip",
      "cache-control": "private, no-store",
    },
  });
}
