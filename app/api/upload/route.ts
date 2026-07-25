import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import {
  writeAuditLog,
  auditActorFromSiteSession,
  auditStreamForRole,
} from "@/lib/audit-log";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { inferMediaScope, permissionForMediaScope } from "@/lib/media/access";
import {
  MediaSecurityError,
  assertSafeAssetId,
  validateFileCount,
  validateMediaFile,
} from "@/lib/media/security-core";
import { deleteMedia, lookupMediaUrl, uploadMedia } from "@/lib/media/storage-adapter";
import { isMediaUrlReferenced } from "@/lib/media/reference-check";

function mediaError(error: unknown): NextResponse {
  if (error instanceof MediaSecurityError) {
    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: error.status },
    );
  }
  console.error("Media operation failed");
  return NextResponse.json({ error: "Internal error" }, { status: 500 });
}

async function authorize(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return {
      session,
      denied: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      scope: null,
    };
  }
  const scope = inferMediaScope(request.url, request.headers.get("referer"));
  const denied = requireAdminOrDashboardPermission(
    session,
    permissionForMediaScope(scope),
  );
  return { session, denied, scope };
}

export async function POST(request: Request) {
  try {
    const { session, denied, scope } = await authorize(request);
    if (denied || !session || !scope) return denied;

    const formData = await request.formData();
    const files = formData.getAll("file").filter((value): value is File => value instanceof File);
    validateFileCount(files);

    const validated = await validateMediaFile(files[0], scope);
    const result = await uploadMedia(validated, scope);

    const actor = auditActorFromSiteSession(session);
    await writeAuditLog({
      ...actor,
      action: "MEDIA_UPLOAD",
      messageAr: `${actor.actorName ?? "مستخدم"} رفع ملفًا آمنًا إلى قسم ${scope}`,
      entityType: "Media",
      entityId: result.assetId,
      metadata: {
        assetId: result.assetId,
        type: result.type,
        mimeType: result.mimeType,
        size: result.size,
        scope,
      },
      stream: auditStreamForRole(actor.actorRole),
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return mediaError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { session, denied, scope } = await authorize(request);
    if (denied || !session || !scope) return denied;

    const assetId = new URL(request.url).searchParams.get("assetId");
    if (!assetId) {
      throw new MediaSecurityError("Asset identifier is required", 400, "MISSING_ASSET_ID");
    }

    const safeAssetId = assertSafeAssetId(assetId, scope);
    const existingUrl = await lookupMediaUrl(safeAssetId, scope);
    if (!existingUrl) {
      return NextResponse.json({ deleted: false, notFound: true });
    }

    if (await isMediaUrlReferenced(existingUrl)) {
      return NextResponse.json(
        { error: "Media asset is still in use", code: "ASSET_IN_USE" },
        { status: 409 },
      );
    }

    const result = await deleteMedia(safeAssetId, scope);
    const actor = auditActorFromSiteSession(session);
    await writeAuditLog({
      ...actor,
      action: "MEDIA_DELETE",
      messageAr: `${actor.actorName ?? "مستخدم"} حذف ملفًا من قسم ${scope}`,
      entityType: "Media",
      entityId: safeAssetId,
      metadata: { assetId: safeAssetId, scope, deleted: result.deleted },
      stream: auditStreamForRole(actor.actorRole),
    });

    return NextResponse.json(result);
  } catch (error) {
    return mediaError(error);
  }
}
