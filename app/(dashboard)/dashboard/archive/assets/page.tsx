import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Assets Review | لوحة التحكم" };

export default function ArchiveAssetsPage() {
  return <ArchiveConsole activeTab="assets" snapshot={getArchiveSnapshot()} />;
}
