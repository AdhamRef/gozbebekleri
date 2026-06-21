import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Collections | لوحة التحكم" };

export default function ArchiveCollectionsPage() {
  return <ArchiveConsole activeTab="collections" snapshot={getArchiveSnapshot()} />;
}
