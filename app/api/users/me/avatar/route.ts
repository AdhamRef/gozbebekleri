import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/options";
import { prisma } from "@/lib/prisma";
import { AVATAR_MAX_BYTES, validateAvatarFile } from "@/lib/media/avatar-core";
import { deleteNewAvatar, uploadAvatar } from "@/lib/media/avatar-storage";
import {
  MAX_MULTIPART_OVERHEAD_BYTES,
  MediaSecurityError,
  assertContentLength,
  validateFileCount,
} from "@/lib/media/security-core";

export const runtime = "nodejs";

function errorResponse(error: unknown) {
  if (error instanceof MediaSecurityError) {
    return NextResponse.json({ error: error.message, code: error.code }, { status: error.status });
  }
  console.error("Avatar update failed");
  return NextResponse.json({ error: "Unable to update avatar" }, { status: 500 });
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    assertContentLength(
      request.headers.get("content-length"),
      AVATAR_MAX_BYTES - MAX_MULTIPART_OVERHEAD_BYTES,
    );
    const formData = await request.formData();
    if (formData.has("userId")) {
      return NextResponse.json({ error: "userId is server-controlled" }, { status: 400 });
    }
    const files = formData.getAll("file").filter((value): value is File => value instanceof File);
    validateFileCount(files);
    const validated = await validateAvatarFile(files[0]);
    const stored = await uploadAvatar(session.user.id, validated);

    try {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { image: stored.url },
      });
    } catch (error) {
      await deleteNewAvatar(stored.assetId, session.user.id);
      throw error;
    }

    return NextResponse.json(stored, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: null },
  });
  return NextResponse.json({ removed: true });
}
