import { ArchiveConsole } from "./_components/ArchiveConsole";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";

export const metadata = { title: "Smart Archive | لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function ArchivePage() {
  const snapshot = await getArchiveSnapshotDbBacked();
  return <ArchiveConsole activeTab="overview" snapshot={snapshot} />;
}
