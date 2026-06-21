import { z } from "zod";
import { createArchiveProject, listArchiveProjects } from "@/lib/archive/archive-service";
import { jsonNoStore, readJson, requireArchiveApiAccess } from "../_auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({ collectionId: z.string().trim().optional(), title: z.string().trim().min(1).max(220), year: z.number().int().min(2000).max(2100).optional(), country: z.string().trim().max(100).optional(), city: z.string().trim().max(100).optional(), theme: z.string().trim().max(100).optional(), projectType: z.string().trim().max(120).optional(), description: z.string().trim().max(800).optional(), notes: z.string().trim().max(800).optional() });

export async function GET() {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  return jsonNoStore({ ok: true, projects: listArchiveProjects() });
}

export async function POST(request: Request) {
  const { denied } = await requireArchiveApiAccess();
  if (denied) return denied;
  const parsed = schema.safeParse(await readJson(request));
  if (!parsed.success) return jsonNoStore({ ok: false, error: "Invalid payload", issues: parsed.error.flatten() }, { status: 400 });
  return jsonNoStore(createArchiveProject(parsed.data));
}
