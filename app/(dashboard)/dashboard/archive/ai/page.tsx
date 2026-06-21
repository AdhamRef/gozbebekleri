import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive AI | لوحة التحكم" };

export default function ArchiveAiPage() {
  return <ArchiveConsole activeTab="ai" snapshot={getArchiveSnapshot()} />;
}
