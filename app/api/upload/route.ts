import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/options";
import {
  writeAuditLog,
  auditActorFromSiteSession,
  auditStreamForRole,
} from "@/lib/audit-log";
import { requireAdminOrDashboardPermission } from "@/lib/dashboard/api-auth";
import { explicitMediaScope, permissionForMediaScope } from "@/lib/media/access";
import {
  MediaSecurityError,
  VIDEO_MAX_BYTES,
  assertContentLength,
  createSecureMediaDeleter,
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
  const scope = explicitMediaScope(request.url);
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

    assertContentLength(request.headers.get("content-length"), VIDEO_MAX_BYTES);
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

const secureDelete = createSecureMediaDeleter({
  lookupUrl: lookupMediaUrl,
  isReferenced: isMediaUrlReferenced,
  remove: deleteMedia,
});

export async function DELETE(request: Request) {
  try {
    const { session, denied, scope } = await authorize(request);
    if (denied || !session || !scope) return denied;

    const searchParams = new URL(request.url).searchParams;
    if (searchParams.get("legacyDetach") === "1") {
      return NextResponse.json({
        deleted: false,
        notFound: false,
        detachedOnly: true,
      });
    }

    const assetId = searchParams.get("assetId");
    if (!assetId) {
      throw new MediaSecurityError("Asset identifier is required", 400, "MISSING_ASSET_ID");
    }

    const result = await secureDelete(assetId, scope);
    if (result.inUse) {
      return NextResponse.json(
        { error: "Media asset is still in use", code: "ASSET_IN_USE" },
        { status: 409 },
      );
    }

    if (result.deleted) {
      const actor = auditActorFromSiteSession(session);
      await writeAuditLog({
        ...actor,
        action: "MEDIA_DELETE",
        messageAr: `${actor.actorName ?? "مستخدم"} حذف ملفًا من قسم ${scope}`,
        entityType: "Media",
        entityId: assetId,
        metadata: { assetId, scope, deleted: true },
        stream: auditStreamForRole(actor.actorRole),
      });
    }

    return NextResponse.json({ deleted: result.deleted, notFound: result.notFound });
  } catch (error) {
    return mediaError(error);
  }
}
