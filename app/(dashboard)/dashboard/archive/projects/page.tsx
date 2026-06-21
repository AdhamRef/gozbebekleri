import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Projects | لوحة التحكم" };

export default function ArchiveProjectsPage() {
  return <ArchiveConsole activeTab="projects" snapshot={getArchiveSnapshot()} />;
}
