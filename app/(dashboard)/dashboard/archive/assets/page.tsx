import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshotDbBacked } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Assets Review | لوحة التحكم" };
export const dynamic = "force-dynamic";

export default async function ArchiveAssetsPage() {
  const snapshot = await getArchiveSnapshotDbBacked();
  return <ArchiveConsole activeTab="assets" snapshot={snapshot} work="classify" />;
}
