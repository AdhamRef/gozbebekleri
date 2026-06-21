import { ArchiveConsole } from "../_components/ArchiveConsole";
import { getArchiveSnapshot } from "@/lib/archive/archive-service";

export const metadata = { title: "Archive Marketing Picks | لوحة التحكم" };

export default function ArchiveMarketingPicksPage() {
  return <ArchiveConsole activeTab="marketing-picks" snapshot={getArchiveSnapshot()} />;
}
