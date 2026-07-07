import { ArchiveConsole } from "./_components/ArchiveConsole";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";

export const metadata = { title: "Smart Archive | لوحة التحكم" };
export const dynamic = "force-dynamic";

type ArchiveSearchParams = {
  collection?: string | string[];
  year?: string | string[];
  project?: string | string[];
  work?: string | string[];
};

const WORK_KEYS = ["latest", "classify", "marketing", "rights"] as const;
type WorkKey = (typeof WORK_KEYS)[number];

export default async function ArchivePage({ searchParams }: { searchParams?: ArchiveSearchParams | Promise<ArchiveSearchParams> }) {
  const snapshot = await getArchiveSnapshotDbBacked();
  const params = await Promise.resolve(searchParams ?? {});
  const year = Number(firstParam(params.year));
  const workParam = firstParam(params.work);
  const work: WorkKey = WORK_KEYS.includes(workParam as WorkKey) ? (workParam as WorkKey) : "latest";

  return (
    <ArchiveConsole
      snapshot={snapshot}
      work={work}
      selection={{
        collectionId: firstParam(params.collection),
        year: Number.isFinite(year) ? year : undefined,
        projectId: firstParam(params.project),
      }}
    />
  );
}

function firstParam(value?: string | string[]) {
  if (Array.isArray(value)) return value[0];
  return value;
}
