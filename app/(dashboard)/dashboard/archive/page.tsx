import { ArchiveConsole } from "./_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Smart Archive | لوحة التحكم" };

export default function ArchivePage() {
  return <ArchiveConsole activeTab="overview" snapshot={getArchiveSnapshot()} />;
}
