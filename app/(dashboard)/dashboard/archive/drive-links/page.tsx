import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Drive Links | لوحة التحكم" };

export default function ArchiveDriveLinksPage() {
  return <ArchiveConsole activeTab="drive-links" snapshot={getArchiveSnapshot()} />;
}
