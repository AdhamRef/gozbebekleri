import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Reports | لوحة التحكم" };

export default function ArchiveReportsPage() {
  return <ArchiveConsole activeTab="reports" snapshot={getArchiveSnapshot()} />;
}
